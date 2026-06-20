// Initialisation Firebase pour React + Vite + Netlify.
// Les variables doivent être définies dans Netlify avec le préfixe VITE_.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value || String(value).includes('ton_') || String(value).startsWith('ta_'))
  .map(([key]) => key);

export const firebaseConfigIsValid = missingKeys.length === 0;
export const firebaseMissingKeys = missingKeys;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Affiche les messages Firebase Auth/reCAPTCHA en français quand Firebase le permet.
auth.languageCode = 'fr';

export const db = getFirestore(app);
export const storage = getStorage(app);
