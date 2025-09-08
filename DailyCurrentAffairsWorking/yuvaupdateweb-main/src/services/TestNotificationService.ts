import { NotificationSender } from './NotificationSender';

/**
 * Test Notification Service for Web Admin
 * Provides testing capabilities for the notification system
 */
export class TestNotificationService {
  
  /**
   * Send a test notification to verify the system is working
   */
  static async sendTestNotification(): Promise<boolean> {
    try {
      console.log('🧪 Sending test notification from web admin...');
      
      const testArticle = {
        headline: `Web Admin Test - ${new Date().toLocaleTimeString()}`,
        category: 'test',
        id: `web_test_${Date.now()}`
      };

      await NotificationSender.sendNewArticleNotification(testArticle);
      console.log('✅ Test notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      return false;
    }
  }

  /**
   * Send a custom test notification with specific title and body
   */
  static async sendCustomTestNotification(title: string, body: string): Promise<boolean> {
    try {
      console.log('🧪 Sending custom test notification:', { title, body });
      
      const success = await NotificationSender.sendCustomNotification(title, body, {
        type: 'custom_test',
        timestamp: new Date().toISOString(),
        source: 'web_admin'
      });

      if (success) {
        console.log('✅ Custom test notification sent successfully');
      } else {
        console.error('❌ Custom test notification failed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Custom test notification failed:', error);
      return false;
    }
  }

  /**
   * Test notification system status
   */
  static async checkNotificationSystemStatus(): Promise<{
    status: 'working' | 'error';
    message: string;
    stats: any;
  }> {
    try {
      console.log('🔍 Checking notification system status...');
      
      // Get notification statistics
      const stats = NotificationSender.getNotificationStats();
      
      // Try to send a minimal test notification
      const testResult = await NotificationSender.sendCustomNotification(
        'System Check',
        'Web admin notification system test',
        { type: 'system_check', timestamp: new Date().toISOString() }
      );

      if (testResult) {
        const result = {
          status: 'working' as const,
          message: 'Notification system is operational',
          stats: {
            ...stats,
            lastCheck: new Date().toISOString(),
            functionUrl: 'https://us-central1-yuvaupdate-3762b.cloudfunctions.net/sendNotificationToTopic'
          }
        };
        
        console.log('✅ Notification system check passed:', result);
        return result;
      } else {
        const result = {
          status: 'error' as const,
          message: 'Notification system test failed',
          stats: {
            ...stats,
            lastCheck: new Date().toISOString(),
            error: 'Test notification send failed'
          }
        };
        
        console.error('❌ Notification system check failed:', result);
        return result;
      }
    } catch (error: any) {
      const result = {
        status: 'error' as const,
        message: `Notification system error: ${error.message}`,
        stats: {
          lastCheck: new Date().toISOString(),
          error: error.message
        }
      };
      
      console.error('❌ Notification system check error:', error);
      return result;
    }
  }

  /**
   * Send breaking news notification
   */
  static async sendBreakingNewsNotification(headline: string): Promise<boolean> {
    try {
      console.log('🚨 Sending breaking news notification:', headline);
      
      const success = await NotificationSender.sendCustomNotification(
        '🚨 BREAKING NEWS',
        headline,
        {
          type: 'breaking_news',
          priority: 'high',
          timestamp: new Date().toISOString(),
          source: 'web_admin'
        }
      );

      if (success) {
        console.log('✅ Breaking news notification sent successfully');
      } else {
        console.error('❌ Breaking news notification failed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Breaking news notification failed:', error);
      return false;
    }
  }

  /**
   * Send bulk notification for multiple articles
   */
  static async sendBulkNotification(articleCount: number, category?: string): Promise<boolean> {
    try {
      const categoryText = category ? ` in ${category}` : '';
      const title = `📚 ${articleCount} New Articles`;
      const body = `${articleCount} new articles have been published${categoryText}. Check them out now!`;
      
      console.log('📚 Sending bulk notification:', { title, body });
      
      const success = await NotificationSender.sendCustomNotification(title, body, {
        type: 'bulk_articles',
        articleCount,
        category: category || 'all',
        timestamp: new Date().toISOString(),
        source: 'web_admin'
      });

      if (success) {
        console.log('✅ Bulk notification sent successfully');
      } else {
        console.error('❌ Bulk notification failed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Bulk notification failed:', error);
      return false;
    }
  }

  /**
   * Clear notification cache for testing
   */
  static clearNotificationCache(): void {
    NotificationSender.clearNotificationCache();
    console.log('🧹 Notification cache cleared from web admin');
  }
}
