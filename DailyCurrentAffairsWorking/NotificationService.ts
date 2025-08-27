import { Alert, Platform, NativeModules, PermissionsAndroid, Linking } from 'react-native';

const { NativeNotificationModule } = (NativeModules as any) || {};
const LOG_TAG = 'NotificationService';

// Try to lazily require firebase/messaging if available
let messaging: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  messaging = require('@react-native-firebase/messaging');
} catch (e) {
  messaging = null;
}

/**
 * Helper to resolve a usable messaging client regardless of import shape.
 * Some environments export a callable factory (messaging()) while others
 * expose methods directly on the module object. Normalize to a client
 * object with the runtime methods if available.
 */
function getMessagingClient(): any {
  if (!messaging) return null;
  try {
    // If messaging is a function (common), call it
    if (typeof messaging === 'function') {
      return messaging();
    }
    // If messaging has a default that is callable, prefer that
    if (messaging.default && typeof messaging.default === 'function') {
      return messaging.default();
    }
    // Otherwise assume methods may exist directly on the object
    return messaging;
  } catch (e) {
    console.warn('[NotificationService] Failed to get messaging client', e);
    return null;
  }
}

export class NotificationService {
  private static instance: NotificationService;
  private subscribers: ((article: any) => void)[] = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions (web or native)
  async requestPermission(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }

      // On Android 13+ (API 33+) we must request POST_NOTIFICATIONS at runtime
      if (Platform.OS === 'android') {
        const sdk = Number(Platform.Version) || 0;
        console.log('[NotificationService] Android SDK version:', sdk);
        if (sdk >= 33) {
          try {
            console.log('[NotificationService] Checking POST_NOTIFICATIONS permission');
            const has = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any);
            console.log('[NotificationService] POST_NOTIFICATIONS already granted?', has);
            if (has) return true;
            console.log('[NotificationService] Requesting POST_NOTIFICATIONS permission');
            const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any);
            console.log('[NotificationService] POST_NOTIFICATIONS request result:', result);
            if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

            // If permission denied, show an in-app prompt with a button into app settings
            try {
              Alert.alert(
                'Enable Notifications',
                'To receive article notifications, please enable notifications for this app in system settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => { Linking.openSettings(); } }
                ]
              );
            } catch (e) {}

            return false;
          } catch (e) {
            console.warn('[NotificationService] Error requesting POST_NOTIFICATIONS permission', e);
            // fall through to messaging-based request below
          }
        }
      }

      if (messaging && Platform.OS !== 'web') {
        // Use firebase messaging permission request as a fallback for older platforms
        try {
          // if messaging is callable this will work; getMessagingClient handles shapes elsewhere
          await messaging()?.requestPermission?.();
        } catch (e) {
          // ignore
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Send local notification for new articles
  async sendNewArticleNotification(article: any) {
    try {
    console.log(`[${LOG_TAG}] sendNewArticleNotification called (platform=${Platform.OS})`, article && article.headline);
    // If running on native and native module present, use it to post a local notification
      if (Platform.OS !== 'web' && NativeNotificationModule && NativeNotificationModule.showNotification) {
        const title = article.headline ? `New Article: ${article.headline}` : 'New Article';
        const body = article.headline || article.summary || '';
        try {
      console.log(`[${LOG_TAG}] Calling NativeNotificationModule.showNotification`, { title, body });
      await NativeNotificationModule.showNotification(title, body, { article: JSON.stringify(article) });
      console.log(`[${LOG_TAG}] NativeNotificationModule.showNotification resolved`);
          return;
        } catch (e) {
          console.warn('Native notification failed, falling back to Alert', e);
        }
      }

      // Web/browser behavior
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('New Article Posted! 📰', {
          body: article.headline,
          icon: '/assets/icon.png',
          badge: '/assets/icon.png',
          tag: 'new-article',
          requireInteraction: false,
          silent: false,
        });

        setTimeout(() => { notification.close(); }, 5000);
        notification.onclick = () => { window.focus(); notification.close(); this.notifySubscribers(article); };
        return;
      }

      // Fallback to Alert on native if nothing else works
      Alert.alert(
        '📰 New Article Posted!',
        article.headline,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Read Now', onPress: () => this.notifySubscribers(article) }
        ]
      );
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Subscribe to notification events
  subscribe(callback: (article: any) => void) {
    this.subscribers.push(callback);
    return () => { this.subscribers = this.subscribers.filter(sub => sub !== callback); };
  }

  // Notify all subscribers
  private notifySubscribers(article: any) {
    this.subscribers.forEach(callback => callback(article));
  }

  // Initialize notifications: request permission and setup FCM topic subscription + foreground handler
  async initialize() {
  console.log(`[${LOG_TAG}] initialize() called`);
    const hasPermission = await this.requestPermission();
    if (hasPermission) console.log('✅ Notification permissions granted'); else console.log('❌ Notification permissions denied');

    // Subscribe to FCM topic 'news-updates' so the server function can broadcast to all devices
    if (Platform.OS !== 'web') {
      const client = getMessagingClient();
      console.log(`[${LOG_TAG}] messaging import shape:`, typeof messaging, Object.keys(messaging || {}));
      console.log(`[${LOG_TAG}] resolved messaging client:`, client ? Object.keys(client) : null);

      if (client) {
        try {
          // Attach foreground handler if available
          if (typeof client.onMessage === 'function') {
            client.onMessage(async (remoteMessage: any) => {
              try {
                const notification = remoteMessage.notification;
                const data = remoteMessage.data;
                // If app is foreground, show a local/native notification
                if (notification) {
                  await this.sendNewArticleNotification({ headline: notification.title || notification.body, ...data });
                }
                // If payload contains article data, notify subscribers
                if (data && data.article) {
                  try { this.notifySubscribers(JSON.parse(data.article)); } catch (e) {}
                }
              } catch (e) {
                console.error('Error handling foreground message', e);
              }
            });
            console.log(`[${LOG_TAG}] attached foreground onMessage handler`);
          } else {
            console.warn(`[${LOG_TAG}] messaging client has no onMessage method`);
          }

          // Subscribe this device to the topic so it receives server-sent topic messages (if API supported)
          if (typeof client.subscribeToTopic === 'function') {
            try {
              await client.subscribeToTopic('news-updates');
              console.log('Subscribed to topic: news-updates');
            } catch (e) {
              console.warn('Failed to subscribe to topic news-updates', e);
            }
          } else {
            console.warn('[NotificationService] messaging client does not support subscribeToTopic');
          }
        } catch (err) {
          console.warn('Messaging onMessage handler not available', err);
        }
      } else {
        console.log(`[${LOG_TAG}] No messaging client available; skipping FCM handlers`);
      }
    }

    return hasPermission;
  }
}

export const notificationService = NotificationService.getInstance();
