const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin with new project
admin.initializeApp({
  projectId: "yuvaupdate-3762b",
  storageBucket: "yuvaupdate-3762b.firebasestorage.app"
});

// Set global options for cost control
setGlobalOptions({maxInstances: 10});

/**
 * Send notification to a specific topic
 * POST request with body:
 * {
 *   "topic": "news-updates",
 *   "notification": {
 *     "title": "Breaking News",
 *     "body": "Check out this important update"
 *   },
 *   "data": {
 *     "articleId": "123",
 *     "type": "news"
 *   }
 * }
 */
exports.sendNotificationToTopic = onRequest({cors: true}, async (req, res) => {
  logger.info("📱 sendNotificationToTopic called", req.body);

  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const {topic, notification, data} = req.body;

    if (!topic || !notification) {
      res.status(400).json({
        error: "Missing required fields: topic and notification",
      });
      return;
    }

    // Prepare the message
    const message = {
      topic: topic,
      notification: {
        title: notification.title || "News Update",
        body: notification.body || "",
      },
      data: data || {},
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "news-notifications",
        },
      },
    };

    logger.info("🚀 Sending message:", message);

    // Send the message
    const response = await admin.messaging().send(message);

    logger.info("✅ Notification sent successfully:", response);

    res.status(200).json({
      success: true,
      messageId: response,
      topic: topic,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("❌ Error sending notification:", error);
    res.status(500).json({
      error: "Failed to send notification",
      details: error.message,
    });
  }
});

/**
 * Send notification to specific device token
 */
exports.sendNotificationToDevice = onRequest({cors: true}, async (req, res) => {
  logger.info("📱 sendNotificationToDevice called", req.body);

  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const {token, notification, data} = req.body;

    if (!token || !notification) {
      res.status(400).json({
        error: "Missing required fields: token and notification",
      });
      return;
    }

    const message = {
      token: token,
      notification: {
        title: notification.title || "News Update",
        body: notification.body || "",
      },
      data: data || {},
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "news-notifications",
        },
      },
    };

    const response = await admin.messaging().send(message);

    logger.info("✅ Device notification sent successfully:", response);

    res.status(200).json({
      success: true,
      messageId: response,
      token: token.substring(0, 20) + "...",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("❌ Error sending device notification:", error);
    res.status(500).json({
      error: "Failed to send notification",
      details: error.message,
    });
  }
});

/**
 * sendDirectPushNotification
 * Uses Firebase Admin SDK to send push notifications directly to FCM tokens
 * Body: { title: string, articleId?: string, category?: string }
 */
exports.sendDirectPushNotification = onRequest(
    {cors: true, timeoutSeconds: 60},
    async (req, res) => {
      if (req.method !== "POST") {
        res.status(405).json({error: "POST only"});
        return;
      }
      try {
        const {title, articleId, category} = req.body || {};
        if (!title) {
          res.status(400).json({error: "Missing title"});
          return;
        }

        // Get FCM tokens
        const fcmSnap = await admin.firestore().collection("fcmTokens").get();

        const fcmTokens = [];
        fcmSnap.forEach((d) => {
          const token = d.get("token");
          if (token) fcmTokens.push(token);
        });

        if (fcmTokens.length === 0) {
          res.json({sent: 0, message: "No FCM tokens stored"});
          return;
        }

        // Prepare the notification payload for background notifications
        const payload = {
          notification: {
            title: title,
            body: category || "New article available",
          },
          data: {
            articleId: articleId || "",
            category: category || "news",
            type: "new_article",
          },
          android: {
            priority: "high",
            notification: {
              icon: "ic_notification",
              color: "#ffffff",
              sound: "default",
              channelId: "news-notifications",
              priority: "high",
              defaultSound: true,
              defaultVibratePattern: true,
              defaultLightSettings: true,
            },
          },
        };

        // Send to all FCM tokens
        const results = [];
        for (let i = 0; i < fcmTokens.length; i += 500) {
          const batch = fcmTokens.slice(i, i + 500);
          try {
            const response = await admin.messaging().sendMulticast({
              tokens: batch,
              ...payload,
            });
            results.push(response);
          } catch (error) {
            logger.error("FCM send error:", error);
            results.push({error: error.message});
          }
        }

        res.json({
          sent: fcmTokens.length,
          batches: Math.ceil(fcmTokens.length / 500),
          results: results,
        });
      } catch (e) {
        logger.error("sendDirectPushNotification error", e);
        res.status(500).json({error: e.message || "Internal error"});
      }
    },
);

