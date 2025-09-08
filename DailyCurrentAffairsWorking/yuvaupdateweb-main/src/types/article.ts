export interface Article {
  id: string;
  title: string;
  summary: string;
  content?: string;
  imageUrl: string;
  videoUrl?: string;
  youtubeUrl?: string;
  source: string;
  sourceUrl: string;
  publishedAt: Date;
  category?: string;
  tags?: string[];
  readTime?: string | number;
  mediaType?: 'image' | 'video' | 'youtube';
  mediaPath?: string;
}

export interface ArticleCard extends Omit<Article, 'content'> {
  // Card version without full content for performance
}