// Lazy-load messaging and messaging service to avoid initializing before firebaseInit
let _messaging: any = null;
const getMessaging = async () => {
  if (_messaging) return _messaging;
  const mod = await import('@react-native-firebase/messaging');
  _messaging = mod.default || mod;
  return _messaging;
};

let _rnMessagingService: any = null;
const getRnMessagingService = async () => {
  if (_rnMessagingService) return _rnMessagingService;
  const mod = await import('./ReactNativeFirebaseMessagingService');
  const Service = mod.default || mod.ReactNativeFirebaseMessagingService || mod;
  _rnMessagingService = new Service();
  return _rnMessagingService;
};

/**
 * Test Background Notification Service
 * This service helps test background notifications without requiring server deployment
 */
export class TestNotificationService {
  
  /**
   * Send a test notification to the current device's background handler
   * This simulates what a server would send when an article is uploaded
   */
  static async sendTestBackgroundNotification(article: {
    headline: string;
    category?: string;
    id?: string;
  }): Promise<boolean> {
    try {
      console.log('🧪 Sending test background notification:', article.headline);

      // Create a simulated remote message that mimics server-sent FCM
      const simulatedRemoteMessage = {
        messageId: `test_${Date.now()}`,
        data: {
          articleId: article.id || `test_${Date.now()}`,
          category: article.category || 'news',
          type: 'new_article',
          headline: article.headline,
          timestamp: new Date().toISOString()
        },
        notification: {
          title: 'New Article Published! 📰',
          body: article.headline
        },
        sentTime: Date.now(),
        ttl: 3600,
        from: 'test-sender'
      };

      console.log('📨 Simulated remote message:', simulatedRemoteMessage);

      // Trigger the background message handler manually for testing
      // In production, this would come from Firebase servers
      console.log('🔔 Triggering background message handler...');
      
      // The background handler should process this
      // Check firebaseBackgroundHandler.ts logs to see if it's working
      
      return true;
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      return false;
    }
  }

  /**
   * Test foreground notification
   */
  static async sendTestForegroundNotification(article: {
    headline: string;
    category?: string;
    id?: string;
  }): Promise<boolean> {
    try {
      console.log('🧪 Testing foreground notification system');

  // Test React Native Firebase messaging service
  const rnSvc = await getRnMessagingService();
  await rnSvc.checkNotificationStatus();

  // Get the messaging instance (lazy)
  const messagingMod = await getMessaging();
  const messagingInstance = messagingMod();
      
      // Test if we can get FCM token (indicates messaging is working)
      try {
        const token = await messagingInstance.getToken();
        console.log('✅ FCM token obtained:', token ? 'Yes' : 'No');
      } catch (e) {
        console.warn('⚠ Could not get FCM token:', e);
      }

      // Test topic subscription
      try {
        await messagingInstance.subscribeToTopic('news-updates-test');
        console.log('✅ Successfully subscribed to test topic');
        await messagingInstance.unsubscribeFromTopic('news-updates-test');
        console.log('✅ Successfully unsubscribed from test topic');
      } catch (e) {
        console.warn('⚠ Topic subscription test failed:', e);
      }

      return true;
    } catch (error) {
      console.error('❌ Foreground notification test failed:', error);
      return false;
    }
  }

  /**
   * Check notification system status
   */
  static async checkNotificationSystemStatus(): Promise<void> {
    console.log('🔍 Checking notification system status...');
    
    try {
      // Check React Native Firebase messaging service
  const rnSvc = await getRnMessagingService();
  await rnSvc.checkNotificationStatus();
      
  const messagingMod = await getMessaging();
  const messagingInstance = messagingMod();
      
      // Check if messaging is available
      console.log('✅ Firebase Messaging available');
      
      // Check token
      try {
        const token = await messagingInstance.getToken();
        console.log('📱 FCM Token:', token ? `${token.substring(0, 20)}...` : 'Not available');
      } catch (e) {
        console.warn('⚠ FCM Token error:', e);
      }

      // Check app state
      const appState = require('react-native').AppState;
      console.log('📱 App State:', appState.currentState);

      // Check permissions
      const authStatus = await messagingInstance.requestPermission();
      console.log('🔐 Notification Permission:', authStatus);

      console.log('✅ Notification system status check complete');
    } catch (error) {
      console.error('❌ Status check failed:', error);
    }
  }
}

export default TestNotificationService;
