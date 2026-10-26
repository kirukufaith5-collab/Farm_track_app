import {
  useState, useCallback, useRef, useEffect, useReducer, useImperativeHandle, forwardRef,
} from 'react';
import { GoogleMap, Polygon, MarkerF, InfoWindow, Circle } from '@react-google-maps/api';
import { getPolygonCenter, parseCoords, formatHa } from '../utils.js';

// ── Constants (outside the component so they are not re-created each render) ──
const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: -1.1462, lng: 36.961 };

const MAP_OPTIONS = {
  mapTypeId: 'satellite',
  fullscreenControl: false,
  clickableIcons: false,
  mapTypeControlOptions: { position: 3 },
};

const SAVED_STYLE = { fillColor: '#10B981', fillOpacity: 0.35, strokeColor: '#059669', strokeWeight: 2 };
const SELECTED_STYLE = { ...SAVED_STYLE, fillOpacity: 0.55, strokeColor: '#065F46', strokeWeight: 3 };
// While drawing, saved parcels must not swallow clicks meant for new points
const LOCKED_STYLE = { ...SAVED_STYLE, clickable: false };
const DRAFT_STYLE = { fillColor: '#F59E0B', fillOpacity: 0.35, strokeColor: '#B45309', strokeWeight: 2, clickable: false };
const DRAWING_STYLE = { fillColor: '#2563EB', fillOpacity: 0.2, strokeColor: '#2563EB', strokeWeight: 2, clickable: false };
const ACCURACY_STYLE = {
  strokeColor: '#1D6AFF', strokeOpacity: 0.9, strokeWeight: 2,
  fillColor: '#4A90FF', fillOpacity: 0.25, clickable: false,
};

// ── Drawing state: one reducer so undo/redo never nest setState calls ──────
function drawReducer(state, action) {
  switch (action.type) {
    case 'add':
      return { points: [...state.points, action.point], redo: [] };
    case 'undo': {
      if (!state.points.length) return state;
      return { points: state.points.slice(0, -1), redo: [...state.redo, state.points.at(-1)] };
    }
    case 'redo': {
      if (!state.redo.length) return state;
      return { points: [...state.points, state.redo.at(-1)], redo: state.redo.slice(0, -1) };
    }
    case 'reset':
      return { points: [], redo: [] };
    default:
      return state;
  }
}

const toolbarBtn = (bg, color = 'white', disabled = false) => ({
  backgroundColor: disabled ? '#CBD5E1' : bg,
  color: disabled ? '#94A3B8' : color,
  border: 'none',
  padding: '8px 16px',
  borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 600,
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
});

const divider = { width: '1px', height: '24px', backgroundColor: '#e2e8f0', flexShrink: 0 };
 const noop =() =>{}
