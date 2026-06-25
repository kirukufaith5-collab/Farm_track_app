import React, { useState, useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { GoogleMap, Polygon, MarkerF, InfoWindow } from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '100%' };

const defaultCenter = { lat: -1.1462, lng: 36.9610 };

// ── Toast component ──────────────────────────────────────────────────────
function Toast({ message, type = 'warning', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const colors = {
    warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icon: '⚠️' },
    success: { bg: '#ECFDF5', border: '#10B981', text: '#065F46', icon: '✅' },
    error:   { bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C', icon: '🚫' },
  };
  const c = colors[type] || colors.warning;

  return (
    <div style={{
      position: 'absolute',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      backgroundColor: c.bg,
      border: `1.5px solid ${c.border}`,
      color: c.text,
      borderRadius: '10px',
      padding: '12px 20px',
      fontSize: '13.5px',
      fontWeight: '600',
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      maxWidth: 'calc(100vw - 48px)',
      whiteSpace: 'nowrap',
      animation: 'toastIn 0.2s ease',
      pointerEvents: 'none',
    }}>
      <span>{c.icon}</span> {message}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(-6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}

// ── MapView — exported with forwardRef so App can call panToField ────────
const MapView = forwardRef(function MapView(
  { currentLocation, fields, onMapLoad, onPolygonComplete, onSelectField, hasUnsavedPlot },
  ref
) {
  const [activePolygonPoints, setActivePolygonPoints] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [activeInfoField, setActiveInfoField] = useState(null);
  const [toast, setToast] = useState(null); // { message, type }
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Expose panToField(field) to parent via ref
  useImperativeHandle(ref, () => ({
    panToField(field) {
      if (!mapRef.current || !field?.coordinates?.length) return;
      const center = getPolygonCenter(field.coordinates);
      mapRef.current.panTo(center);
      mapRef.current.setZoom(17);
    },
  }));

  const showToast = (message, type = 'warning') => setToast({ message, type });

  const getPolygonCenter = (coordinates) => {
    const total = coordinates.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
      { lat: 0, lng: 0 }
    );
    return { lat: total.lat / coordinates.length, lng: total.lng / coordinates.length };
  };

  // PAC container z-index fix
  useEffect(() => {
    const styleId = 'pac-container-zindex-fix';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `.pac-container { z-index: 2147483647 !important; pointer-events: auto !important; }`;
      document.head.appendChild(style);
    }
  }, []);

  // Auto-close info popup if its field is deleted
  useEffect(() => {
    if (activeInfoField && !fields.some((f) => f.id === activeInfoField.id)) {
      setActiveInfoField(null);
    }
  }, [fields, activeInfoField]);

  const handleMapLoadInternal = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    onMapLoad(mapInstance);

    if (searchInputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        { fields: ['geometry', 'name', 'formatted_address'] }
      );
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (!place?.geometry?.location) {
          showToast('Select a suggestion from the dropdown — do not press Enter directly.', 'error');
          return;
        }
        if (mapRef.current) {
          if (place.geometry.viewport) {
            mapRef.current.fitBounds(place.geometry.viewport);
          } else {
            mapRef.current.panTo(place.geometry.location);
            mapRef.current.setZoom(16);
          }
        }
      });
    }
  }, [onMapLoad]);

  // Block map clicks when there is an unsaved plot pending
  const handleMapClick = useCallback((e) => {
    if (hasUnsavedPlot) {
      showToast('Please save or discard the current plot before drawing a new one.', 'warning');
      return;
    }
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setActivePolygonPoints((prev) => [...prev, { lat, lng }]);
    setRedoStack([]);
  }, [hasUnsavedPlot]);

  const handleUndo = () => {
    setActivePolygonPoints((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setActivePolygonPoints((pts) => [...pts, last]);
      return prev.slice(0, -1);
    });
  };

  const finalizeFieldDrawing = () => {
    if (activePolygonPoints.length < 3) {
      showToast('A land parcel needs at least 3 coordinates.', 'error');
      return;
    }
    const googlePolygon = new window.google.maps.Polygon({ paths: activePolygonPoints });
    const sqMeters = window.google.maps.geometry.spherical.computeArea(googlePolygon.getPath());
    const hectares = (sqMeters / 10000).toFixed(2);
    onPolygonComplete({ coordinates: activePolygonPoints, area: `${hectares} ha` });
    setActivePolygonPoints([]);
    setRedoStack([]);
  };

  const toolbarBtn = (bg, color = 'white', disabled = false) => ({
    backgroundColor: disabled ? '#CBD5E1' : bg,
    color: disabled ? '#94A3B8' : color,
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    opacity: disabled ? 0.7 : 1,
  });

  return (
    <div style={{ flex: 1, position: 'relative', height: '100%' }}>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* Floating Search Box */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, width: '360px', isolation: 'isolate' }}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="🔍 Search land parcels, coordinates, or regions..."
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            fontSize: '15px',
            fontFamily: 'system-ui, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
            color: '#1e293b',
          }}
        />
      </div>

      {/* Unsaved plot banner */}
      {hasUnsavedPlot && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10,
          backgroundColor: '#FEF3C7',
          border: '1.5px solid #F59E0B',
          color: '#92400E',
          borderRadius: '8px',
          padding: '8px 14px',
          fontSize: '12px',
          fontWeight: '600',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          ⚠️ Unsaved plot — save it before drawing a new one
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentLocation || defaultCenter}
        zoom={14}
        onLoad={handleMapLoadInternal}
        onClick={handleMapClick}
        options={{
          mapTypeId: 'satellite',
          fullscreenControl: false,
          mapTypeControlOptions: { position: 3 },
        }}
      >
        {/* Saved field polygons */}
        {fields.map((field) => (
          <Polygon
            key={field.id}
            paths={field.coordinates}
            onClick={() => setActiveInfoField(field)}
            options={{
              fillColor: '#10B981',
              fillOpacity: 0.35,
              strokeColor: '#059669',
              strokeWeight: 2,
            }}
          />
        ))}

        {/* GPS location blue dot */}
        {currentLocation && (
          <MarkerF
            position={currentLocation}
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
              scale: 10,
              fillColor: '#1D6AFF',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
            title="Your location"
            zIndex={999}
          />
        )}

        {/* Info popup for saved field */}
        {activeInfoField && (
          <InfoWindow
            position={getPolygonCenter(activeInfoField.coordinates)}
            onCloseClick={() => setActiveInfoField(null)}
          >
            <div style={{ minWidth: '200px', fontFamily: 'system-ui, sans-serif', padding: '2px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                {activeInfoField.crop}
              </div>
              <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', marginBottom: '8px' }}>
                {activeInfoField.area}
              </div>
              {activeInfoField.ownerName && (
                <div style={{ fontSize: '12px', color: '#334155', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>👤</span>
                  <span style={{ fontWeight: '600' }}>{activeInfoField.ownerName}</span>
                </div>
              )}
              {activeInfoField.farmerCode && (
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace' }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: '#92400e', backgroundColor: '#FEF3C7', padding: '1px 5px', borderRadius: '3px', fontFamily: 'sans-serif', letterSpacing: '0.05em', textTransform: 'uppercase' }}>ID</span>
                  {activeInfoField.farmerCode}
                </div>
              )}
              {activeInfoField.notes && (
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: '1.4' }}>
                  {activeInfoField.notes}
                </div>
              )}
              <button
                onClick={() => { onSelectField(activeInfoField); setActiveInfoField(null); }}
                style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff', backgroundColor: '#0f172a', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', width: '100%' }}
              >
                ✏️ Edit Plot
              </button>
            </div>
          </InfoWindow>
        )}

        {/* Live drawing preview */}
        {activePolygonPoints.length > 0 && (
          <Polygon
            paths={activePolygonPoints}
            options={{ fillColor: '#2563EB', fillOpacity: 0.2, strokeColor: '#2563EB', strokeWeight: 2 }}
          />
        )}

        {/* Dropped markers */}
        {activePolygonPoints.map((point, index) => (
          <MarkerF key={index} position={point} label={`${index + 1}`} />
        ))}
      </GoogleMap>

      {/* Draw toolbar */}
      {activePolygonPoints.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '10px',
          zIndex: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          maxWidth: 'calc(100vw - 48px)',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'sans-serif', color: '#334155', flexShrink: 0 }}>
            📍 {activePolygonPoints.length} pts
          </span>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
          <button onClick={handleUndo} disabled={activePolygonPoints.length === 0} title="Undo last point" style={toolbarBtn('#F1F5F9', '#334155', activePolygonPoints.length === 0)}>↩ Undo</button>
          <button onClick={handleRedo} disabled={redoStack.length === 0} title="Redo" style={toolbarBtn('#F1F5F9', '#334155', redoStack.length === 0)}>↪ Redo</button>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
          <button onClick={finalizeFieldDrawing} style={toolbarBtn('#10B981')}>✓ Save Boundary</button>
          <button onClick={() => { setActivePolygonPoints([]); setRedoStack([]); }} style={toolbarBtn('#EF4444')}>✕ Reset</button>
        </div>
      )}
    </div>
  );
});

export default MapView;
