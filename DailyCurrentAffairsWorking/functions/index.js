const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin SDK (the runtime will provide credentials)
admin.initializeApp();

// Firestore trigger: onCreate for news_articles
exports.sendNotificationOnNewArticle = functions.firestore
  .document('news_articles/{articleId}')
  .onCreate(async (snap, context) => {
    const article = snap.data();
    const payload = {
      notification: {
        title: 'New Article: ' + (article.headline || 'New Story'),
        body: (article.headline || '').slice(0, 100),
      },
      data: {
        // send article payload as stringified data for the client to consume
        article: JSON.stringify({ id: snap.id, ...article })
      }
    };

    // Send to topic 'news-updates'
    try {
      const response = await admin.messaging().sendToTopic('news-updates', payload);
      console.log('sendToTopic response:', response);
      return response;
    } catch (err) {
      console.error('Error sending FCM message:', err);
      return null;
    }
  });
