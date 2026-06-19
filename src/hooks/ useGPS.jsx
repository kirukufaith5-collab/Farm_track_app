import { useState, useCallback } from 'react';

export default function useGPS(map) {
  const [currentLocation, setCurrentLocation] = useState(null);

  const trackLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Error: Your browser doesn't support geolocation.");
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
      },
      (error) => {
        console.error(error);
        alert("Error: The Geolocation service failed or permission was denied.");
      },
      { enableHighAccuracy: true }
    );
  }, [map]);

  return { currentLocation, trackLocation };
}
