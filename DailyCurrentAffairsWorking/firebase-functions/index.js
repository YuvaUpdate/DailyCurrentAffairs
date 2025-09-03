// Firebase Cloud Function for sending notifications
// Deploy this to Firebase Functions
// Works with Firebase Cloud Messaging API (V1) - your current setup

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Cloud Function to send notifications to a topic
 * Triggered via HTTP POST request from your admin panel
 * Compatible with Firebase Cloud Messaging API (V1)
 */
exports.sendNotificationToTopic = functions.https.onRequest(async (req, res) => {
  // Enable CORS for your domain
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { topic, notification, data } = req.body;

    if (!topic || !notification) {
      res.status(400).json({ 
        error: 'Missing required fields: topic and notification' 
      });
      return;
    }

    console.log(`📤 Sending notification to topic: ${topic}`, notification);

    // Create message using Firebase Cloud Messaging API (V1) format
    const message = {
      topic: topic,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'news_channel',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          icon: 'ic_launcher'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: '/assets/icon.png',
          badge: '/assets/icon.png'
        }
      }
    };

    // Send message using Admin SDK (automatically uses V1 API)
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);

    res.status(200).json({
      success: true,
      messageId: response,
      topic: topic,
      notification: notification,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      details: error.message,
      code: error.code || 'unknown'
    });
  }
});

/**
 * Firestore trigger to automatically send notifications when articles are added
 * This runs automatically when a new document is added to the 'news' collection
 * Uses Firebase Cloud Messaging API (V1)
 */
exports.sendNotificationOnNewArticle = functions.firestore
  .document('news/{articleId}')
  .onCreate(async (snap, context) => {
    try {
      const article = snap.data();
      const articleId = context.params.articleId;

      console.log(`📰 New article detected: ${article.headline}`);

      // Create message for Firebase Cloud Messaging API (V1)
      const message = {
        topic: 'news-updates',
        notification: {
          title: 'New Article Published! 📰',
          body: article.headline
        },
        data: {
          articleId: articleId,
          category: article.category || 'news',
          type: 'new_article',
          timestamp: new Date().toISOString()
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'news_channel',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            icon: 'ic_launcher',
            color: '#FF6B35'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              alert: {
                title: 'New Article Published! 📰',
                body: article.headline
              }
            }
          }
        },
        webpush: {
          notification: {
            title: 'New Article Published! 📰',
            body: article.headline,
            icon: '/assets/icon.png',
            badge: '/assets/icon.png',
            requireInteraction: false
          }
        }
      };

      // Send using Admin SDK with V1 API
      const response = await admin.messaging().send(message);
      console.log('✅ Auto-notification sent for new article:', response);

      return {
        success: true,
        messageId: response,
        articleId: articleId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error sending auto-notification:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send notification', error.message);
    }
  });
