import { useState, useCallback } from 'react';

const ERROR_MESSAGES = {
  1: 'Location access was denied. Allow location permission in your browser settings.',
  2: "Your position could not be determined. Check your device's GPS or network.",
  3: 'Location request timed out. Please try again.',
};

/**
 * Returns the user's position (with accuracy in metres) and a function that
 * requests it and pans the map there. The blue dot and accuracy circle are
 * drawn by MapView from `currentLocation`.
 */
export default function useGPS(map, onError) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  const trackLocation = useCallback(() => {
    if (!navigator.geolocation) {
      onError?.('Geolocation is not supported by this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy || 20 };
        setCurrentLocation(pos);
        setLocating(false);
        if (map) {
          map.panTo({ lat: pos.lat, lng: pos.lng });
          map.setZoom(17);
        }
      },
      (error) => {
        setLocating(false);
        onError?.(ERROR_MESSAGES[error.code] || 'An unknown location error occurred.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, [map, onError]);

  return { currentLocation, locating, trackLocation };
}