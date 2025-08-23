import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// From your Firebase Console - Web App setup
const firebaseConfig = {
  apiKey: "AIzaSyD3tc1EKESzh4ITdCbM3a5NSlZa4vDnVBY",
  authDomain: "soullink-96d4b.firebaseapp.com",
  projectId: "soullink-96d4b",
  storageBucket: "soullink-96d4b.firebasestorage.app",
  messagingSenderId: "321937432406",
  appId: "1:321937432406:web:bfcd94fbdba69acf5380f7",
  measurementId: "G-ZTNBPPYRLS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const storage = getStorage(app);

export default app;
