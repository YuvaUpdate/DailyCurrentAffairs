const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
admin.initializeApp();

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
