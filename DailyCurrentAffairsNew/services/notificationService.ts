import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationSettings } from '../types';
import { StorageService } from './storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions denied');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // Create channel for breaking news
        await Notifications.setNotificationChannelAsync('breaking', {
          name: 'Breaking News',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF0000',
          sound: 'default',
        });

        // Create channel for daily digest
        await Notifications.setNotificationChannelAsync('digest', {
          name: 'Daily Digest',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#0000FF',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async sendBreakingNewsNotification(title: string, body: string, articleId: string): Promise<void> {
    try {
      const preferences = await StorageService.getUserPreferences();
      
      if (!preferences.breakingNews) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Breaking News',
          body: `${title}\n${body}`,
          data: { 
            articleId,
            type: 'breaking',
          },
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending breaking news notification:', error);
    }
  }

  async scheduleDailyDigest(): Promise<void> {
    try {
      const preferences = await StorageService.getUserPreferences();
      
      if (!preferences.dailyDigest) {
        return;
      }

      // Cancel existing daily digest notifications
      await this.cancelDailyDigest();

      const [hour, minute] = preferences.digestTime.split(':').map(Number);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📰 Daily News Digest',
          body: 'Your daily news summary is ready. Tap to read the top stories.',
          data: { 
            type: 'digest',
          },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        } as any, // Type assertion for compatibility
      });
    } catch (error) {
      console.error('Error scheduling daily digest:', error);
    }
  }

  async cancelDailyDigest(): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === 'digest') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      console.error('Error canceling daily digest:', error);
    }
  }

  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      await StorageService.saveUserPreferences(settings);
      
      if (settings.dailyDigest) {
        await this.scheduleDailyDigest();
      } else {
        await this.cancelDailyDigest();
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    return await StorageService.getUserPreferences();
  }

  // Get push token for backend notifications (if using a backend service)
  async getPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with your actual project ID
      });
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Handle notification responses
  addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Handle notifications received while app is in foreground
  addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }
}

export default NotificationService.getInstance();
