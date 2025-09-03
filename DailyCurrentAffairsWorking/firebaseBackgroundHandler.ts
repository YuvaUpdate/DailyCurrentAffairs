import messaging from '@react-native-firebase/messaging';
import { isFirebaseReady } from './firebaseInit';

/**
 * Background message handler for Firebase messaging
 * This runs when the app is in background or completely closed
 */

// Wait for Firebase to be initialized before setting up background handler
const setupBackgroundHandler = () => {
  try {
    if (!isFirebaseReady()) {
      console.log('⚠ Firebase not ready for background handler, will retry...');
      setTimeout(setupBackgroundHandler, 1000);
      return;
    }

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📱 Background message received:', {
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: remoteMessage.data,
        messageId: remoteMessage.messageId,
        timestamp: new Date().toISOString()
      });

      // Process the background message
      try {
        // You can add custom background processing logic here
        // For example: save to local storage, update badge count, etc.
        
        if (remoteMessage.data?.articleId) {
          console.log('📰 Background: New article available:', remoteMessage.data.articleId);
          // Could save article ID for later processing
        }

        if (remoteMessage.data?.type === 'breaking-news') {
          console.log('🚨 Background: Breaking news notification');
          // Handle breaking news differently
        }

      } catch (error) {
        console.error('❌ Error processing background message:', error);
      }
    });

    console.log('✅ Firebase background message handler registered');
    
  } catch (error) {
    console.error('❌ Failed to setup background message handler:', error);
  }
};

// Setup immediately if Firebase is ready, otherwise wait
setupBackgroundHandler();