/**
 * sendExpoArticlePush
 * Body: { title: string, articleId?: string, category?: string }
 * Reads all docs in `expoPushTokens` and sends Expo push messages.
 */
exports.sendExpoArticlePush = onRequest(
    {cors: true, timeoutSeconds: 60},
    async (req, res) => {
      if (req.method !== "POST") {
        res.status(405).json({error: "POST only"});
        return;
      }
      try {
        const {title, articleId, category} = req.body || {};
        if (!title) {
          res.status(400).json({error: "Missing title"});
          return;
        }

        const snap = await admin.firestore()
            .collection("expoPushTokens").get();
        const tokens = [];
        snap.forEach((d) => {
          const t = d.get("token");
          if (t) tokens.push(t);
        });
        if (tokens.length === 0) {
          res.json({sent: 0, message: "No tokens stored"});
          return;
        }

        // Batch tokens (<=100 per request)
        const batches = [];
        for (let i = 0; i < tokens.length; i += 100) {
          batches.push(tokens.slice(i, i + 100));
        }

        const results = [];
        for (const batch of batches) {
          const messages = batch.map((to) => ({
            to,
            title,
            body: category || "",
            data: {
              articleId: articleId || "",
              category: category || "news",
              type: "new_article",
            },
            sound: "default",
          }));
          const resp = await fetch(
              "https://exp.host/--/api/v2/push/send",
              {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(messages),
              },
          );
          const json = await resp.json();
          results.push(json);
        }

        res.json({
          sent: tokens.length,
          batches: batches.length,
          results,
        });
      } catch (e) {
        logger.error("sendExpoArticlePush error", e);
        res.status(500).json({error: e.message || "Internal error"});
      }
    },
);

/**
 * Automatically send notifications when a new article is created
 * Firestore trigger: news_articles collection
 * DISABLED: Notifications are now handled by AdminPanel to prevent duplicates
 */
// exports.onNewArticleCreated = onDocumentCreated(
//     "news_articles/{articleId}",
//     async (event) => {
//       logger.info("🔥 New article created, sending notifications");
//       
//       try {
//         const article = event.data.data();
//         if (!article) {
//           logger.warn("No article data found");
//           return;
//         }

//         const {headline, category, id} = article;
//         
//         // Send FCM notification to topic
//         const message = {
//           topic: "news-updates",
//           notification: {
//             title: headline || "New Article",
//             body: `New ${category || "News"} article available`,
//           },
//           data: {
//             articleId: id || event.params.articleId,
//             category: category || "news",
//             type: "new_article",
//             timestamp: new Date().toISOString(),
//           },
//           android: {
//             notification: {
//               icon: "ic_notification",
//               color: "#2196F3",
//               sound: "default",
//               channelId: "news_updates",
//             },
//           },
//         };

//         const result = await admin.messaging().send(message);
//         logger.info("✅ Auto notification sent:", result);

//       } catch (error) {
//         logger.error("❌ Error sending auto notification:", error);
//       }
//     }
// );

/**
 * Health check endpoint
 */
exports.healthCheck = onRequest({cors: true}, (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    project: "yuvaupdate-3762b",
    functions: [
      "sendNotificationToTopic",
      "sendNotificationToDevice", 
      "sendDirectPushNotification",
      "sendExpoArticlePush", 
      "createAdminUser",
      "updateUserRole",
      "fetchNews",
      "healthCheck"
    ]
  });
});

