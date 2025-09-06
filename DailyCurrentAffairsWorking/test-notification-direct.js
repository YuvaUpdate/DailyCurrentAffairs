// Test notification sender - Direct Firebase Admin approach
// This can be used for testing without cloud functions

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = {
  // You'll need to download the service account key from Firebase Console
  // Go to Project Settings → Service Accounts → Generate Private Key
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'yuvaupdate-3762b'
});

/**
 * Send test notification directly using Firebase Admin SDK
 */
async function sendTestNotification() {
  try {
    const message = {
      topic: 'news-updates',
      notification: {
        title: '🔔 Test Notification',
        body: 'Firebase messaging is working!'
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#2196F3',
          sound: 'default',
          channelId: 'news_updates'
        }
      }
    };

    const result = await admin.messaging().send(message);
    console.log('✅ Test notification sent successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    throw error;
  }
}

/**
 * Send notification for new article
 */
async function sendArticleNotification(article) {
  try {
    const message = {
      topic: 'news-updates',
      notification: {
        title: article.headline || 'New Article',
        body: `New ${article.category || 'News'} article available`
      },
      data: {
        articleId: article.id || '',
        category: article.category || 'news',
        type: 'new_article',
        timestamp: new Date().toISOString()
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#2196F3',
          sound: 'default',
          channelId: 'news_updates'
        }
      }
    };

    const result = await admin.messaging().send(message);
    console.log('✅ Article notification sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending article notification:', error);
    throw error;
  }
}

module.exports = {
  sendTestNotification,
  sendArticleNotification
};

// If running directly
if (require.main === module) {
  sendTestNotification()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
