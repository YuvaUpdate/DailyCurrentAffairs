import axios from 'axios';
import { NewsArticle, ApiResponse, NewsCategory } from '../types';

// Mock API base URL - replace with your actual API endpoint
const API_BASE_URL = 'https://api.dailycurrentaffairs.com'; // Replace with your actual API

class NewsService {
  private static instance: NewsService;
  private apiClient;

  constructor() {
    this.apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  // Fetch latest news
  async getLatestNews(page: number = 1, limit: number = 20): Promise<ApiResponse<NewsArticle[]>> {
    try {
      // For now, returning mock data. Replace with actual API call
      const mockNews = this.getMockNews();
      return {
        success: true,
        data: mockNews.slice((page - 1) * limit, page * limit),
        total: mockNews.length,
        page,
        totalPages: Math.ceil(mockNews.length / limit),
      };
      
      // Uncomment when you have actual API
      // const response = await this.apiClient.get('/news', {
      //   params: { page, limit }
      // });
      // return response.data;
    } catch (error) {
      console.error('Error fetching news:', error);
      return {
        success: false,
        data: [],
        message: 'Failed to fetch news',
      };
    }
  }

  // Fetch news by category
  async getNewsByCategory(category: NewsCategory, page: number = 1): Promise<ApiResponse<NewsArticle[]>> {
    try {
      // Mock implementation
      const mockNews = this.getMockNews().filter(article => 
        category === 'all' || article.category.toLowerCase() === category
      );
      
      return {
        success: true,
        data: mockNews.slice((page - 1) * 20, page * 20),
        total: mockNews.length,
        page,
        totalPages: Math.ceil(mockNews.length / 20),
      };
      
      // Uncomment when you have actual API
      // const response = await this.apiClient.get(`/news/category/${category}`, {
      //   params: { page }
      // });
      // return response.data;
    } catch (error) {
      console.error('Error fetching news by category:', error);
      return {
        success: false,
        data: [],
        message: 'Failed to fetch news',
      };
    }
  }

  // Search news
  async searchNews(query: string, page: number = 1): Promise<ApiResponse<NewsArticle[]>> {
    try {
      // Mock implementation
      const mockNews = this.getMockNews().filter(article =>
        article.title.toLowerCase().includes(query.toLowerCase()) ||
        article.description.toLowerCase().includes(query.toLowerCase())
      );
      
      return {
        success: true,
        data: mockNews.slice((page - 1) * 20, page * 20),
        total: mockNews.length,
        page,
        totalPages: Math.ceil(mockNews.length / 20),
      };
    } catch (error) {
      console.error('Error searching news:', error);
      return {
        success: false,
        data: [],
        message: 'Failed to search news',
      };
    }
  }

  // Get breaking news
  async getBreakingNews(): Promise<ApiResponse<NewsArticle[]>> {
    try {
      // Mock implementation
      const breakingNews = this.getMockNews().filter(article => article.isBreaking);
      
      return {
        success: true,
        data: breakingNews,
      };
    } catch (error) {
      console.error('Error fetching breaking news:', error);
      return {
        success: false,
        data: [],
        message: 'Failed to fetch breaking news',
      };
    }
  }

  // Mock data for development
  private getMockNews(): NewsArticle[] {
    return [
      {
        id: '1',
        title: 'Major Economic Policy Changes Announced',
        description: 'The government has announced significant changes to economic policies that will impact various sectors. These changes are expected to boost economic growth and create new opportunities for businesses.',
        imageUrl: 'https://picsum.photos/800/400?random=1',
        publishedAt: new Date().toISOString(),
        source: 'Economic Times',
        category: 'business',
        url: 'https://example.com/news/1',
        isBreaking: true,
      },
      {
        id: '2',
        title: 'Technology Breakthrough in Renewable Energy',
        description: 'Scientists have made a groundbreaking discovery in renewable energy technology that could revolutionize the way we generate clean power.',
        imageUrl: 'https://picsum.photos/800/400?random=2',
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: 'Tech News',
        category: 'technology',
        url: 'https://example.com/news/2',
      },
      {
        id: '3',
        title: 'Sports Championship Finals This Weekend',
        description: 'The much-anticipated championship finals are scheduled for this weekend with teams showing exceptional performance throughout the season.',
        imageUrl: 'https://picsum.photos/800/400?random=3',
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: 'Sports Today',
        category: 'sports',
        url: 'https://example.com/news/3',
      },
      {
        id: '4',
        title: 'Healthcare Innovation Saves Lives',
        description: 'A new medical technology has been successfully implemented in hospitals, showing remarkable results in patient care and treatment outcomes.',
        imageUrl: 'https://picsum.photos/800/400?random=4',
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
        source: 'Health News',
        category: 'health',
        url: 'https://example.com/news/4',
        isBreaking: true,
      },
      {
        id: '5',
        title: 'Political Developments Shape Future',
        description: 'Recent political developments are expected to have significant implications for future policy directions and governance.',
        imageUrl: 'https://picsum.photos/800/400?random=5',
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
        source: 'Political Report',
        category: 'politics',
        url: 'https://example.com/news/5',
      },
    ];
  }
}

export default NewsService.getInstance();
