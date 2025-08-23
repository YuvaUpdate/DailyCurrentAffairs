import { Alert } from 'react-native';

export class NotificationService {
  private static instance: NotificationService;
  private subscribers: ((article: any) => void)[] = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions
  async requestPermission(): Promise<boolean> {
    try {
      // For web/expo, we'll use browser notifications
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Send local notification for new articles
  async sendNewArticleNotification(article: any) {
    try {
      // Check if notifications are supported and permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('New Article Posted! 📰', {
          body: article.headline,
          icon: '/assets/icon.png', // Make sure you have this icon
          badge: '/assets/icon.png',
          tag: 'new-article',
          requireInteraction: false,
          silent: false,
        });

        // Auto close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        // Handle notification click
        notification.onclick = () => {
          // Bring app to foreground and close notification
          window.focus();
          notification.close();
          
          // Notify subscribers about the article click
          this.notifySubscribers(article);
        };
      } else {
        // Fallback to alert if notifications not available
        Alert.alert(
          '📰 New Article Posted!',
          article.headline,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Read Now', onPress: () => this.notifySubscribers(article) }
          ]
        );
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Subscribe to notification events
  subscribe(callback: (article: any) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  // Notify all subscribers
  private notifySubscribers(article: any) {
    this.subscribers.forEach(callback => callback(article));
  }

  // Initialize notifications
  async initialize() {
    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      console.log('✅ Notification permissions granted');
    } else {
      console.log('❌ Notification permissions denied');
    }
    return hasPermission;
  }
}

export const notificationService = NotificationService.getInstance();
