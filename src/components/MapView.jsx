import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Polygon, MarkerF } from '@react-google-maps/api';

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
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  
  const handleMapLoadInternal = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    onMapLoad(mapInstance);

    // Initialize Autocomplete here — window.google is guaranteed to exist at this point
    if (searchInputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          
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
            onClick={() => onSelectField(field)}
            options={{
              fillColor: '#10B981',
              fillOpacity: 0.35,
              strokeColor: '#059669',
              strokeWeight: 2,
            }}
          />
        ))}

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
