// types.tsx - Shared type definitions
export interface NewsArticle {
  id: number | string;
  headline: string;
  description: string;
  image: string;
  imageUrl?: string; // Alternative image URL
  link?: string; // External news link
  youtubeUrl?: string; // YouTube video URL
  category: string;
  timestamp: string;
  mediaType?: 'image' | 'video' | 'youtube'; // Type of media content
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

// Video/Reels related types (Instagram-like video sharing)
export interface VideoReel {
  id: string | number;
  title: string;
  description?: string;
  videoUrl: string; // Firebase Storage URL or external URL
  embedUrl?: string; // Platform-specific embed URL (YouTube, Instagram, etc.)
  thumbnailUrl: string; // Video thumbnail/poster
  duration: number; // Video duration in seconds
  
  // Source/Credit Information
  originalSource: {
    creatorName: string; // Original creator name
    creatorHandle?: string; // @username if available
    creatorProfilePic?: string; // Creator's profile picture URL
    sourceUrl: string; // Link to original video/channel
    sourcePlatform: 'YouTube' | 'Instagram' | 'TikTok' | 'Twitter' | 'Facebook' | 'Other';
    originalVideoId?: string; // Original video ID if available
  };
  
  // Metadata
  category: string;
  tags: string[];
  timestamp: string;
  uploadedBy: string; // Admin who uploaded
  
  // Engagement
  views: number;
  likes: number;
  likedBy: string[];
  shares: number;
  comments: number;
  
  // Video Properties
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5'; // Vertical, horizontal, square, etc.
  resolution: string; // e.g., '1080x1920'
  fileSize?: number; // In bytes
  
  // Status
  isActive: boolean;
  isFeatured: boolean;
  moderationStatus: 'approved' | 'pending' | 'rejected';
  
  // Platform-specific information
  platformInfo?: {
    detectedPlatform: string;
    isSupported: boolean;
    playbackType: 'embed' | 'direct' | 'external';
    videoId?: string;
  };
}

// Video engagement tracking
export interface VideoEngagement {
  id: string;
  videoId: string | number;
  userId: string;
  action: 'view' | 'like' | 'share' | 'comment';
  timestamp: string;
  metadata?: {
    watchDuration?: number; // How long they watched (seconds)
    shareMethod?: 'whatsapp' | 'instagram' | 'twitter' | 'copy_link';
    deviceInfo?: string;
  };
}


