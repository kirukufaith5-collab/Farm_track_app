import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// All values come from your .env file — never hardcode these
const firebaseConfig = {
  apiKey:             import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:          import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:              import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Export the Firestore database instance for use across the app
export const db = getFirestore(app);
// Initialize Firebase