// NewsAPI Proxy Service - Handles CORS issues with NewsAPI
// This service uses our Cloud Functions as a proxy to fetch news

interface NewsApiProxyResponse {
  success: boolean;
  articles?: any[];
  error?: string;
}

export class NewsApiProxy {
  private static baseUrl = 'https://us-central1-yuvaupdate-3762b.cloudfunctions.net';

  static async fetchLatestNews(category?: string, country: string = 'us'): Promise<any[]> {
    try {
      console.log('🔄 Using NewsAPI proxy for category:', category);
      
      // Build proxy URL
      const params = new URLSearchParams({
        country,
        pageSize: '20'
      });
      
      if (category && category !== 'all') {
        params.append('category', category.toLowerCase());
      }
      
      const proxyUrl = `${this.baseUrl}/fetchNews?${params.toString()}`;
      console.log('📡 Fetching from proxy:', proxyUrl);
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
      }
      
      const data: NewsApiProxyResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Proxy request failed');
      }
      
      return data.articles || [];
    } catch (error) {
      console.error('❌ NewsAPI Proxy Error:', error);
      throw error;
    }
  }

  static async searchNews(query: string): Promise<any[]> {
    try {
      console.log('🔍 Using NewsAPI proxy for search:', query);
      
      const params = new URLSearchParams({
        q: query,
        pageSize: '20',
        sortBy: 'publishedAt'
      });
      
      const proxyUrl = `${this.baseUrl}/searchNews?${params.toString()}`;
      console.log('📡 Searching via proxy:', proxyUrl);
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Search proxy request failed: ${response.status} ${response.statusText}`);
      }
      
      const data: NewsApiProxyResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Search proxy request failed');
      }
      
      return data.articles || [];
    } catch (error) {
      console.error('❌ NewsAPI Search Proxy Error:', error);
      throw error;
    }
  }
}
