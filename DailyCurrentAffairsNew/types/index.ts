export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  publishedAt: string;
  source: string;
  category: string;
  url: string;
  isBreaking?: boolean;
}

export interface BookmarkedArticle extends NewsArticle {
  bookmarkedAt: string;
}

export interface NotificationSettings {
  breakingNews: boolean;
  dailyDigest: boolean;
  digestTime: string; // Format: "HH:mm"
}

export interface User {
  id: string;
  preferences: NotificationSettings;
  bookmarks: string[]; // Array of article IDs
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  totalPages?: number;
}

export type NewsCategory = 
  | 'all'
  | 'politics'
  | 'sports'
  | 'technology'
  | 'business'
  | 'entertainment'
  | 'health'
  | 'science'
  | 'world';

export interface CategoryFilter {
  id: NewsCategory;
  name: string;
  icon: string;
}
