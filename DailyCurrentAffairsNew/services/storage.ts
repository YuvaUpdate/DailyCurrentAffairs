import AsyncStorage from '@react-native-async-storage/async-storage';
import { NewsArticle, BookmarkedArticle, User, NotificationSettings } from '../types';

const STORAGE_KEYS = {
  BOOKMARKS: 'bookmarks',
  USER_PREFERENCES: 'user_preferences',
  CACHED_NEWS: 'cached_news',
};

export class StorageService {
  // Bookmarks
  static async getBookmarks(): Promise<BookmarkedArticle[]> {
    try {
      const bookmarksJson = await AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return bookmarksJson ? JSON.parse(bookmarksJson) : [];
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return [];
    }
  }

  static async addBookmark(article: NewsArticle): Promise<void> {
    try {
      const bookmarks = await this.getBookmarks();
      const bookmarkedArticle: BookmarkedArticle = {
        ...article,
        bookmarkedAt: new Date().toISOString(),
      };
      
      // Check if already bookmarked
      const exists = bookmarks.find(b => b.id === article.id);
      if (!exists) {
        bookmarks.unshift(bookmarkedArticle);
        await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
      }
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  }

  static async removeBookmark(articleId: string): Promise<void> {
    try {
      const bookmarks = await this.getBookmarks();
      const filteredBookmarks = bookmarks.filter(b => b.id !== articleId);
      await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(filteredBookmarks));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  }

  static async isBookmarked(articleId: string): Promise<boolean> {
    try {
      const bookmarks = await this.getBookmarks();
      return bookmarks.some(b => b.id === articleId);
    } catch (error) {
      console.error('Error checking bookmark:', error);
      return false;
    }
  }

  // User Preferences
  static async getUserPreferences(): Promise<NotificationSettings> {
    try {
      const preferencesJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return preferencesJson ? JSON.parse(preferencesJson) : {
        breakingNews: true,
        dailyDigest: true,
        digestTime: '08:00',
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return {
        breakingNews: true,
        dailyDigest: true,
        digestTime: '08:00',
      };
    }
  }

  static async saveUserPreferences(preferences: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  // Cache Management
  static async getCachedNews(): Promise<NewsArticle[]> {
    try {
      const cachedNewsJson = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_NEWS);
      return cachedNewsJson ? JSON.parse(cachedNewsJson) : [];
    } catch (error) {
      console.error('Error getting cached news:', error);
      return [];
    }
  }

  static async setCachedNews(news: NewsArticle[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_NEWS, JSON.stringify(news));
    } catch (error) {
      console.error('Error setting cached news:', error);
    }
  }

  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_NEWS);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}
