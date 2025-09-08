import { ArticleCard } from "@/types/article";

class ImagePreloadService {
  private preloadedUrls = new Set<string>();
  private preloadQueue: string[] = [];
  private isProcessing = false;
  private cache = new Map<string, HTMLImageElement>();

  /**
   * Preload images for upcoming articles
   */
  preloadArticleImages(articles: ArticleCard[], currentIndex: number = 0, lookahead: number = 3) {
    const imagesToPreload: string[] = [];
    
    // Preload current and next few articles
    for (let i = currentIndex; i < Math.min(currentIndex + lookahead, articles.length); i++) {
      const article = articles[i];
      if (article?.imageUrl && !this.preloadedUrls.has(article.imageUrl)) {
        imagesToPreload.push(article.imageUrl);
      }
    }

    // Add to queue
    this.preloadQueue.push(...imagesToPreload);
    this.processQueue();
  }

  /**
   * Process the preload queue
   */
  private async processQueue() {
    if (this.isProcessing || this.preloadQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.preloadQueue.length > 0) {
      const url = this.preloadQueue.shift();
      if (url && !this.preloadedUrls.has(url)) {
        await this.preloadImage(url);
        // Small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Preload a single image
   */
  private preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedUrls.has(url)) {
        resolve();
        return;
      }

      const img = new Image();
      
      img.onload = () => {
        this.preloadedUrls.add(url);
        this.cache.set(url, img);
        console.log(`🖼️ Preloaded image: ${url.substring(0, 50)}...`);
        resolve();
      };
      
      img.onerror = () => {
        console.warn(`❌ Failed to preload image: ${url}`);
        reject();
      };

      // Add optimization parameters for faster loading
      const optimizedUrl = this.optimizeImageUrl(url);
      img.src = optimizedUrl;
    });
  }

  /**
   * Optimize image URL for faster loading
   */
  private optimizeImageUrl(url: string, width: number = 800, quality: number = 75): string {
    // For Firebase Storage URLs, add optimization parameters
    if (url.includes('firebasestorage.googleapis.com')) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('w', width.toString());
      urlObj.searchParams.set('q', quality.toString());
      urlObj.searchParams.set('auto', 'format');
      return urlObj.toString();
    }
    
    return url;
  }

  /**
   * Get cached image if available
   */
  getCachedImage(url: string): HTMLImageElement | null {
    return this.cache.get(url) || null;
  }

  /**
   * Check if image is preloaded
   */
  isPreloaded(url: string): boolean {
    return this.preloadedUrls.has(url);
  }

  /**
   * Clear cache and reset
   */
  clearCache() {
    this.cache.clear();
    this.preloadedUrls.clear();
    this.preloadQueue = [];
    this.isProcessing = false;
  }

  /**
   * Preload critical images immediately
   */
  preloadCriticalImages(urls: string[]) {
    const criticalQueue = urls.filter(url => !this.preloadedUrls.has(url));
    
    // Process critical images with higher priority
    criticalQueue.forEach(url => {
      this.preloadQueue.unshift(url); // Add to front of queue
    });
    
    this.processQueue();
  }

  /**
   * Use Intersection Observer to preload images when they're about to be visible
   */
  observeForPreloading(element: HTMLElement, imageUrl: string) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.preloadImage(imageUrl);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '100px', // Start preloading 100px before element enters viewport
        threshold: 0
      }
    );

    observer.observe(element);
    return observer;
  }
}

// Singleton instance
export const imagePreloadService = new ImagePreloadService();

// Initialize service worker for image caching (if supported)
export function initImageCaching() {
  if ('serviceWorker' in navigator && 'caches' in window) {
    navigator.serviceWorker.register('/sw.js').then(() => {
      console.log('🔧 Service Worker registered for image caching');
    }).catch(() => {
      console.log('⚠️ Service Worker registration failed');
    });
  }
}

// Add to main.tsx or App.tsx to initialize
export function initImageOptimizations() {
  // Add DNS prefetch for common image domains
  const domains = [
    'firebasestorage.googleapis.com',
    'img.youtube.com'
  ];
  
  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = `//${domain}`;
    document.head.appendChild(link);
  });

  // Add preconnect for Firebase Storage
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://firebasestorage.googleapis.com';
  document.head.appendChild(preconnect);

  console.log('🚀 Image optimizations initialized');
}
