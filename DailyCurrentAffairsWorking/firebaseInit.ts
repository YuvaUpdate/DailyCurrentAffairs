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
	apiKey: "AIzaSyAr0-reXFa5nLRAv2AdNbHMC9w-1LAtgsk",
	authDomain: "yuvaupdate-3762b.firebaseapp.com",
	databaseURL: "https://yuvaupdate-3762b-default-rtdb.firebaseio.com",
	projectId: "yuvaupdate-3762b",
	storageBucket: "yuvaupdate-3762b.firebasestorage.app",
	messagingSenderId: "970590845048",
	appId: "1:970590845048:android:2d51c7c3fcae508edbd58d"
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

// Suppress specific network error logs that clutter the console
if (typeof window !== 'undefined' && window.console) {
	const originalError = console.error;
	console.error = (...args: any[]) => {
		const message = args.join(' ');
		// Filter out via.placeholder.com and other network errors
		if (message.includes('via.placeholder.com') || 
			message.includes('ERR_NAME_NOT_RESOLVED') ||
			message.includes('GET https://via.placeholder.com') ||
			message.includes('net::ERR_INTERNET_DISCONNECTED')) {
			return; // Suppress these logs
		}
		originalError.apply(console, args);
	};
}

export function isFirebaseReady(): boolean {
	return !!(firebaseApp ?? (getApps && getApps().length > 0));
}

export default firebaseApp;
