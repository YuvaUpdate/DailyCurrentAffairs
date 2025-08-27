import { AppRegistry, Platform } from 'react-native';

// Lazy require to avoid bundling firebase if not present at runtime
let messaging: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  messaging = require('@react-native-firebase/messaging');
} catch (e) {
  messaging = null;
}

// Attempt to use the messaging client shape normalization from NotificationService
function getMessagingClient() {
  if (!messaging) return null;
  try {
    if (typeof messaging === 'function') return messaging();
    if (messaging.default && typeof messaging.default === 'function') return messaging.default();
    return messaging;
  } catch (e) {
    return null;
  }
}

// Background message handler: invoked by native Firebase Messaging when a data or notification
// message arrives while the app is in the background or killed. We try to show a native
// notification via the existing NativeNotificationModule if available. This file is small
// and designed to be bundled at app startup.

async function backgroundMessageHandler(remoteMessage: any) {
  try {
    const { NativeModules } = require('react-native');
    const { NativeNotificationModule } = (NativeModules as any) || {};

    const notification = remoteMessage?.notification;
    const data = remoteMessage?.data;

    const title = (notification && (notification.title || notification.body)) || (data && data.title) || 'New Article';
    const body = (notification && notification.body) || (data && data.body) || (data && data.article && JSON.parse(data.article).headline) || '';

    if (Platform.OS !== 'web' && NativeNotificationModule && NativeNotificationModule.showNotification) {
      try {
        await NativeNotificationModule.showNotification(title, body, { article: data && data.article });
        return Promise.resolve();
      } catch (e) {
        // swallow and continue to fallback
      }
    }

    // If no native module, try to use messaging to display (some setups handle notifications automatically)
    return Promise.resolve();
  } catch (e) {
    return Promise.resolve();
  }
}

const client = getMessagingClient();
if (client && typeof client.setBackgroundMessageHandler === 'function') {
  try {
    client.setBackgroundMessageHandler(backgroundMessageHandler);
  } catch (e) {
    // ignore
  }
}

// Also register a headless task in case native expects a named headless task
try {
  AppRegistry.registerHeadlessTask('RNFirebaseBackgroundMessage', () => backgroundMessageHandler);
} catch (e) {
  // ignore registration errors on platforms that don't support headless tasks
}
