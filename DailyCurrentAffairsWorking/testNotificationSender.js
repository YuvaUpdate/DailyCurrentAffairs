/**
 * Test Notification Sender for YuvaUpdate
 * 
 * This script will send a test notification to your app.
 * You need to get your Firebase Server Key from Firebase Console.
 */

// Your Firebase project details
const PROJECT_ID = 'soullink-96d4b';
const TOPIC = 'news-updates';

// You need to get this from Firebase Console > Project Settings > Cloud Messaging > Server Key
const FCM_SERVER_KEY = 'YOUR_FIREBASE_SERVER_KEY_HERE';

async function sendTestNotification() {
  console.log('🔔 Sending test notification...');
  
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: `/topics/${TOPIC}`,
        notification: {
          title: '📰 YuvaUpdate Test',
          body: 'This is a test notification! If you see this, notifications are working! 🎉',
          icon: 'ic_notification',
          color: '#1976d2',
          sound: 'default'
        },
        data: {
          type: 'test_notification',
          timestamp: Date.now().toString(),
          category: 'test'
        },
        android: {
          priority: 'high',
          notification: {
            channel_id: 'news_notifications',
            priority: 'high'
          }
        }
      })
    });

    const result = await response.json();
    
    if (result.success === 1) {
      console.log('✅ Test notification sent successfully!');
      console.log('📱 Check your phone now!');
    } else {
      console.log('❌ Failed to send notification:', result);
    }
    
    return result;
  } catch (error) {
    console.error('💥 Error sending notification:', error);
  }
}

// Instructions
console.log(`
📋 HOW TO TEST NOTIFICATIONS:

1. Get your Firebase Server Key:
   🌐 Go to: https://console.firebase.google.com/project/${PROJECT_ID}/settings/cloudmessaging
   📋 Copy the "Server key" (legacy)

2. Replace FCM_SERVER_KEY in this file with your actual key

3. Run this script:
   📱 node testNotificationSender.js

4. Check your phone for the notification!

📊 Current Settings:
- Project: ${PROJECT_ID}
- Topic: ${TOPIC}
- Your app should be subscribed to this topic
`);

// Uncomment this line after adding your FCM server key
// sendTestNotification();

module.exports = { sendTestNotification };
