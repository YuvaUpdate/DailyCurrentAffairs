// types.tsx - Inshorts-style news article definition
export interface NewsArticle {
  id: string | number; // Accept string (Firebase IDs) or numeric IDs used in examples
  headline: string; // Main news headline (admin written)
  description: string; // Short summary (admin written, 2-3 lines max)
  image: string; // Featured image URL
  imageUrl?: string; // Alternative image URL
  sourceUrl?: string; // External news website link (optional)
  category: string; // News category (Politics, Sports, etc.)
  readTime: string; // Estimated read time (e.g., "2 min read")
  timestamp: string; // When news was added
  mediaType?: 'image' | 'video'; // Type of media content
  mediaPath?: string; // Firebase storage path
  // Removed fullText - we only store headline + summary like Inshorts
  link?: string; // Alternative to sourceUrl for compatibility
}

// User related types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  categories: string[];
  notifications: boolean;
  audioSettings: AudioSettings;
  theme: 'light' | 'dark' | 'system';
}

export interface AudioSettings {
  speed: number;
  pitch: number;
  volume: number;
  voice?: string;
}

// Comment related types
export interface Comment {
  id: string;
  articleId: string | number;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  likedBy: string[];
  replies?: Comment[];
  parentId?: string;
  isDeleted: boolean;
}

// Bookmark related types
export interface Bookmark {
  id: string;
  userId: string;
  articleId: string | number;
  timestamp: string;
  category?: string;
}
