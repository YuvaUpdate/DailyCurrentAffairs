import { registerRootComponent } from 'expo';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Register background FCM handler before the React root so it is available
// to the native headless JS context and background message delivery.
import './firebaseBackgroundHandler';

// Configure logging early: silence verbose logs on production builds to avoid
// runtime cost from thousands of console statements on device.
import './utils/logging';

import AppWrapper from './AppWrapper';

// Wrap the top-level app with SafeAreaProvider so useSafeAreaInsets() works
function Root() {
	// Use createElement instead of JSX to keep this file as .ts
	return React.createElement(
		SafeAreaProvider,
		null,
		React.createElement(AppWrapper, null)
	);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
