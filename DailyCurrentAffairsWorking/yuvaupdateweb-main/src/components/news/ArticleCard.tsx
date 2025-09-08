import { useState } from "react";
import { Calendar, ExternalLink, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleCard as ArticleType } from "@/types/article";
import { formatDistanceToNow } from "date-fns";
import { ArticleActions } from "@/components/ArticleActions";
import "@/styles/article-layout.css";

interface ArticleCardProps {
  article: ArticleType;
  onReadMore: (article: ArticleType) => void;
  onOpenLink: (url: string) => void;
  isActive?: boolean;
}

export function ArticleCard({ article, onReadMore, onOpenLink, isActive = false }: ArticleCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const timeAgo = formatDistanceToNow(article.publishedAt, { addSuffix: true });

  // Handler for clicking anywhere on the card
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent link/button inside from triggering twice
    if ((e.target as HTMLElement).closest('a,button')) return;
    window.open(article.sourceUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="w-full h-screen flex flex-col snap-start snap-always bg-background border-b border-border cursor-pointer hover:bg-primary/5 transition-colors duration-200 overflow-hidden max-h-screen"
      onClick={handleCardClick}
    >
      {/* Sticky Header with Image - Reduced height for more content space */}
      <div className="relative w-full flex-shrink-0 overflow-hidden bg-muted sticky top-0 z-30" style={{ height: 'clamp(140px, 20vh, 180px)' }}>
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {!imageError ? (
          <img
            src={article.imageUrl}
            alt={article.title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? "opacity-0" : "opacity-100"}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-muted-foreground">Image unavailable</span>
          </div>
        )}
        
        {/* Category badge */}
        {article.category && (
          <span className="absolute top-3 left-3 bg-black/80 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide z-10">
            {article.category}
          </span>
        )}
        
        {/* Read Aloud and Share Actions - Moved higher up on the image */}
        <div className="absolute top-8 right-3 z-20" onClick={(e) => e.stopPropagation()}>
          <ArticleActions
            article={{
              title: article.title,
              summary: article.summary,
              sourceUrl: article.sourceUrl,
              category: article.category,
            }}
            className="flex-col gap-2"
          />
        </div>
        
        {/* Post date and source on image */}
        <div className="absolute bottom-3 left-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 z-10">
          <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded font-medium">
            {article.publishedAt instanceof Date ? article.publishedAt.toLocaleDateString('en-GB') : String(article.publishedAt)}
          </span>
          <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded font-medium">
            {article.source}
          </span>
        </div>
      </div>

      {/* Content Area - Flexible without scrolling */}
      <div className="flex-1 flex flex-col min-h-0 px-4 py-4 justify-between overflow-hidden">
        {/* Content area */}
        <div className="flex flex-col flex-1">
        {/* Title - Balanced size for readability */}
        <h2 className="font-bold text-foreground mb-2 break-words leading-tight text-sm sm:text-base lg:text-lg flex-shrink-0">
          {article.title}
        </h2>

        {/* Description - Optimized font size and spacing with integrated button */}
        <div className="bg-muted rounded-xl px-3 py-2 text-black dark:text-muted-foreground mb-3 break-words leading-relaxed text-sm overflow-hidden flex-shrink-0 max-h-96">
          <div className="h-full flex flex-col">
            <div className="w-full flex-1">
              {(() => {
                const words = article.summary.split(' ');
                // Minimum 100 words for better content display
                const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
                const maxWords = screenWidth < 640 ? 100 : screenWidth < 1024 ? 120 : 150;
                const text = words.length > maxWords ? words.slice(0, maxWords).join(' ') + '...' : article.summary;
                
                return (
                  <span>
                    {text}{' '}
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center ml-2 px-2 py-1 text-xs font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors duration-200 rounded-md"
                      onClick={e => e.stopPropagation()}
                    >
                      Read more <span className="ml-1">→</span>
                    </a>
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}