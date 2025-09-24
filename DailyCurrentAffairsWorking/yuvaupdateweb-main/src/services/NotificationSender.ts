/**
 * Firebase Cloud Functions notification sender for Web Admin
 * Sends proper notifications that appear in notification tray for mobile app users
 */
export class NotificationSender {
  private static readonly FUNCTION_URL = 'https://us-central1-yuvaupdate-3762b.cloudfunctions.net/sendNotificationToTopic';
  
  // Track sent notifications to prevent duplicates
  private static sentNotifications = new Set<string>();
  private static callCounter = 0;

  /**
   * Send notification to all users via Firebase Cloud Function
   * This creates notifications that appear in the notification tray
   */
  // `options` may contain platform-specific overrides that are forwarded to
  // the FCM send function (android, apns, webpush, etc). This keeps
  // backwards compatibility with existing calls which don't provide options.
  static async sendNotificationToAllUsers(notification: {
    title: string;
    body: string;
    data?: any;
  }, options?: any): Promise<boolean> {
    try {
      this.callCounter++;
      const uniqueId = Math.random().toString(36).substr(2, 9);
      console.log(`📤 [Call #${this.callCounter}] [${uniqueId}] Sending notification to all users:`, notification);

      // Build base payload and merge any platform-specific options if provided.
      // Ensure data payload only contains string values because FCM (and
      // our Cloud Function validation) often requires `data` to be strings.
      const rawData = { ...(notification.data || {}), clientRequestId: uniqueId };
      const stringifiedData: Record<string, string> = {};
      Object.keys(rawData).forEach((k) => {
        const v = (rawData as any)[k];
        if (v === undefined || v === null) return;
        // Keep strings as-is, otherwise stringify (booleans, numbers, objects)
        if (typeof v === 'string') {
          stringifiedData[k] = v;
        } else {
          try {
            stringifiedData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
          } catch (e) {
            // Fallback to String conversion
            stringifiedData[k] = String(v);
          }
        }
      });

      const payload: any = {
        topic: 'news-updates',
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: stringifiedData,
      };

      // Merge top-level options (android, apns, webpush, etc.) so callers can
      // request custom sounds, priority or renotify behavior. We deliberately
      // do a shallow merge so existing payload structure is preserved.
      if (options && typeof options === 'object') {
        Object.assign(payload, options);
      }

      console.log(`📤 [${uniqueId}] Notification payload:`, payload);

      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ [${uniqueId}] Notification sent successfully:`, result.messageId);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ [${uniqueId}] Failed to send notification:`, response.status, response.statusText, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send notification for new article (with enhanced deduplication)
   */
  static async sendNewArticleNotification(article: any): Promise<void> {
    try {
      // Create multiple unique keys to prevent duplicates from any angle
      const headlineKey = article.headline?.substring(0, 50) || 'unknown';
      const timeKey = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-minute window
      const articleKey = `${headlineKey}_${article.category}_${timeKey}`;
      
      // Check if we've already sent notification for this article recently
      if (this.sentNotifications.has(articleKey)) {
        console.log('⏭️ Notification already sent for article in this 5-minute window:', article.headline);
        return;
      }

      // Also check against headline-only key to prevent sending for same headline
      const headlineOnlyKey = `headline_${headlineKey}`;
      const recentHeadlineKey = `${headlineOnlyKey}_${timeKey}`;
      
      if (this.sentNotifications.has(recentHeadlineKey)) {
        console.log('⏭️ Notification already sent for similar headline recently:', article.headline);
        return;
      }

      // Add multiple keys to sent notifications to prevent duplicates
      this.sentNotifications.add(articleKey);
      this.sentNotifications.add(recentHeadlineKey);

      // Clean up old entries to prevent memory growth (keep only last 100 entries)
      if (this.sentNotifications.size > 100) {
        const entries = Array.from(this.sentNotifications);
        const toRemove = entries.slice(0, this.sentNotifications.size - 80);
        toRemove.forEach(key => this.sentNotifications.delete(key));
        console.log('🧹 Cleaned up old notification cache entries');
      }

      await this.sendNotificationToAllUsers({
        title: article.headline,
        body: `${article.category}`,
        data: {
          articleId: article.id || article.docId,
          category: article.category,
          type: 'new_article',
          headline: article.headline,
          timestamp: new Date().toISOString()
        }
      });

      console.log('✅ Notification sent for new article:', article.headline);
    } catch (error) {
      console.error('❌ Failed to send notification for new article:', error);
      throw error;
    }
  }

  /**
   * Send test notification
   */
  static async sendTestNotification(): Promise<boolean> {
    const testArticle = {
      headline: `Test Notification - ${new Date().toLocaleTimeString()}`,
      category: 'test',
      id: `test_${Date.now()}`
    };

    try {
      await this.sendNewArticleNotification(testArticle);
      return true;
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      return false;
    }
  }

  /**
   * Send custom notification with title and body
   */
  // Send a custom notification. `data` becomes the message data payload and
  // `options` may include platform specific fields (android, apns, webpush).
  static async sendCustomNotification(title: string, body: string, data?: any, options?: any): Promise<boolean> {
    return await this.sendNotificationToAllUsers({
      title,
      body,
      data
    }, options);
  }

  /**
   * Get notification statistics
   */
  static getNotificationStats(): {
    totalSent: number;
    recentNotifications: number;
  } {
    return {
      totalSent: this.callCounter,
      recentNotifications: this.sentNotifications.size
    };
  }

  /**
   * Clear notification cache (for testing)
   */
  static clearNotificationCache(): void {
    this.sentNotifications.clear();
    console.log('🧹 Notification cache cleared');
  }
}
