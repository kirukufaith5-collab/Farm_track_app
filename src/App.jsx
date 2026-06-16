import React, { useState, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import Sidebar from "./components/Sidebar.jsx";
import MapView from "./components/MapView.jsx";
import useGPS from "./hooks/ useGPS.jsx";

// 1. Import your scoped module styles here
import styles from "./App.module.css"; 

// Keep 'geometry', but leave 'drawing' completely out of it!
const libraries = ['geometry', 'places']; 


export default function App() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [map, setMap] = useState(null);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);

  const { currentLocation, trackLocation } = useGPS(map);

  useEffect(() => {
    if (map) trackLocation();
  }, [map, trackLocation]);

  const handlePolygonComplete = (geoData) => {
    const freshField = {
      id: Date.now(),
      coordinates: geoData.coordinates,
      area: geoData.area,
      crop: 'Unassigned',
      notes: '',
    };
    setSelectedField(freshField);
  };

  const handleSaveField = (finalizedField) => {
    setFields((prev) => {
      const fieldExists = prev.some((f) => f.id === finalizedField.id);
      if (fieldExists) {
        return prev.map((f) => (f.id === finalizedField.id ? finalizedField : f));
      }
      return [...prev, finalizedField];
    });
    setSelectedField(null);
  };

  const handleDeleteField = (id) => {
    setFields((prev) => prev.filter((field) => field.id !== id));
    if (selectedField?.id === id) setSelectedField(null);
  };

  // 2. Updated Fallback UI returns using CSS modules classes
  if (loadError) return <div className={styles.errorMessage}>Maps integration failed to render. Check credentials.</div>;
  if (!isLoaded) return <div className={styles.statusMessage}>Initializing Geospatial Systems...</div>;

  return (
   /* 🚨 CRITICAL: Ensure className uses styles.dashboardContainer exactly like this 🚨 */
    <div className={styles.dashboardContainer}>
      <Sidebar 
        onLocateClick={trackLocation}
        selectedField={selectedField}
        fields={fields}
        onSaveField={handleSaveField}
        onDeleteField={handleDeleteField}
      />
      <MapView 
        currentLocation={currentLocation}
        fields={fields}
        onMapLoad={setMap}
        onPolygonComplete={handlePolygonComplete}
        onSelectField={setSelectedField}
      />
    </div>
  );
}