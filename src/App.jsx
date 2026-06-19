import React, { useState, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

// Firestore imports
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {db} from './firebase';

import Sidebar from './components/Sidebar.jsx';
import MapView from './components/MapView.jsx';
import useGPS from './hooks/ useGPS.jsx';
import styles from './App.module.css';

// Must be at module level — never inside the component.
// A new array reference on every render causes useJsApiLoader to reload
// the Maps script in a loop, triggering the "can't load Google Maps" error.
const LIBRARIES = ['geometry', 'places'];

export default function App() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);

  // Loading and error states for Firestore operations
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [saving, setSaving] = useState(false);

  const { currentLocation, trackLocation } = useGPS(map);

  // Pan to user location once the map instance is ready
  useEffect(() => {
    if (map) trackLocation();
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Firestore real-time listener
  // onSnapshot keeps fields in sync across all manager devices automatically.
  // Any save or delete by one manager instantly appears for everyone else.
  useEffect(() => {
    setDbLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, 'fields'),
      (snapshot) => {
        const loaded = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,           // Firestore document ID (replaces Date.now())
          ...docSnap.data(),
        }));
        setFields(loaded);
        setDbLoading(false);
      },
      (error) => {
        console.error('Firestore read error:', error);
        setDbError('Failed to load fields from database. Check your Firebase config.');
        setDbLoading(false);
      }
    );

    // Cleanup: stop listening when the component unmounts
    return () => unsubscribe();
  }, []);

  // Called when a polygon is drawn on the map.
  // Does NOT save to Firestore yet — user must fill in crop details first.
  const handlePolygonComplete = (geoData) => {
    setSelectedField({
      id: null,                     // null = not yet saved to Firestore
      coordinates: geoData.coordinates,
      area: geoData.area,
      crop: 'Unassigned',
      notes: '',
    });
  };

  // Firestore: save (create or update)
  const handleSaveField = async (finalizedField) => {
    setSaving(true);
    try {
      if (finalizedField.id) {
        // Existing Firestore document — update it
        const { id, ...data } = finalizedField;
        await updateDoc(doc(db, 'fields', id), data);
      } else {
        // New field — Firestore generates its own ID
        const { id: _unused, ...data } = finalizedField;
        await addDoc(collection(db, 'fields'), {
          ...data,
          createdAt: new Date().toISOString(),
        });
      }
      setSelectedField(null);
    } catch (error) {
      console.error('Firestore save error:', error);
      alert('Failed to save field. Please check your internet connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  // Firestore: delete
  const handleDeleteField = async (id) => {
    const confirmed = window.confirm('Delete this field permanently? This cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'fields', id));
      if (selectedField?.id === id) setSelectedField(null);
    } catch (error) {
      console.error('Firestore delete error:', error);
      alert('Failed to delete field. Please try again.');
    }
  };

  if (loadError) {
    return (
      <div className={styles.errorMessage}>
        Maps failed to load. Check that VITE_GOOGLE_MAPS_API_KEY is set
        in your .env file and that billing + APIs are enabled in Google Cloud Console.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className={styles.statusMessage}>Initializing Geospatial Systems...</div>;
  }

  if (dbError) {
    return <div className={styles.errorMessage}> 🔥{dbError}</div>;
  }

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar
        onLocateClick={trackLocation}
        selectedField={selectedField}
        fields={fields}
        onSaveField={handleSaveField}
        onDeleteField={handleDeleteField}
        saving={saving}
        dbLoading={dbLoading}
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
