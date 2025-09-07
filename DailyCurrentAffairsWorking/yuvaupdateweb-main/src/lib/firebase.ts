import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// Uses environment variables in production, fallback to hardcoded values for development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAr0-reXFa5nLRAv2AdNbHMC9w-1LAtgsk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yuvaupdate-3762b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "yuvaupdate-3762b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "yuvaupdate-3762b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "970590845048",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:970590845048:android:2d51c7c3fcae508edbd58d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const storage = getStorage(app);

export default app;