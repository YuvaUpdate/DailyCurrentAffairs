/**
 * Simple notification sender using Firebase Cloud Functions
 */
export class NotificationSender {
  private static readonly FUNCTION_URL = 'https://us-central1-soullink-96d4b.cloudfunctions.net/sendNotificationToTopic';

  /**
   * Send notification to all users via Firebase Cloud Function
   */
  static async sendNotificationToAllUsers(notification: {
    title: string;
    body: string;
    data?: any;
  }): Promise<boolean> {
    try {
      console.log('📤 Sending notification to all users:', notification);

      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: 'news-updates',
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: notification.data || {},
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Notification sent successfully:', result.messageId);
        return true;
      } else {
        console.error('❌ Failed to send notification:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return false;
    }
  }

  /**
   * Send local notification for new article
   */
  static async sendNewArticleNotification(article: any): Promise<void> {
    try {
      // Send via Firebase Cloud Function
      await this.sendNotificationToAllUsers({
        title: article.headline || 'News Update',
        body: article.summary || 'New article available',
        data: {
          articleId: article.id,
          type: 'news',
          timestamp: new Date().toISOString(),
        },
      });

      console.log('📰 New article notification sent:', article.headline);
    } catch (error) {
      console.error('❌ Error sending article notification:', error);
    }
  }
}

export const notificationSender = NotificationSender;
