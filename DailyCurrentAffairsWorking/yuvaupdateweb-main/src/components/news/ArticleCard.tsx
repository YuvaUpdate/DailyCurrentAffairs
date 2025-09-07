import { useState } from "react";
import { Calendar, ExternalLink, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArticleCard as ArticleType } from "@/types/article";
import { formatDistanceToNow } from "date-fns";

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
      className="w-screen min-h-screen flex flex-col snap-start snap-always bg-background border-b border-border items-stretch justify-start overflow-x-hidden cursor-pointer hover:bg-primary/5 transition"
      style={{ boxSizing: 'border-box', minHeight: '100vh', margin: 0, padding: 0, width: '100vw', maxWidth: '100vw', overflowX: 'hidden' }}
      onClick={handleCardClick}
    >
      {/* Image Section */}
      <div
        className="relative w-full mx-auto overflow-hidden"
        style={{
          height: 'clamp(160px, 36vw, 260px)',
          minHeight: '140px',
          maxHeight: '340px',
          width: '100vw',
          maxWidth: '100vw',
          overflow: 'hidden',
        }}
      >
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
            style={{ height: '180px', objectFit: 'cover' }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted" style={{ height: '180px' }}>
            <span className="text-muted-foreground">Image unavailable</span>
          </div>
        )}
        {/* Category badge */}
        {article.category && (
          <span className="absolute top-3 left-3 bg-black/80 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide z-10">
            {article.category}
          </span>
        )}
        {/* Post date and source on image */}
        <div className="absolute bottom-3 left-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 z-10">
          <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded font-medium">
            {article.publishedAt instanceof Date ? article.publishedAt.toLocaleDateString('en-GB') : article.publishedAt}
          </span>
          <span className="bg-black/70 text-white text-xs px-2 py-0.5 rounded font-medium">
            {article.source}
          </span>
        </div>
      </div>

      {/* Title */}
  <h2 className="font-bold text-foreground px-4 pt-4 pb-2 break-words leading-tight w-full text-lg sm:text-xl md:text-2xl" style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.7rem)', width: '100vw', maxWidth: '100vw', overflow: 'hidden' }}>
        {article.title}
      </h2>

      {/* Description/Summary in rounded box */}
  <div className="bg-muted rounded-xl px-4 py-3 text-muted-foreground mb-3 break-words leading-snug text-base sm:text-lg mx-auto" style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', width: '100%', maxWidth: '600px', overflow: 'hidden' }}>
        {(() => {
          const words = article.summary.split(' ');
          if (words.length > 100) {
            return words.slice(0, 100).join(' ') + '...';
          }
          return article.summary;
        })()}
      </div>

      {/* Info row: time, date, source */}
  <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 text-xs text-muted-foreground w-full min-w-0 w-screen" style={{ fontSize: 'clamp(0.9rem, 1vw, 1.05rem)', width: '100vw', maxWidth: '100vw', overflow: 'hidden' }}>
        <span className="whitespace-nowrap min-w-0 truncate">{timeAgo}</span>
      </div>

      {/* Single large button */}
      <div className="px-4 pb-6 w-full flex justify-center" style={{ width: '100vw', maxWidth: '100vw' }}>
        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl font-semibold bg-primary/10 text-primary border border-primary hover:bg-primary/20 transition overflow-hidden text-center"
          style={{ minWidth: '220px', maxWidth: '100%', fontSize: 'clamp(1rem, 2vw, 1.2rem)', padding: 'clamp(0.8rem, 2vw, 1.2rem) 2rem', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          Tap to know more <span className="ml-2">→</span>
        </a>
      </div>
    </div>
  );
}