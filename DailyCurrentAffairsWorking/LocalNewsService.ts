import AsyncStorage from '@react-native-async-storage/async-storage';
import { NewsArticle } from './types';

export class LocalNewsService {
  private storageKey = 'yuva_update_articles';
  private categoriesKey = 'yuva_update_categories';
  private lastIdKey = 'yuva_update_last_id';

  // Generate unique ID
  private async generateId(): Promise<number> {
    try {
      const lastId = await AsyncStorage.getItem(this.lastIdKey);
      const newId = lastId ? parseInt(lastId) + 1 : 1;
      await AsyncStorage.setItem(this.lastIdKey, newId.toString());
      return newId;
    } catch (error) {
      return Date.now(); // Fallback to timestamp
    }
  }

  // Add a new article
  async addArticle(article: Omit<NewsArticle, 'id' | 'timestamp'>): Promise<string> {
    try {
      const articles = await this.getArticles();
      const newId = await this.generateId();
      
      const newArticle: NewsArticle = {
        ...article,
        id: newId,
        timestamp: new Date().toLocaleDateString()
      };

      const updatedArticles = [newArticle, ...articles];
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(updatedArticles));
      
      // Update categories
      await this.updateCategories(article.category);
      
      // Simulate real-time update
      this.notifySubscribers(updatedArticles);
      
      return newId.toString();
    } catch (error) {
      console.error('Error adding article:', error);
      throw error;
    }
  }

  // Get all articles
  async getArticles(): Promise<NewsArticle[]> {
    try {
      const articlesJson = await AsyncStorage.getItem(this.storageKey);
      if (articlesJson) {
        return JSON.parse(articlesJson);
      }
      return this.getDefaultArticles(); // Return some default articles
    } catch (error) {
      console.error('Error getting articles:', error);
      return this.getDefaultArticles();
    }
  }

  // Get articles by category
  async getArticlesByCategory(category: string): Promise<NewsArticle[]> {
    try {
      const articles = await this.getArticles();
      return articles.filter(article => article.category === category);
    } catch (error) {
      console.error('Error getting articles by category:', error);
      return [];
    }
  }

  // Get unique categories
  async getCategories(): Promise<string[]> {
    try {
      const categoriesJson = await AsyncStorage.getItem(this.categoriesKey);
      if (categoriesJson) {
        return JSON.parse(categoriesJson);
      }
      
      // If no categories stored, extract from articles
      const articles = await this.getArticles();
      const categories = [...new Set(articles.map(article => article.category))];
      await AsyncStorage.setItem(this.categoriesKey, JSON.stringify(categories));
      return categories;
    } catch (error) {
      console.error('Error getting categories:', error);
      return ['Technology', 'Business', 'Health', 'Sports', 'Entertainment'];
    }
  }

  // Update categories list
  private async updateCategories(newCategory: string) {
    try {
      const categories = await this.getCategories();
      if (!categories.includes(newCategory)) {
        categories.push(newCategory);
        await AsyncStorage.setItem(this.categoriesKey, JSON.stringify(categories));
      }
    } catch (error) {
      console.error('Error updating categories:', error);
    }
  }

  // Simulate real-time updates
  private subscribers: ((articles: NewsArticle[]) => void)[] = [];

  subscribeToArticles(callback: (articles: NewsArticle[]) => void): () => void {
    this.subscribers.push(callback);
    
    // Initial load
    this.getArticles().then(articles => callback(articles));
    
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers(articles: NewsArticle[]) {
    this.subscribers.forEach(callback => callback(articles));
  }

  // Default articles for first-time users
  private getDefaultArticles(): NewsArticle[] {
    return [
      {
        id: 1,
        headline: "Welcome to YuvaUpdate!",
        description: "Stay updated with the latest news and current affairs. This is your personalized news feed where you can read, save, and share articles that matter to you.",
        image: "https://picsum.photos/400/300?random=18",
        category: "General",
        readTime: "2 min read",
        timestamp: new Date().toLocaleDateString()
      },
      {
        id: 2,
        headline: "How to Use YuvaUpdate",
        description: "Swipe up and down to browse articles. Use the menu (☰) to filter by categories or view your saved articles. Tap the floating buttons to save, share, or listen to articles.",
        image: "https://picsum.photos/400/300?random=19",
        category: "Tutorial",
        readTime: "3 min read",
        timestamp: new Date().toLocaleDateString()
      },
      {
        id: 3,
        headline: "Admin Panel Available",
        description: "Content creators can access the admin panel by tapping the 🔒 Admin button. Use password 'admin123' to add new articles and manage content.",
        image: "https://picsum.photos/400/300?random=20",
        category: "Info",
        readTime: "1 min read",
        timestamp: new Date().toLocaleDateString()
      }
    ];
  }

  // Clear all data (for testing)
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.storageKey, this.categoriesKey, this.lastIdKey]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

export const localNewsService = new LocalNewsService();
