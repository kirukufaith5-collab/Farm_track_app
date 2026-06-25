import { useState, useCallback, useRef } from 'react';

/**
 * useGPS — manages the user's live location dot on the map.
 *
 * Returns:
 *   currentLocation  – { lat, lng } | null  (kept in state so MapView can re-render the blue dot)
 *   trackLocation    – call this to request permission + pan the map to the user's position
 */
export default function useGPS(map) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const markerRef = useRef(null);

  const trackLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCurrentLocation(pos);

        if (map) {
          map.panTo(pos);
          map.setZoom(17);
        }

        if (markerRef.current) {
          markerRef.current.setMap(null);
          markerRef.current = null;
        }

        if (map && window.google?.maps) {
          markerRef.current = new window.google.maps.Circle({
            strokeColor: '#1D6AFF',
            strokeOpacity: 0.9,
            strokeWeight: 2,
            fillColor: '#4A90FF',
            fillOpacity: 0.35,
            map,
            center: pos,
            radius: position.coords.accuracy || 20,
          });
        }
      },
      (error) => {
        const messages = {
          1: 'Location access was denied. Please allow location permission in your browser settings.',
          2: 'Your position could not be determined. Check your device\'s GPS or network.',
          3: 'Location request timed out. Please try again.',
        };
        alert(messages[error.code] || 'An unknown location error occurred.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [map]);

  return { currentLocation, trackLocation };
}
