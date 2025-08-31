// types.tsx - Shared type definitions
export interface NewsArticle {
  id: number | string;
  headline: string;
  description: string;
  image: string;
  imageUrl?: string; // Alternative image URL
  link?: string; // External news link
  category: string;
  timestamp: string;
  mediaType?: 'image' | 'video'; // Type of media content
  mediaPath?: string; // Firebase storage path for potential deletion
  sourceUrl?: string;
  source?: string; // Human-readable source name (e.g., Times of India)
  readTime?: string;
  fullText?: string;
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