// ── MapView — forwardRef so App can call panToField ────────────────────────
const MapView = forwardRef(function MapView(
  {
    currentLocation, fields, draftField, selectedFieldId,
    onMapLoad =noop, onPolygonComplete, onSelectField, hasUnsavedPlot, onNotify,
  },
  ref
) {
  const [draw, dispatch] = useReducer(drawReducer, { points: [], redo: [] });
  const [activeInfoId, setActiveInfoId] = useState(null);
  const [searchPin, setSearchPin] = useState(null); // { position, title, address }
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);

  const drawing = draw.points.length > 0;
  // Derived, so a deleted parcel closes its popup without an effect
  const activeInfoField = fields.find((f) => f.id === activeInfoId) ?? null;
  const here = currentLocation && { lat: currentLocation.lat, lng: currentLocation.lng };

  // Parent calls this when a parcel is clicked in the sidebar list
  useImperativeHandle(ref, () => ({
    panToField(field) {
      const map = mapRef.current;
      if (!map || !field?.coordinates?.length) return;
      const bounds = new window.google.maps.LatLngBounds();
      field.coordinates.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 80);
    },
  }), []);

  // ── Search: drop a pin like Google Maps does ──────────────────────────────
  const goToPlace = useCallback((position, title, address, viewport) => {
    setSearchPin({ position, title, address });
    const map = mapRef.current;
    if (!map) return;
    if (viewport) {
      map.fitBounds(viewport);
    } else {
      map.panTo(position);
      map.setZoom(17);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchPin(null);
    if (searchInputRef.current) searchInputRef.current.value = '';
  }, []);

  // Fallback when the user presses Enter without picking a suggestion:
  // try coordinates first, then the Geocoder.
  const searchByText = useCallback((text) => {
    const query = (text || '').trim();
    if (!query) return;

    const coords = parseCoords(query);
    if (coords) {
      goToPlace(coords, 'Coordinates', `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
      return;
    }

    new window.google.maps.Geocoder().geocode({ address: query }, (results, status) => {
      const result = results?.[0];
      if (status === 'OK' && result) {
        goToPlace(result.geometry.location.toJSON(), query, result.formatted_address, result.geometry.viewport);
      } else {
        onNotify('No place found. Try a nearby town, or coordinates like -1.1462, 36.9610.', 'error');
      }
    });
  }, [goToPlace, onNotify]);

  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return undefined;

    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      fields: ['geometry', 'name', 'formatted_address'],
    });
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place?.geometry?.location) {
        goToPlace(
          place.geometry.location.toJSON(),
          place.name,
          place.formatted_address,
          place.geometry.viewport
        );
      } else {
        searchByText(place?.name || input.value);
      }
    });

    return () => {
      listener.remove();
      window.google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [goToPlace, searchByText]);

  // PAC dropdown must sit above the sidebar and map controls
  useEffect(() => {
    const id = 'pac-container-zindex-fix';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = '.pac-container{z-index:2147483647!important;pointer-events:auto!important}';
    document.head.appendChild(style);
  }, []);

  // ── Map + drawing handlers ────────────────────────────────────────────────
  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
    onMapLoad(map);
  }, [onMapLoad]);

  const handleMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleMapClick = useCallback((e) => {
    if (hasUnsavedPlot) {
      onNotify('Save or cancel the current plot before drawing a new one.', 'warning');
      return;
    }
    dispatch({ type: 'add', point: e.latLng.toJSON() });
  }, [hasUnsavedPlot, onNotify]);

  const finalizeDrawing = () => {
    if (draw.points.length < 3) {
      onNotify('A land parcel needs at least 3 points.', 'error');
      return;
    }
    const sqMeters = window.google.maps.geometry.spherical.computeArea(draw.points);
    const areaHa = Math.round(sqMeters / 100) / 100;
    onPolygonComplete({ coordinates: draw.points, areaHa, area: formatHa(areaHa) });
    dispatch({ type: 'reset' });
  };

  return (
    <div style={{ flex: 1, position: 'relative', height: '100%' }}>
      {/* Search box */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, width: 'min(360px, calc(100% - 40px))' }}>
        <input
          ref={searchInputRef}
          type="text"
          aria-label="Search places or coordinates"
          placeholder="🔍 Search a place or coordinates"
          style={{
            width: '100%', padding: '14px 44px 14px 20px', borderRadius: '12px',
            border: '1px solid #e2e8f0', backgroundColor: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '15px',
            fontFamily: 'system-ui, sans-serif', outline: 'none', boxSizing: 'border-box', color: '#1e293b',
          }}
        />
        {searchPin && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search and remove pin"
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#64748b', padding: '6px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {hasUnsavedPlot && (
        <div style={{
          position: 'absolute', top: '76px', left: '20px', zIndex: 10, backgroundColor: '#FEF3C7',
          border: '1.5px solid #F59E0B', color: '#92400E', borderRadius: '8px', padding: '8px 14px',
          fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          ⚠️ Unsaved plot — save it or cancel before drawing another
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={14}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        onClick={handleMapClick}
        options={MAP_OPTIONS}
      >
        {/* Saved parcels */}
        {fields.map((field) => (
          <Polygon
            key={field.id}
            paths={field.coordinates}
            onClick={() => setActiveInfoId(field.id)}
            options={drawing ? LOCKED_STYLE : field.id === selectedFieldId ? SELECTED_STYLE : SAVED_STYLE}
          />
        ))}

        {/* Drawn but not yet saved */}
        {draftField && <Polygon paths={draftField.coordinates} options={DRAFT_STYLE} />}

        {/* GPS position + accuracy */}
        {here && (
          <>
            <Circle center={here} radius={currentLocation.accuracy} options={ACCURACY_STYLE} />
            <MarkerF
              position={here}
              title="Your location"
              zIndex={999}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10, fillColor: '#1D6AFF', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3,
              }}
            />
          </>
        )}

        {/* Search result pin */}
        {searchPin && (
          <MarkerF position={searchPin.position} title={searchPin.title} zIndex={1000}>
            <InfoWindow onCloseClick={clearSearch}>
              <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '220px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{searchPin.title}</div>
                {searchPin.address && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                    {searchPin.address}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontFamily: 'monospace' }}>
                  {searchPin.position.lat.toFixed(5)}, {searchPin.position.lng.toFixed(5)}
                </div>
              </div>
            </InfoWindow>
          </MarkerF>
        )}

        {/* Saved parcel popup */}
        {activeInfoField && (
          <InfoWindow
            position={getPolygonCenter(activeInfoField.coordinates)}
            onCloseClick={() => setActiveInfoId(null)}
          >
            <div style={{ minWidth: '200px', fontFamily: 'system-ui, sans-serif', padding: '2px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                {activeInfoField.crop}
              </div>
              <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>
                {activeInfoField.area}
              </div>
              {activeInfoField.ownerName && (
                <div style={{ fontSize: '12px', color: '#334155', marginBottom: '4px' }}>
                  👤 <strong>{activeInfoField.ownerName}</strong>
                </div>
              )}
              {activeInfoField.farmerCode && (
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontFamily: 'monospace' }}>
                  ID {activeInfoField.farmerCode}
                </div>
              )}
              {activeInfoField.notes && (
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: 1.4 }}>
                  {activeInfoField.notes}
                </div>
              )}
              <button
                type="button"
                onClick={() => { onSelectField(activeInfoField); setActiveInfoId(null); }}
                style={{
                  fontSize: '12px', fontWeight: 600, color: '#ffffff', backgroundColor: '#0f172a',
                  border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', width: '100%',
                }}
              >
                ✏️ Edit plot
              </button>
            </div>
          </InfoWindow>
        )}

        {/* Live drawing preview */}
        {drawing && <Polygon paths={draw.points} options={DRAWING_STYLE} />}
        {draw.points.map((point, index) => (
          <MarkerF key={`${point.lat}-${point.lng}`} position={point} label={`${index + 1}`} />
        ))}
      </GoogleMap>

      {/* Draw toolbar */}
      {drawing && (
        <div style={{
          position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#ffffff', padding: '12px 20px', borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', gap: '10px', zIndex: 10,
          alignItems: 'center', flexWrap: 'wrap', maxWidth: 'calc(100% - 32px)', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'sans-serif', color: '#334155' }}>
            📍 {draw.points.length} pts
          </span>
          <div style={divider} />
          <button type="button" onClick={() => dispatch({ type: 'undo' })} style={toolbarBtn('#F1F5F9', '#334155')}>↩ Undo</button>
          <button type="button" onClick={() => dispatch({ type: 'redo' })} disabled={!draw.redo.length}
            style={toolbarBtn('#F1F5F9', '#334155', !draw.redo.length)}>↪ Redo</button>
          <div style={divider} />
          <button type="button" onClick={finalizeDrawing} style={toolbarBtn('#10B981')}>✓ Save boundary</button>
          <button type="button" onClick={() => dispatch({ type: 'reset' })} style={toolbarBtn('#EF4444')}>✕ Reset</button>
        </div>
      )}
    </div>
  );
});

export default MapView;