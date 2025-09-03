// Ensure the default Firebase app exists for React Native Firebase modules.
// Some environments (expo dev client / manual builds) may not auto-initialize
// even when `google-services.json` is present. Create the default app here
// as a reliable fallback using the same config used by the project.
import { getApps, getApp, initializeApp } from '@react-native-firebase/app';
// Debug timing log: record when this module is evaluated
// (Helps diagnose races with messaging module imports)
// Using Date.now so logs appear very early
try {
	// eslint-disable-next-line no-console
	console.log('[firebaseInit] Module evaluation start. Existing apps count BEFORE:', getApps?.().length);
} catch (_) {}

const firebaseConfig = {
	apiKey: "AIzaSyCO_QywjmS1Zt0SgjlXTQ0UNGnalBSo8NY",
	authDomain: "soullink-96d4b.firebaseapp.com",
	projectId: "soullink-96d4b",
	storageBucket: "soullink-96d4b.firebasestorage.app",
	messagingSenderId: "321937432406",
	appId: "1:321937432406:android:fe8ec5604b2cc98e5380f7"
};

let firebaseApp: any = undefined;

try {
	if (getApps && getApps().length > 0) {
		firebaseApp = getApp();
		console.log('[firebaseInit] ✅ Existing Firebase app detected:', firebaseApp?.options?.projectId);
	} else {
		console.log('[firebaseInit] No apps detected, attempting manual initializeApp(...)');
		firebaseApp = initializeApp(firebaseConfig);
		console.log('[firebaseInit] ✅ Manual initializeApp success for project:', firebaseApp?.options?.projectId);
	}
} catch (e) {
	console.warn('[firebaseInit] ⚠ Initialization fallback failed:', e);
}

try {
	console.log('[firebaseInit] AFTER init apps count:', getApps?.().length);
} catch(_) {}

export function isFirebaseReady(): boolean {
	return !!(firebaseApp ?? (getApps && getApps().length > 0));
}

export default firebaseApp;
