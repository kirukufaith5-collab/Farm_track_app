import { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { auth, db } from './firebase.js';
import Sidebar from './components/Sidebar.jsx';
import MapView from './components/MapView.jsx';
import Login from './components/Login.jsx';
import Toast from './components/Toast.jsx';
import useGPS from './hooks/useGPS.js';
import { getAreaHa, settleWithin } from './utils.js';
import styles from './App.module.css';

const LIBRARIES = ['geometry', 'places'];
const NO_FIELDS = [];

// ── Signed-in workspace ──────────────────────────────────────────────────
function Workspace({ user }) {
  const uid = user.uid;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [data, setData] = useState({ uid: null, fields: NO_FIELDS });
  const [selectedField, setSelectedField] = useState(null);
  const [dbError, setDbError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const mapViewRef = useRef(null);

  // Data belongs to the signed-in user; show nothing until their snapshot arrives
  const dbLoading = data.uid !== uid;
  const fields = dbLoading ? NO_FIELDS : data.fields;

  const notify = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);
  const notifyError = useCallback((message) => notify(message, 'error'), [notify]);

  const { currentLocation, locating, trackLocation } = useGPS(map, notifyError);

  // Close the mobile drawer when the window grows to desktop width
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const handler = (e) => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Real-time listener on THIS user's parcels only
  useEffect(() => {
    return onSnapshot(
      collection(db, 'users', uid, 'fields'),
      (snapshot) => {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        loaded.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setData({ uid, fields: loaded });
      },
      (error) => {
        console.error('Firestore read error:', error);
        setDbError('Could not load your parcels. Check your connection and Firestore rules.');
      }
    );
  }, [uid]);

  const hasUnsavedPlot = selectedField?.id === null;

  const handlePolygonComplete = ({ coordinates, area, areaHa }) => {
    setSelectedField({
      id: null,
      draftKey: Date.now(), // remounts the editor for each new drawing
      coordinates, area, areaHa,
      crop: 'Unassigned', notes: '', farmerCode: '', ownerName: '',
    });
    setSidebarOpen(true);
  };

  const handleSaveField = async (values) => {
    if (!selectedField) return;
    setSaving(true);
    try {
      const col = collection(db, 'users', uid, 'fields');
      const now = new Date().toISOString();
      const write = selectedField.id
        ? updateDoc(doc(col, selectedField.id), { ...values, areaHa: getAreaHa(selectedField), updatedAt: now })
        : addDoc(col, {
            coordinates: selectedField.coordinates,
            area: selectedField.area,
            areaHa: getAreaHa(selectedField),
            ...values,
            createdAt: now,
          });

      const outcome = await settleWithin(write);
      setSelectedField(null);
      if (outcome === 'saved') notify('Plot saved.', 'success');
      else notify('Saved on this device. It will sync when your connection recovers.', 'warning');
    } catch (error) {
      console.error('Firestore save error:', error);
      notify(
        error.code === 'permission-denied'
          ? 'Not allowed to save. Check your Firestore rules.'
          : 'Could not save the plot. Please try again.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (id) => {
    if (!window.confirm('Delete this parcel permanently? This cannot be undone.')) return;
    try {
      const outcome = await settleWithin(deleteDoc(doc(db, 'users', uid, 'fields', id)));
      if (selectedField?.id === id) setSelectedField(null);
      if (outcome === 'saved') notify('Parcel deleted.', 'success');
      else notify('Deleted on this device. It will sync when your connection recovers.', 'warning');
    } catch (error) {
      console.error('Firestore delete error:', error);
      notify('Could not delete the parcel. Please try again.', 'error');
    }
  };

  const handleFlyToField = (field) => {
    setSelectedField(field);
    mapViewRef.current?.panToField(field);
    setSidebarOpen(false);
  };

  if (loadError) {
    return (
      <div className={styles.errorMessage}>
        Maps failed to load. Check that VITE_GOOGLE_MAPS_API_KEY is set and that billing and
        the Maps JavaScript, Places and Geocoding APIs are enabled in Google Cloud Console.
      </div>
    );
  }
  if (!isLoaded) return <div className={styles.statusMessage}>Initializing geospatial systems…</div>;
  if (dbError) {
    return (
      <div className={styles.errorMessage}>
        🔥 {dbError}{' '}
        <button type="button" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer} style={{ position: 'relative' }}>
      <style>{`
        .mobile-topbar{display:none}
        @media (max-width:768px){
          .mobile-topbar{display:flex;position:fixed;top:0;left:0;right:0;z-index:30;background:#FAF7F2;border-bottom:1px solid #E6E0D6;padding:10px 16px;align-items:center;justify-content:space-between;gap:10px}
          .map-push-down{padding-top:52px}
        }
      `}</style>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onDone={dismissToast} />}

      <div className="mobile-topbar">
        <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar"
          style={{ background: '#2B2420', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          ☰ Menu
        </button>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#2B2420' }}>FarmTrack</span>
        <button type="button" onClick={trackLocation} aria-label="Locate me"
          style={{ background: '#5B7B5A', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          ⌖ GPS
        </button>
      </div>

      <Sidebar
        onLocateClick={trackLocation}
        locating={locating}
        selectedField={selectedField}
        fields={fields}
        onSaveField={handleSaveField}
        onCancel={() => setSelectedField(null)}
        onDeleteField={handleDeleteField}
        onFlyToField={handleFlyToField}
        saving={saving}
        dbLoading={dbLoading}
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        userEmail={user.email}
        onSignOut={() => signOut(auth)}
      />

      <div className="map-push-down" style={{ flex: 1, height: '100vh', display: 'flex' }}>
        <MapView
          ref={mapViewRef}
          currentLocation={currentLocation}
          fields={fields}
          draftField={hasUnsavedPlot ? selectedField : null}
          selectedFieldId={selectedField?.id ?? null}
          onMapLoad={setMap}
          onPolygonComplete={handlePolygonComplete}
          hasUnsavedPlot={hasUnsavedPlot}
          onSelectField={(field) => { setSelectedField(field); setSidebarOpen(true); }}
          onNotify={notify}
        />
      </div>
    </div>
  );
}

// ── Auth gate ────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined); // undefined = still checking

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) return <div className={styles.statusMessage}>Loading…</div>;
  if (!user) return <Login />;
  return <Workspace user={user} />;
}