import React, { useState, useEffect, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from './firebase';

import Sidebar from './components/Sidebar.jsx';
import MapView from './components/MapView.jsx';
import useGPS from './hooks/ useGPS.jsx';
import styles from './App.module.css';

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
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Ref to MapView so we can imperatively call panToField()
  const mapViewRef = useRef(null);

  const { currentLocation, trackLocation } = useGPS(map);

  // Close sidebar on desktop resize
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const handler = (e) => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Firestore real-time listener
  useEffect(() => {
    setDbLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, 'fields'),
      (snapshot) => {
        const loaded = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
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
    return () => unsubscribe();
  }, []);

  // True when the user has drawn a boundary but not yet saved it to Firestore
  const hasUnsavedPlot = selectedField !== null && selectedField.id === null;

  const handlePolygonComplete = (geoData) => {
    setSelectedField({
      id: null,
      coordinates: geoData.coordinates,
      area: geoData.area,
      crop: 'Unassigned',
      notes: '',
      farmerCode: '',
      ownerName: '',
    });
    setSidebarOpen(true);
  };

  // Firestore: save (create or update)
  const handleSaveField = async (finalizedField) => {
    setSaving(true);
    try {
      if (finalizedField.id) {
        const { id, ...data } = finalizedField;
        await updateDoc(doc(db, 'fields', id), data);
      } else {
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

  // Called when user clicks a saved parcel in the sidebar list —
  // opens it in the editor AND flies the map to that plot's location.
  const handleFlyToField = (field) => {
    setSelectedField(field);
    mapViewRef.current?.panToField(field);
    setSidebarOpen(false); // close sidebar on mobile so map is visible
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
    return <div className={styles.errorMessage}>🔥 {dbError}</div>;
  }

  return (
    <div className={styles.dashboardContainer} style={{ position: 'relative' }}>

      <style>{`
        .mobile-topbar { display: none; }
        @media (max-width: 768px) {
          .mobile-topbar {
            display: flex;
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 30;
            background: #FAF7F2;
            border-bottom: 1px solid #E6E0D6;
            padding: 10px 16px;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
          .map-push-down { padding-top: 52px; }
        }
      `}</style>

      <div className="mobile-topbar">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          style={{ background: '#2B2420', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ☰ Menu
        </button>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#2B2420', letterSpacing: '-0.3px' }}>
          FarmTrack
        </span>
        <button
          onClick={trackLocation}
          aria-label="Locate me"
          style={{ background: '#5B7B5A', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          ⌖ GPS
        </button>
      </div>

      <Sidebar
        onLocateClick={trackLocation}
        selectedField={selectedField}
        fields={fields}
        onSaveField={handleSaveField}
        onDeleteField={handleDeleteField}
        onFlyToField={handleFlyToField}
        saving={saving}
        dbLoading={dbLoading}
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="map-push-down" style={{ flex: 1, height: '100vh', display: 'flex' }}>
        <MapView
          ref={mapViewRef}
          currentLocation={currentLocation}
          fields={fields}
          onMapLoad={setMap}
          onPolygonComplete={handlePolygonComplete}
          hasUnsavedPlot={hasUnsavedPlot}
          onSelectField={(field) => {
            setSelectedField(field);
            setSidebarOpen(true);
          }}
        />
      </div>
    </div>
  );
}
