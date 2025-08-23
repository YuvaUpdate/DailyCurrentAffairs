import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

// Initialize Auth with proper persistence for React Native
// Initialize Auth with proper persistence for React Native
let authInstance;
try {
  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
  } else {
    // For React Native, initialize auth with AsyncStorage persistence so
    // the auth state survives app restarts and the warning from Firebase
    // about memory-only persistence is avoided.
    try {
      // Dynamically require the react-native persistence util to avoid
      // static TypeScript resolution issues across different firebase SDKs.
      let getRNPersistence: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        getRNPersistence = require('firebase/auth/react-native').getReactNativePersistence;
      } catch (err) {
        // older/newer SDKs might not expose the helper; fall back later
        getRNPersistence = null;
      }

      if (getRNPersistence) {
        authInstance = initializeAuth(app, {
          persistence: getRNPersistence(AsyncStorage as any)
        });
      } else {
        // As a final fallback, use getAuth and accept default behavior
        console.warn('getReactNativePersistence not found; falling back to getAuth');
        authInstance = getAuth(app);
      }
    } catch (e) {
      // If initializeAuth fails for any reason, fallback to getAuth
      console.warn('initializeAuth failed, falling back to getAuth:', e);
      authInstance = getAuth(app);
    }
  }
} catch (error) {
  // Fallback if initialization fails
  console.log('Auth initialization error, using getAuth fallback:', error);
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const analytics = getAnalytics(app);
export const storage = getStorage(app);

export default app;
