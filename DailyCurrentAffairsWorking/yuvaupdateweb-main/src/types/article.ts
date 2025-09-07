export interface Article {
  id: string;
  title: string;
  summary: string;
  content?: string;
  imageUrl: string;
  videoUrl?: string;
  source: string;
  sourceUrl: string;
  publishedAt: Date;
  category?: string;
  tags?: string[];
  readTime?: number;
}

export interface ArticleCard extends Omit<Article, 'content'> {
  // Card version without full content for performance
}