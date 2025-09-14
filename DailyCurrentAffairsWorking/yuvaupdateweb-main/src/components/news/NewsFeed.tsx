import { useState, useEffect, useCallback, useRef } from "react";
import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArticleCard as ArticleType, Article } from "@/types/article";
import { ArticleCard } from "./ArticleCard";
import { ArticleModal } from "./ArticleModal";
import { WebViewModal } from "./WebViewModal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVideoFeed } from "@/contexts/VideoFeedContext";
import { imagePreloadService } from "@/services/ImagePreloadService";


const ARTICLES_PER_PAGE = 5;
const COLLECTION_NAME = "news_articles";

export function NewsFeed() {
  const { isVideoFeedOpen } = useVideoFeed();
  const [articles, setArticles] = useState<ArticleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch initial articles from Firestore
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, COLLECTION_NAME),
          orderBy("timestamp", "desc"),
          limit(ARTICLES_PER_PAGE)
        );
        const snapshot = await getDocs(q);
        const fetchedArticles: ArticleType[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.headline || data.title || "",
            summary: data.description || data.summary || "",
            imageUrl: data.image || data.imageUrl || "",
            youtubeUrl: data.youtubeUrl || "",
            source: data.source || "",
            sourceUrl: data.sourceUrl || data.source_url || data.link || "",
            publishedAt: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : new Date()),
            category: data.category,
            readTime: data.readTime || data.read_time || "",
            tags: data.tags || [],
            mediaType: data.mediaType || 'image',
            mediaPath: data.mediaPath || "",
          };
        });
        setArticles(fetchedArticles);
        setHasMore(snapshot.docs.length === ARTICLES_PER_PAGE);
        
        // Preload images for first few articles for faster loading
        if (fetchedArticles.length > 0) {
          imagePreloadService.preloadCriticalImages(
            fetchedArticles.slice(0, 3).map(article => article.imageUrl).filter(Boolean)
          );
          imagePreloadService.preloadArticleImages(fetchedArticles, 0, 5);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading articles:", error);
        toast({
          title: "Error",
          description: "Failed to load articles. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    fetchArticles();
  }, [toast]);

  // Pagination: Load more articles from Firestore
  const loadMoreArticles = useCallback(async () => {
    if (loadingMore || !hasMore || articles.length === 0) return;
    try {
      setLoadingMore(true);
      const lastArticle = articles[articles.length - 1];
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("timestamp", "desc"),
        startAfter(lastArticle.publishedAt),
        limit(ARTICLES_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      const newArticles: ArticleType[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.headline || data.title || "",
          summary: data.description || data.summary || "",
          imageUrl: data.image || data.imageUrl || "",
          youtubeUrl: data.youtubeUrl || "",
          source: data.source || "",
          sourceUrl: data.sourceUrl || data.source_url || data.link || "",
          publishedAt: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : new Date()),
          category: data.category,
          readTime: data.readTime || data.read_time || "",
          tags: data.tags || [],
          mediaType: data.mediaType || 'image',
          mediaPath: data.mediaPath || "",
        };
      });
      setArticles(prev => [...prev, ...newArticles]);
      setHasMore(snapshot.docs.length === ARTICLES_PER_PAGE);
      
      // Preload images for newly loaded articles
      if (newArticles.length > 0) {
        imagePreloadService.preloadArticleImages(newArticles, 0, 3);
      }
    } catch (error) {
      console.error("Error loading more articles:", error);
      toast({
        title: "Error",
        description: "Failed to load more articles.",
        variant: "destructive"
      });
    } finally {
      setLoadingMore(false);
    }
  }, [articles, loadingMore, hasMore, toast]);

  // Handle scroll to detect current article and load more
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const windowHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / windowHeight);
      
      setCurrentIndex(newIndex);
      
      // Preload images for upcoming articles as user scrolls
      if (newIndex !== currentIndex) {
        imagePreloadService.preloadArticleImages(articles, newIndex, 3);
      }
      
      // Load more when approaching end
      if (newIndex >= articles.length - 3 && hasMore && !loadingMore) {
        loadMoreArticles();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [articles.length, hasMore, loadingMore, loadMoreArticles]);

  const handleReadMore = useCallback(async (article: ArticleType) => {
    const fullArticle: Article = {
      ...article,
      content: `<p>This is the full content for "${article.title}". In a real application, this would be fetched from your Firebase database.</p>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>`
    };
    setSelectedArticle(fullArticle);
  }, []);

  const handleOpenLink = useCallback((url: string) => {
    setWebViewUrl(url);
  }, []);

  // Refresh: Reload articles from Firestore
  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      
      // Store current scroll position before refresh
      const currentScrollTop = containerRef.current?.scrollTop || 0;
      const currentScrollIndex = currentIndex;
      
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("timestamp", "desc"),
        limit(ARTICLES_PER_PAGE)
      );
      const snapshot = await getDocs(q);
      const refreshedArticles: ArticleType[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.headline || data.title || "",
          summary: data.description || data.summary || "",
          imageUrl: data.image || data.imageUrl || "",
          youtubeUrl: data.youtubeUrl || "",
          source: data.source || "",
          sourceUrl: data.sourceUrl || data.source_url || data.link || "",
          publishedAt: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000) : new Date()),
          category: data.category,
          readTime: data.readTime || data.read_time || "",
          tags: data.tags || [],
          mediaType: data.mediaType || 'image',
          mediaPath: data.mediaPath || "",
        };
      });
  setArticles(refreshedArticles);
  setHasMore(snapshot.docs.length === ARTICLES_PER_PAGE);
  
  // Preload images for refreshed articles while preserving user position
  if (refreshedArticles.length > 0) {
    imagePreloadService.preloadArticleImages(refreshedArticles, currentScrollIndex, 3);
  }
  
  // Restore scroll position after refresh (auto-refresh should not change user's position)
  setTimeout(() => {
    if (containerRef.current && currentScrollTop > 0) {
      containerRef.current.scrollTop = currentScrollTop;
      setCurrentIndex(currentScrollIndex);
    }
  }, 50); // Small delay to allow DOM to update
  
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setLoading(false);
    }
  }, [toast, currentIndex]);

  // Auto-refresh every 5 seconds (fetch latest articles)
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [handleRefresh]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading latest news...</p>
        </div>
      </div>
    );
  }

  // Handler for back to top
  const handleBackToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      {/* Floating Back to Top Button - hidden when video feed is open */}
      {!isVideoFeedOpen && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Immediate visual feedback
            const button = e.currentTarget;
            button.style.transform = 'scale(0.9)';
            
            // Execute immediately
            handleBackToTop();
            
            // Reset visual feedback
            setTimeout(() => {
              button.style.transform = 'scale(1)';
            }, 150);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="fixed bottom-6 right-6 z-50 bg-primary text-white rounded-full shadow-lg p-3 hover:bg-primary/90 active:bg-primary/80 transition-all duration-100 hover:scale-105 active:scale-90 cursor-pointer select-none"
          style={{ 
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            pointerEvents: 'auto',
            touchAction: 'manipulation',
            userSelect: 'none'
          }}
          aria-label="Back to Top"
        >
          ↑ Top
        </button>
      )}
      {/* Scrollable Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        {articles.map((article, index) => (
          <ArticleCard
            key={article.id}
            article={article}
            onReadMore={handleReadMore}
            onOpenLink={handleOpenLink}
            isActive={index === currentIndex}
          />
        ))}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="min-h-[60vh] flex items-center justify-center snap-start">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading more articles...</p>
            </div>
          </div>
        )}

        {/* End indicator */}
        {!hasMore && articles.length > 0 && (
          <div className="min-h-[60vh] flex items-center justify-center snap-start">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">You've reached the end</p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Immediate visual feedback
                  const button = e.currentTarget;
                  button.style.transform = 'scale(0.95)';
                  button.style.opacity = '0.8';
                  
                  console.log('REFRESH CLICKED!');
                  
                  // Execute immediately
                  handleRefresh();
                  
                  // Reset visual feedback
                  setTimeout(() => {
                    button.style.transform = 'scale(1)';
                    button.style.opacity = '1';
                  }, 100);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="px-4 py-2 border border-border rounded-md text-foreground bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80 transition-all duration-100 hover:scale-105 active:scale-95 cursor-pointer select-none"
                style={{
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                  userSelect: 'none'
                }}
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ArticleModal
        article={selectedArticle}
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onOpenLink={handleOpenLink}
      />

      <WebViewModal
        url={webViewUrl}
        isOpen={!!webViewUrl}
        onClose={() => setWebViewUrl(null)}
      />
    </div>
  );
}