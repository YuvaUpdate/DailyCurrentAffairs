import { Alert, Platform } from 'react-native';
let messaging: any = null;
try {
  // optional import - will throw on web or if the native module isn't installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  messaging = require('@react-native-firebase/messaging').default;
} catch (err) {
  // messaging not available; we'll gracefully fallback to in-app alerts
  messaging = null;
}

export class NotificationService {
  private static instance: NotificationService;
  private subscribers: ((article: any) => void)[] = [];
  // track recently delivered article ids to avoid duplicate bursts
  private recentlyDelivered: Map<string | number, number> = new Map();
  // avoid registering multiple onMessage handlers
  private foregroundHandlerRegistered = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions
  async requestPermission(): Promise<boolean> {
    try {
      // If running in RN and react-native-firebase/messaging is available, request native permissions
      if (messaging && Platform.OS !== 'web') {
        try {
          // register for remote messages on Android
          if (Platform.OS === 'android') {
            await messaging().registerDeviceForRemoteMessages();
          }
          const authStatus = await messaging().requestPermission();
          // authStatus may be an object or numeric enum depending on version; treat any truthy as granted
          const enabled = !!authStatus;
          return enabled;
        } catch (err) {
          console.warn('Messaging permission request failed, falling back to in-app alerts', err);
          return false;
        }
      }

      // Web fallback: browser notifications
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
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
      // Deduplicate by article id or headline within a short time window (10s)
      try {
        const articleId = article && (article.id ?? article.headline ?? null);
        if (articleId != null) {
          const now = Date.now();
          const last = this.recentlyDelivered.get(articleId);
          if (last && now - last < 10000) {
            // recently delivered, suppress duplicate
            console.log('[NotificationService] Suppressing duplicate article delivery for id:', articleId);
            return;
          }
          this.recentlyDelivered.set(articleId, now);
          // prune older entries
          for (const [k, v] of this.recentlyDelivered.entries()) {
            if (now - v > 60000) this.recentlyDelivered.delete(k);
          }
        }
      } catch (err) {
        // fallback: continue if dedupe logic fails
        console.warn('[NotificationService] Dedupe check failed', err);
      }
      // If react-native-firebase messaging is available (native mobile), do not show blocking
      // Alert.alert dialogs for each incoming foreground message. Many Android FCM messages
      // will already show a system notification when the app is backgrounded if the server
      // sends a `notification` payload. For foreground messages we instead notify subscribers
      // so the app UI can show a toast/snackbar and handle navigation without blocking alerts.
      if (messaging && Platform.OS !== 'web') {
        // Notify any in-app subscribers (UI should show a non-blocking toast or update state)
        this.notifySubscribers(article);
        console.log('[NotificationService] Foreground article delivered to subscribers');
        return;
      }

      // Web fallback: browser notifications
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('New Article Posted! 📰', {
          body: article.headline,
          icon: '/assets/yuvaupdate.png', // Make sure you have this icon
          badge: '/assets/yuvaupdate.png',
          tag: 'new-article',
          requireInteraction: false,
          silent: false,
        });

        setTimeout(() => {
          notification.close();
        }, 5000);

        notification.onclick = () => {
          window.focus();
          notification.close();
          this.notifySubscribers(article);
        };
        return;
      }

      // Fallback to alert if notifications not available
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

  // Get FCM device token (if available)
  async getDeviceToken(): Promise<string | null> {
    try {
      if (messaging && Platform.OS !== 'web') {
        const token = await messaging().getToken();
        console.log('[NotificationService] FCM token:', token);
        return token;
      }
      return null;
    } catch (err) {
      console.warn('Failed to get device token', err);
      return null;
    }
  }

  // Subscribe to notification events
  subscribe(callback: (article: any) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  // Notify all subscribers
  private notifySubscribers(article: any) {
    this.subscribers.forEach(callback => callback(article));
  }

  // Initialize notifications
  async initialize() {
    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      console.log('✅ Notification permissions granted');
    } else {
      console.log('❌ Notification permissions denied');
    }

    // Set up foreground message handler when messaging is available
      if (messaging && Platform.OS !== 'web') {
        try {
          // Avoid registering multiple handlers when initialize() is called more than once
          if (!this.foregroundHandlerRegistered) {
            this.foregroundHandlerRegistered = true;
            // Listen for messages when the app is in the foreground
            messaging().onMessage(async (remoteMessage: any) => {
            try {
              console.log('[NotificationService] Foreground message received:', remoteMessage);
              // Map message to article shape if present and notify subscribers
              let article = null;
              if (remoteMessage?.data && typeof remoteMessage.data.article === 'string') {
                try {
                  article = JSON.parse(remoteMessage.data.article || '{}');
                } catch (e) {
                  // Not a JSON article payload — ignore parse error and continue
                  console.warn('[NotificationService] Failed to parse article payload, falling back to notification text');
                  article = null;
                }
              }

              if (article) {
                // Do not show blocking Alert in foreground; let UI subscribers handle it
                this.notifySubscribers(article);
                console.log('[NotificationService] Delivered article to subscribers');
              } else {
                // Fallback: prefer non-blocking UI updates via subscribers; if none, log
                const title = remoteMessage?.notification?.title || 'New Article';
                const body = remoteMessage?.notification?.body || 'New content available';
                // Notify subscribers with a lightweight shape so UI can show a toast
                this.notifySubscribers({ headline: body, title });
                console.log('[NotificationService] Foreground notification (no article) forwarded to subscribers');
              }
            } catch (err) {
              // Guard against any unexpected error in the message handler to avoid crashing the app
              console.error('[NotificationService] Error handling foreground message:', err);
            }
            });
          } else {
            console.log('[NotificationService] Foreground handler already registered, skipping duplicate registration');
          }

  // Optionally, get the device token and register/subscribe it to a topic
        const token = await this.getDeviceToken();
        if (token) {
          console.log('[NotificationService] Device token ready');
          try {
            // subscribe this app instance to 'news-updates' topic
            await messaging().subscribeToTopic('news-updates');
            console.log('[NotificationService] Subscribed to topic: news-updates');
          } catch (err) {
            console.warn('Failed to subscribe to topic news-updates', err);
          }
        }
      } catch (err) {
        console.warn('Failed to initialize messaging listeners', err);
      }
    }

    return hasPermission;
  }
}

export const notificationService = NotificationService.getInstance();
