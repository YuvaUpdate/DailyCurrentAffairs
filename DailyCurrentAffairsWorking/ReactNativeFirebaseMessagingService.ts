import { getApps } from '@react-native-firebase/app';

let _messaging: any = null;
const getMessaging = async () => {
  if (_messaging) return _messaging;
  const mod = await import('@react-native-firebase/messaging');
  _messaging = mod.default || mod;
  return _messaging;
};
import { Platform } from 'react-native';

/**
 * React Native Firebase Messaging Service for receiving notifications
 * This handles foreground notifications, background notifications, and topic subscriptions
 */
export class ReactNativeFirebaseMessagingService {
  private messaging: any;
  private isInitialized: boolean = false;

  constructor() {
    console.log('🔔 React Native Firebase Messaging Service initializing...');
    
  // Multiple initialization attempts with increasing delays
  this.attemptInitialization(1000);
  }

  private attemptInitialization(delay: number) {
    setTimeout(async () => {
      try {
  // Check if Firebase app exists
  if (getApps && getApps().length === 0) {
          console.log('⚠ No Firebase apps available, retrying...');
          if (delay < 8000) {
            this.attemptInitialization(delay * 2);
          }
          return;
        }

  const messagingMod = await getMessaging();
  this.messaging = messagingMod();
        console.log('✅ React Native Firebase Messaging client created');
        this.initialize();
      } catch (error) {
        console.warn('❌ React Native Firebase Messaging not available:', error);
        
        // Retry with exponential backoff
        if (delay < 8000) {
          console.log(`🔄 Retrying messaging initialization in ${delay * 2}ms`);
          this.attemptInitialization(delay * 2);
        } else {
          console.error('❌ Giving up on messaging initialization');
          this.messaging = null;
        }
      }
    }, delay);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || !this.messaging) return;

    try {
      console.log('🔔 Initializing React Native Firebase Messaging...');

      // Request notification permissions
      const authStatus = await this.messaging.requestPermission();
      const enabled =
        authStatus === (await getMessaging()).AuthorizationStatus.AUTHORIZED ||
        authStatus === (await getMessaging()).AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM authorization status:', authStatus);

        // Subscribe to the news-updates topic
        await this.messaging.subscribeToTopic('news-updates');
        console.log('✅ Subscribed to news-updates topic');

        // Get FCM token for debugging
        const token = await this.messaging.getToken();
        console.log('📱 FCM Token:', token ? token.substring(0, 20) + '...' : 'Not available');

        // Set up foreground message handler
        this.messaging.onMessage(async (remoteMessage: any) => {
          console.log('📥 Foreground message received:', remoteMessage);
          
          // Show notification when app is in foreground
          if (remoteMessage.notification) {
            console.log('🔔 Notification:', remoteMessage.notification.title);
            
            // You can show an in-app notification here
            // For now, just log it
            this.showInAppNotification(remoteMessage);
          }
        });

        // Set up notification opened handler
        this.messaging.onNotificationOpenedApp((remoteMessage: any) => {
          console.log('📱 Notification caused app to open from background:', remoteMessage);
          this.handleNotificationTap(remoteMessage);
        });

        // Check if app was opened from a notification
        const initialNotification = await this.messaging.getInitialNotification();
        if (initialNotification) {
          console.log('📱 App opened by notification:', initialNotification);
          this.handleNotificationTap(initialNotification);
        }

        this.isInitialized = true;
        console.log('✅ React Native Firebase Messaging initialized successfully');
      } else {
        console.warn('⚠ FCM notifications not authorized');
      }
    } catch (error) {
      console.warn('⚠ Failed to initialize React Native Firebase messaging:', error);
    }
  }

  private showInAppNotification(remoteMessage: any): void {
    try {
      // For React Native, you can use a custom notification component here
      // For now, we'll just log it
      console.log('📱 In-app notification:', {
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: remoteMessage.data
      });

      // You could integrate with react-native-toast-message or similar here
    } catch (error) {
      console.warn('⚠ Failed to show in-app notification:', error);
    }
  }

  private handleNotificationTap(remoteMessage: any): void {
    try {
      console.log('👆 User tapped notification:', remoteMessage);
      
      // Handle navigation based on notification data
      if (remoteMessage.data?.articleId) {
        console.log('📰 Navigate to article:', remoteMessage.data.articleId);
        // You can add navigation logic here
      }
    } catch (error) {
      console.warn('⚠ Failed to handle notification tap:', error);
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.messaging) return null;
    
    try {
      const token = await this.messaging.getToken();
      return token;
    } catch (error) {
      console.warn('⚠ Failed to get FCM token:', error);
      return null;
    }
  }

  async subscribeToTopic(topic: string): Promise<boolean> {
    if (!this.messaging) return false;
    
    try {
      await this.messaging.subscribeToTopic(topic);
      console.log(`✅ Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.warn(`⚠ Failed to subscribe to topic ${topic}:`, error);
      return false;
    }
  }

  async unsubscribeFromTopic(topic: string): Promise<boolean> {
    if (!this.messaging) return false;
    
    try {
      await this.messaging.unsubscribeFromTopic(topic);
      console.log(`✅ Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      console.warn(`⚠ Failed to unsubscribe from topic ${topic}:`, error);
      return false;
    }
  }

  async checkNotificationStatus(): Promise<void> {
    console.log('🔍 Checking React Native Firebase Messaging status...');
    
    if (!this.messaging) {
      console.log('❌ React Native Firebase Messaging not available');
      return;
    }

    try {
      const authStatus = await this.messaging.requestPermission();
      console.log('🔐 Permission status:', authStatus);

      const token = await this.messaging.getToken();
      console.log('📱 FCM Token available:', !!token);

      console.log('✅ React Native Firebase Messaging status check complete');
    } catch (error) {
      console.error('❌ Status check failed:', error);
    }
  }
}

// Create singleton instance
// Do not create a singleton at module import time. Callers should instantiate
// ReactNativeFirebaseMessagingService after firebaseInit has run.
export default ReactNativeFirebaseMessagingService;
