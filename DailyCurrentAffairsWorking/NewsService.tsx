// NewsService.tsx - Handle news API integration
import { NewsArticle } from './types';

// NewsAPI.org integration
const NEWS_API_KEY = '376e8e61564d427cafc0129a091e41a7';
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
}

class NewsService {
  // Fetch latest news from API
  async fetchLatestNews(category?: string, country: string = 'us'): Promise<NewsArticle[]> {
    try {
      // Build API URL - increased pageSize to 20 for more articles
      let url = `${NEWS_API_BASE_URL}/top-headlines?country=${country}&pageSize=20`;
      if (category && category !== 'all') {
        url += `&category=${category.toLowerCase()}`;
      }
      url += `&apiKey=${NEWS_API_KEY}`;

      const response = await fetch(url);
      const data: NewsApiResponse = await response.json();

      if (data.status !== 'ok') {
        throw new Error('Failed to fetch news');
      }

      // Transform API response to our NewsArticle format
      return data.articles.map((article, index) => ({
        id: Date.now() + index,
        headline: article.title,
        description: article.description || 'No description available',
        image: article.urlToImage || `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(category || 'News')}`,
        category: category || 'General',
        readTime: this.calculateReadTime(article.description || ''),
        timestamp: this.formatTimestamp(article.publishedAt),
      }));
    } catch (error) {
      console.error('Error fetching news:', error);
      throw error;
    }
  }

  // Search for specific news
  async searchNews(query: string): Promise<NewsArticle[]> {
    try {
      const url = `${NEWS_API_BASE_URL}/everything?q=${encodeURIComponent(query)}&pageSize=20&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`;
      
      const response = await fetch(url);
      const data: NewsApiResponse = await response.json();

      if (data.status !== 'ok') {
        throw new Error('Failed to search news');
      }

      return data.articles.map((article, index) => ({
        id: Date.now() + index,
        headline: article.title,
        description: article.description || 'No description available',
        image: article.urlToImage || `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(query)}`,
        category: 'Search',
        readTime: this.calculateReadTime(article.description || ''),
        timestamp: this.formatTimestamp(article.publishedAt),
      }));
    } catch (error) {
      console.error('Error searching news:', error);
      throw error;
    }
  }

  // Calculate reading time based on content length
  private calculateReadTime(content: string): string {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  }

  // Format timestamp to relative time
  private formatTimestamp(publishedAt: string): string {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffInMs = now.getTime() - published.getTime();
    
    const minutes = Math.floor(diffInMs / (1000 * 60));
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minutes ago`;
    } else if (hours < 24) {
      return `${hours} hours ago`;
    } else {
      return `${days} days ago`;
    }
  }

  // Get sample news for demo (when API key is not available)
  getSampleNews(): NewsArticle[] {
    return [
      {
        id: Date.now() + 1,
        headline: "Global Climate Summit Reaches Historic Agreement",
        description: "World leaders have unanimously agreed on groundbreaking climate policies that will reshape environmental protection for the next decade. The agreement includes significant investments in renewable energy and carbon reduction targets.",
        image: "https://via.placeholder.com/400x300/34d399/ffffff?text=Climate+Summit",
        category: "Environment",
        readTime: "3 min read",
        timestamp: "1 hour ago"
      },
      {
        id: Date.now() + 2,
        headline: "Revolutionary AI Technology Breakthrough Announced",
        description: "Scientists have developed a new artificial intelligence system that can process complex problems 100 times faster than current technology. This breakthrough could revolutionize industries from healthcare to transportation.",
        image: "https://via.placeholder.com/400x300/667eea/ffffff?text=AI+Tech",
        category: "Technology",
        readTime: "4 min read",
        timestamp: "2 hours ago"
      },
      {
        id: Date.now() + 3,
        headline: "International Sports Championship Finals Begin",
        description: "The most anticipated sporting event of the year kicks off today with teams from 32 countries competing for the ultimate prize. Millions of fans worldwide are expected to tune in for the spectacular opening ceremony.",
        image: "https://via.placeholder.com/400x300/f093fb/ffffff?text=Sports+Finals",
        category: "Sports",
        readTime: "2 min read",
        timestamp: "3 hours ago"
      },
      {
        id: Date.now() + 4,
        headline: "Economic Markets Show Unprecedented Growth",
        description: "Global financial markets have reached record highs following positive economic indicators and increased investor confidence. Analysts predict continued growth throughout the quarter with new opportunities emerging.",
        image: "https://via.placeholder.com/400x300/4ade80/ffffff?text=Market+Growth",
        category: "Business",
        readTime: "3 min read",
        timestamp: "4 hours ago"
      },
      {
        id: Date.now() + 5,
        headline: "Medical Breakthrough Offers New Hope for Patients",
        description: "Researchers have successfully developed a new treatment that shows remarkable results in clinical trials. The innovative approach could help millions of patients worldwide and represents a major step forward in modern medicine.",
        image: "https://via.placeholder.com/400x300/fb7185/ffffff?text=Medical+News",
        category: "Health",
        readTime: "5 min read",
        timestamp: "5 hours ago"
      }
    ];
  }
}

export const newsService = new NewsService();
