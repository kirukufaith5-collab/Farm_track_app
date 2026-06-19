import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Polygon, MarkerF, InfoWindow } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

// Default fallback coordinates centered around Kiambu region
const defaultCenter = {
  lat: -1.1462,
  lng: 36.9610
};

export default function MapView({ currentLocation, fields, onMapLoad, onPolygonComplete, onSelectField }) {
  const [activePolygonPoints, setActivePolygonPoints] = useState([]);
  // Tracks which saved field currently has its info popup open on the map.
  // Holds the field object itself (or null when no popup is open).
  const [activeInfoField, setActiveInfoField] = useState(null);
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Computes the rough center point of a polygon (average of its corner points)
  // so the InfoWindow has a sensible anchor position on the map.
  const getPolygonCenter = (coordinates) => {
    const total = coordinates.reduce(
      (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
      { lat: 0, lng: 0 }
    );
    return {
      lat: total.lat / coordinates.length,
      lng: total.lng / coordinates.length,
    };
  };

  // Google's Places Autocomplete dropdown (.pac-container) is injected directly
  // into document.body, outside of React's control. Google Maps' own internal
  // canvas/tile layers can use very high z-index values internally, so a modest
  // value like 9999 can still lose the stacking comparison — the dropdown becomes
  // visible but clicks land on the map underneath it instead. Using a very high
  // value (2147483647 = max safe 32-bit integer) guarantees it always wins.
  useEffect(() => {
    const styleId = 'pac-container-zindex-fix';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .pac-container {
          z-index: 2147483647 !important;
          pointer-events: auto !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // If the field currently shown in the info popup gets deleted (e.g. via the
  // sidebar trash button) while the popup is still open, close the popup
  // automatically instead of leaving it pointing at data that no longer exists.
  useEffect(() => {
    if (activeInfoField && !fields.some((f) => f.id === activeInfoField.id)) {
      setActiveInfoField(null);
    }
  }, [fields, activeInfoField]);

  // ✅ FIX 1: handleMapLoad now initializes Autocomplete AFTER the map (and therefore
  // window.google) is confirmed ready. The previous useEffect(() => {}, []) ran on
  // component mount — but at that moment window.google may not yet be available,
  // causing Places to fail silently and the map to show the "can't load" error.
  const handleMapLoadInternal = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    onMapLoad(mapInstance);

    // Initialize Autocomplete here — window.google is guaranteed to exist at this point
    if (searchInputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          // ✅ FIX 2: Removed '(regions)' from types array.
          // Mixing 'geocode' and '(regions)' in the same types array is not allowed
          // by the Places API and silently breaks Autocomplete, causing the map error.
          // Use one or the other, or omit 'types' entirely for broadest results.
          fields: ['geometry', 'name', 'formatted_address'],
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();

        // Guard: user pressed Enter without selecting a dropdown suggestion
        if (!place || !place.geometry || !place.geometry.location) {
          alert(
            "No location details found. Please select a suggestion from the dropdown list rather than pressing Enter directly."
          );
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

  // Click handler for dropping plot boundary points on the map
  const handleMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setActivePolygonPoints((prev) => [...prev, { lat, lng }]);
  }, []);

  const finalizeFieldDrawing = () => {
    if (activePolygonPoints.length < 3) {
      alert("A land parcel must contain at least 3 dropped coordinates!");
      return;
    }

    const googlePolygon = new window.google.maps.Polygon({ paths: activePolygonPoints });
    const sqMeters = window.google.maps.geometry.spherical.computeArea(
      googlePolygon.getPath()
    );
    const hectares = (sqMeters / 10000).toFixed(2);

    onPolygonComplete({
      coordinates: activePolygonPoints,
      area: `${hectares} ha`,
    });

    setActivePolygonPoints([]);
  };

  return (
    <div style={{ flex: 1, position: 'relative', height: '100%' }}>

      {/* Floating Search Box */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 10,
        width: '360px',
        isolation: 'isolate',
      }}>
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
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            fontSize: '15px',
            fontFamily: 'system-ui, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
            color: '#1e293b',
          }}
        />
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentLocation || defaultCenter}
        zoom={14}
        onLoad={handleMapLoadInternal}  // ✅ Autocomplete now initializes here
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
            // Clicking a plot now opens a quick-view popup instead of jumping
            // straight into edit mode. Managers can inspect crop/area/notes
            // at a glance, then choose to edit from inside the popup if needed.
            onClick={() => setActiveInfoField(field)}
            options={{
              fillColor: '#10B981',
              fillOpacity: 0.35,
              strokeColor: '#059669',
              strokeWeight: 2,
            }}
          />
        ))}

        {/* Quick-view info popup for the currently selected saved field */}
        {activeInfoField && (
          <InfoWindow
            position={getPolygonCenter(activeInfoField.coordinates)}
            onCloseClick={() => setActiveInfoField(null)}
          >
            <div style={{ minWidth: '180px', fontFamily: 'system-ui, sans-serif', padding: '2px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                {activeInfoField.crop}
              </div>
              <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', marginBottom: '8px' }}>
                {activeInfoField.area}
              </div>
              {activeInfoField.notes && (
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', lineHeight: '1.4' }}>
                  {activeInfoField.notes}
                </div>
              )}
              <button
                onClick={() => {
                  onSelectField(activeInfoField);
                  setActiveInfoField(null);
                }}
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#ffffff',
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                ✏️ Edit Plot
              </button>
            </div>
          </InfoWindow>
        )}

        {/* Live drawing preview polygon */}
        {activePolygonPoints.length > 0 && (
          <Polygon
            paths={activePolygonPoints}
            options={{
              fillColor: '#2563EB',
              fillOpacity: 0.2,
              strokeColor: '#2563EB',
              strokeWeight: 2,
            }}
          />
        )}

        {/* Dropped coordinate markers */}
        {activePolygonPoints.map((point, index) => (
          <MarkerF key={index} position={point} label={`${index + 1}`} />
        ))}
      </GoogleMap>

      {/* Draw confirmation toolbar */}
      {activePolygonPoints.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ffffff',
          padding: '14px 28px',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '16px',
          zIndex: 10,
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600', fontFamily: 'sans-serif', color: '#334155' }}>
            📍 Plotting Area ({activePolygonPoints.length} coordinates dropped)
          </span>
          <button
            onClick={finalizeFieldDrawing}
            style={{ backgroundColor: '#10B981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
          >
            Save Boundary
          </button>
          <button
            onClick={() => setActivePolygonPoints([])}
            style={{ backgroundColor: '#EF4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