/**
 * Create or update admin user
 * POST request with body:
 * {
 *   "email": "admin@yuvaupdate.com",
 *   "password": "securePassword",
 *   "displayName": "YuvaUpdate Admin"
 * }
 */
exports.createAdminUser = onRequest({cors: true}, async (req, res) => {
  logger.info("👤 createAdminUser called", {email: req.body?.email});

  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const {email, password, displayName} = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: "Missing required fields: email and password",
      });
      return;
    }

    // Check if this is an admin email
    const adminEmails = ["admin@yuvaupdate.com", "admin@dailycurrentaffairs.com"];
    if (!adminEmails.includes(email.toLowerCase())) {
      res.status(403).json({
        error: "Only designated admin emails can be created as admin users",
      });
      return;
    }

    let userRecord;
    try {
      // Try to get existing user
      userRecord = await admin.auth().getUserByEmail(email);
      logger.info("User already exists, updating...", userRecord.uid);
      
      // Update existing user
      await admin.auth().updateUser(userRecord.uid, {
        password: password,
        displayName: displayName || "YuvaUpdate Admin",
        emailVerified: true
      });

      logger.info("✅ Admin user updated in Firebase Auth");
    } catch (authError) {
      if (authError.code === "auth/user-not-found") {
        // Create new user
        userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: displayName || "YuvaUpdate Admin",
          emailVerified: true
        });
        logger.info("✅ Admin user created in Firebase Auth", userRecord.uid);
      } else {
        throw authError;
      }
    }

    // Create/update user profile in Firestore
    const adminProfile = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || "YuvaUpdate Admin",
      joinedAt: new Date(),
      isVerified: true,
      role: "admin",
      isAdmin: true,
      bio: "YuvaUpdate Administrator",
      photoURL: userRecord.photoURL || null
    };

    await admin.firestore().collection("users").doc(userRecord.uid).set(adminProfile, {merge: true});
    logger.info("✅ Admin profile created/updated in Firestore");

    res.status(200).json({
      success: true,
      message: "Admin user created/updated successfully",
      uid: userRecord.uid,
      email: userRecord.email,
      role: "admin"
    });

  } catch (error) {
    logger.error("❌ Error creating admin user:", error);
    res.status(500).json({
      error: "Failed to create admin user",
      details: error.message
    });
  }
});

/**
 * Update user role (admin only)
 * POST request with body:
 * {
 *   "targetEmail": "user@example.com",
 *   "role": "admin" | "user",
 *   "adminEmail": "admin@yuvaupdate.com"
 * }
 */
exports.updateUserRole = onRequest({cors: true}, async (req, res) => {
  logger.info("🔧 updateUserRole called", {targetEmail: req.body?.targetEmail, role: req.body?.role});

  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const {targetEmail, role, adminEmail} = req.body;

    if (!targetEmail || !role || !adminEmail) {
      res.status(400).json({
        error: "Missing required fields: targetEmail, role, adminEmail",
      });
      return;
    }

    // Verify admin credentials
    const adminEmails = ["admin@yuvaupdate.com", "admin@dailycurrentaffairs.com"];
    if (!adminEmails.includes(adminEmail.toLowerCase())) {
      res.status(403).json({
        error: "Only admin users can update user roles",
      });
      return;
    }

    // Validate role
    if (!["admin", "user"].includes(role)) {
      res.status(400).json({
        error: "Invalid role. Must be 'admin' or 'user'",
      });
      return;
    }

    // Get target user
    const targetUser = await admin.auth().getUserByEmail(targetEmail);
    
    // Update user profile in Firestore
    const updates = {
      role: role,
      isAdmin: role === "admin",
      updatedAt: new Date(),
      updatedBy: adminEmail
    };

    await admin.firestore().collection("users").doc(targetUser.uid).update(updates);
    logger.info("✅ User role updated successfully");

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      uid: targetUser.uid,
      email: targetUser.email,
      newRole: role
    });

  } catch (error) {
    logger.error("❌ Error updating user role:", error);
    
    if (error.code === "auth/user-not-found") {
      res.status(404).json({
        error: "User not found",
        details: error.message
      });
    } else {
      res.status(500).json({
        error: "Failed to update user role",
        details: error.message
      });
    }
  }
});

