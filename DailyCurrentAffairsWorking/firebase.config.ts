import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// From your Firebase Console - Web App setup
const firebaseConfig = {
  apiKey: "AIzaSyAr0-reXFa5nLRAv2AdNbHMC9w-1LAtgsk",
  authDomain: "yuvaupdate-3762b.firebaseapp.com",
  projectId: "yuvaupdate-3762b",
  storageBucket: "yuvaupdate-3762b.firebasestorage.app",
  messagingSenderId: "970590845048",
  appId: "1:970590845048:android:2d51c7c3fcae508edbd58d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const storage = getStorage(app);

export default app;
