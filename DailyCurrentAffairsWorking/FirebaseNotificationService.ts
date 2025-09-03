import { Platform, Alert, PermissionsAndroid } from 'react-native';
import { collection, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.config';

let _messaging: any = null;
const getMessaging = async () => {
  if (_messaging) return _messaging;
  const mod = await import('@react-native-firebase/messaging');
  _messaging = mod.default || mod;
  return _messaging;
};

/**
 * Clean Firebase Messaging Service using React Native Firebase v23
 * Uses the modern approach without deprecated APIs
 */
class FirebaseNotificationService {
  private isInitialized = false;
  private fcmToken: string | null = null;

  /**
   * Initialize Firebase messaging service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('✅ Firebase messaging already initialized');
      return true;
    }

    try {
      console.log('🔔 Initializing Firebase messaging...');

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('❌ Notification permissions denied');
        return false;
      }

      // Get FCM token
  const messagingMod = await getMessaging();
  const token = await messagingMod().getToken();
      this.fcmToken = token;
      console.log('📱 FCM Token obtained:', token ? token.substring(0, 20) + '...' : 'Not available');

      // Store FCM token in Firestore for push notifications
      if (token) {
        try {
          const colRef = collection(db, 'fcmTokens');
          const docRef = doc(colRef, token);
          await setDoc(docRef, {
            token: token,
            platform: Platform.OS,
            updatedAt: serverTimestamp(),
          }, { merge: true });
          console.log('🔔 FCM token stored in Firestore successfully');
        } catch (e) {
          console.warn('Failed to store FCM token in Firestore', e);
        }
      }

      // Subscribe to news-updates topic
  const messagingMod2 = await getMessaging();
  await messagingMod2().subscribeToTopic('news-updates');
      console.log('✅ Subscribed to news-updates topic');

  // Set up message handlers
  await this.setupMessageHandlers();

      this.isInitialized = true;
      console.log('✅ Firebase messaging initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Firebase messaging:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      // For Android 13+ (API 33+), request POST_NOTIFICATIONS permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('❌ POST_NOTIFICATIONS permission denied');
          this.showPermissionAlert();
          return false;
        }
      }

      // Request FCM permissions
    const messagingMod3 = await getMessaging();
    const authStatus = await messagingMod3().requestPermission();
      const enabled =
        authStatus === messagingMod3.AuthorizationStatus.AUTHORIZED ||
        authStatus === messagingMod3.AuthorizationStatus.PROVISIONAL;

      console.log('🔐 FCM Permission status:', authStatus);
      return enabled;

    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Show alert for permission denied
   */
  private showPermissionAlert(): void {
    Alert.alert(
      'Enable Notifications',
      'Please enable notifications in your device settings to receive news updates.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => {
          // You can add code here to open app settings
        }}
      ]
    );
  }

  /**
   * Set up foreground and background message handlers
   */
  private async setupMessageHandlers(): Promise<void> {
    // Handle foreground messages - only log, don't show alerts
    (await getMessaging())().onMessage(async (remoteMessage: any) => {
      console.log('📥 Foreground message received:', {
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: remoteMessage.data
      });

      // Don't show alert - let the user see it naturally in-app
      // Background notifications will show in notification panel automatically
    });

    // Handle notification tap when app is in background
    (await getMessaging())().onNotificationOpenedApp((remoteMessage: any) => {
      console.log('� User tapped notification:', remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Handle notification tap when app was completely closed
    (await getMessaging())()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('� User tapped notification:', remoteMessage);
          this.handleNotificationTap(remoteMessage);
        }
      });
  }

  /**
   * Show local notification for foreground messages
   */
  private showLocalNotification(remoteMessage: any): void {
    if (remoteMessage.notification) {
      Alert.alert(
        remoteMessage.notification.title || 'News Update',
        remoteMessage.notification.body || '',
        [
          { text: 'Dismiss', style: 'cancel' },
          { text: 'View', onPress: () => this.handleNotificationTap(remoteMessage) }
        ]
      );
    }
  }

  /**
   * Handle notification tap
   */
  private handleNotificationTap(remoteMessage: any): void {
    console.log('👆 User tapped notification:', remoteMessage);
    
    // Add your navigation logic here based on remoteMessage.data
    if (remoteMessage.data?.articleId) {
      console.log('📰 Navigate to article:', remoteMessage.data.articleId);
      // Navigate to specific article
    }
  }

  /**
   * Get current FCM token
   */
  async getToken(): Promise<string | null> {
    try {
      if (this.fcmToken) return this.fcmToken;
      
  const messagingMod4 = await getMessaging();
  const token = await messagingMod4().getToken();
      this.fcmToken = token;
      return token;
    } catch (error) {
      console.warn('⚠ Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * Subscribe to a topic
   */
  async subscribeToTopic(topic: string): Promise<boolean> {
    try {
  const messagingMod5 = await getMessaging();
  await messagingMod5().subscribeToTopic(topic);
      console.log(`✅ Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.warn(`⚠ Failed to subscribe to topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribeFromTopic(topic: string): Promise<boolean> {
    try {
  const messagingMod6 = await getMessaging();
  await messagingMod6().unsubscribeFromTopic(topic);
      console.log(`✅ Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      console.warn(`⚠ Failed to unsubscribe from topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Test notification status
   */
  async testNotificationStatus(): Promise<void> {
    console.log('🔍 Testing notification status...');
    console.log('📱 Initialized:', this.isInitialized);
    console.log('🪙 Has Token:', !!this.fcmToken);
    
    try {
  const messagingMod7 = await getMessaging();
  const authStatus = await (messagingMod7().hasPermission ? messagingMod7().hasPermission() : messagingMod7().requestPermission());
      console.log('🔐 Permission Status:', authStatus);
      
  const token = await this.getToken();
      console.log('📱 Current Token:', token ? token.substring(0, 20) + '...' : 'None');
      
    } catch (error) {
      console.error('❌ Status test failed:', error);
    }
  }
}

// Export singleton instance
// Do not create a singleton at module import time (prevents messaging() from
// being invoked before the default Firebase app exists). Callers should
// instantiate the service after startup and after firebaseInit has run.
export default FirebaseNotificationService;