/**
 * Fetch news from NewsAPI (proxy to avoid CORS issues)
 * GET request with query parameters:
 * ?country=us&category=technology&pageSize=20
 */
exports.fetchNews = onRequest({cors: true}, async (req, res) => {
  logger.info("📰 fetchNews called", req.query);

  if (req.method !== "GET") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const {country = 'us', category, pageSize = '20'} = req.query;
    const NEWS_API_KEY = '376e8e61564d427cafc0129a091e41a7';
    
    // Build NewsAPI URL
    let url = `https://newsapi.org/v2/top-headlines?country=${country}&pageSize=${pageSize}`;
    if (category && category !== 'all') {
      url += `&category=${category}`;
    }
    url += `&apiKey=${NEWS_API_KEY}`;

    logger.info("🔗 Fetching from NewsAPI:", url.replace(NEWS_API_KEY, '[HIDDEN]'));

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(data.message || 'NewsAPI request failed');
    }

    // Transform articles
    const articles = data.articles.map((article, index) => ({
      id: Date.now() + index,
      headline: article.title,
      description: article.description || 'No description available',
      image: article.urlToImage || `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(category || 'News')}`,
      category: category || 'General',
      readTime: calculateReadTime(article.description || ''),
      timestamp: formatTimestamp(article.publishedAt),
      sourceUrl: article.url,
      source: article.source.name
    }));

    res.status(200).json({
      success: true,
      articles: articles,
      totalResults: data.totalResults
    });

  } catch (error) {
    logger.error("❌ Error fetching news:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch news"
    });
  }
});

/**
 * Search news from NewsAPI (proxy to avoid CORS issues)
 * GET request with query parameters:
 * ?q=search+term&pageSize=20&sortBy=publishedAt
 */
exports.searchNews = onRequest({cors: true}, async (req, res) => {
  logger.info("🔍 searchNews called", req.query);

  if (req.method !== "GET") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const {q, pageSize = '20', sortBy = 'publishedAt'} = req.query;
    
    if (!q) {
      res.status(400).json({
        success: false,
        error: "Missing search query parameter 'q'"
      });
      return;
    }

    const NEWS_API_KEY = '376e8e61564d427cafc0129a091e41a7';
    
    // Build NewsAPI search URL
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&pageSize=${pageSize}&sortBy=${sortBy}&apiKey=${NEWS_API_KEY}`;

    logger.info("🔗 Searching NewsAPI:", url.replace(NEWS_API_KEY, '[HIDDEN]'));

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(data.message || 'NewsAPI search failed');
    }

    // Transform articles
    const articles = data.articles.map((article, index) => ({
      id: Date.now() + index,
      headline: article.title,
      description: article.description || 'No description available',
      image: article.urlToImage || `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(q)}`,
      category: 'Search',
      readTime: calculateReadTime(article.description || ''),
      timestamp: formatTimestamp(article.publishedAt),
      sourceUrl: article.url,
      source: article.source.name
    }));

    res.status(200).json({
      success: true,
      articles: articles,
      totalResults: data.totalResults
    });

  } catch (error) {
    logger.error("❌ Error searching news:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to search news"
    });
  }
});

// Helper functions
function calculateReadTime(content) {
  const wordsPerMinute = 200;
  const wordCount = content.split(' ').length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

function formatTimestamp(publishedAt) {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffInMinutes = Math.floor((now - published) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
}
