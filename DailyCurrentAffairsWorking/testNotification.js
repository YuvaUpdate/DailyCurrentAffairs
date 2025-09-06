const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to replace this with your actual service account key)
// For now, let's use the REST API approach which is simpler for testing

const FCM_SERVER_KEY = 'YOUR_FCM_SERVER_KEY'; // You need to get this from Firebase Console

async function sendTestNotification() {
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: '/topics/news-updates', // Send to the topic your app is subscribed to
        notification: {
          title: '🔔 Test Notification',
          body: 'This is a test notification from YuvaUpdate!',
          icon: 'ic_notification',
          color: '#1976d2'
        },
        data: {
          type: 'test',
          timestamp: Date.now().toString()
        }
      })
    });

    const result = await response.json();
    console.log('Notification sent:', result);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Uncomment and run this when you have the FCM server key
// sendTestNotification();

console.log(`
📋 To test notifications:

1. Get your FCM Server Key from Firebase Console:
   - Go to Firebase Console > Project Settings > Cloud Messaging
   - Copy the "Server key"

2. Replace FCM_SERVER_KEY above with your actual key

3. Run: node testNotification.js

Your app is subscribed to topic: news-updates
Your FCM token starts with: dZi-T-lBR7Srz7cnM2dK...
`);
