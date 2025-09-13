import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

interface ImageCacheEntry {
  url: string;
  timestamp: number;
  dimensions?: { width: number; height: number };
}

export class ImagePrefetchService {
  private static instance: ImagePrefetchService;
  private cache = new Map<string, ImageCacheEntry>();
  private prefetchQueue = new Set<string>();
  private readonly CACHE_KEY = 'image_prefetch_cache';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 500; // Much larger cache for faster image loading
  private readonly MAX_CONCURRENT_PREFETCH = 12; // More concurrent prefetch for faster loading
  private readonly PREFETCH_AHEAD_COUNT = 8; // Prefetch images for next 8 articles

  static getInstance(): ImagePrefetchService {
    if (!ImagePrefetchService.instance) {
      ImagePrefetchService.instance = new ImagePrefetchService();
    }
    return ImagePrefetchService.instance;
  }

  private constructor() {
    this.loadCacheFromStorage();
  }

  // Load cached image info from AsyncStorage
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const cacheData: Record<string, ImageCacheEntry> = JSON.parse(cached);
        const now = Date.now();
        
        // Filter out expired entries
        Object.entries(cacheData).forEach(([url, entry]) => {
          if (now - entry.timestamp < this.CACHE_EXPIRY) {
            this.cache.set(url, entry);
          }
        });
      }
    } catch (error) {
      console.log('Failed to load image cache from storage:', error);
    }
  }

  // Save cache to AsyncStorage
  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheData: Record<string, ImageCacheEntry> = {};
      this.cache.forEach((entry, url) => {
        cacheData[url] = entry;
      });
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.log('Failed to save image cache to storage:', error);
    }
  }

  // Prefetch a single image
  async prefetchImage(url: string): Promise<boolean> {
    if (!url || this.prefetchQueue.has(url) || this.cache.has(url)) {
      return false;
    }

    // Limit concurrent prefetch operations
    if (this.prefetchQueue.size >= this.MAX_CONCURRENT_PREFETCH) {
      return false;
    }

    this.prefetchQueue.add(url);

    try {
      // Get image dimensions while prefetching
      const dimensions = await this.getImageDimensions(url);
      
      // Prefetch the image
      await Image.prefetch(url);
      
      // Cache the successful prefetch
      const entry: ImageCacheEntry = {
        url,
        timestamp: Date.now(),
        dimensions
      };
      
      this.cache.set(url, entry);
      
      // Cleanup old entries if cache is too large
      if (this.cache.size > this.MAX_CACHE_SIZE) {
        this.cleanupCache();
      }
      
      // Save to storage (debounced)
      this.debouncedSave();
      
      return true;
    } catch (error) {
      console.log('Failed to prefetch image:', url, error);
      return false;
    } finally {
      this.prefetchQueue.delete(url);
    }
  }

  // Prefetch multiple images (for upcoming articles)
  async prefetchImages(urls: string[]): Promise<void> {
    const validUrls = urls.filter(url => url && !this.cache.has(url) && !this.prefetchQueue.has(url));
    
    // Prefetch in batches to avoid overwhelming the system
    for (let i = 0; i < validUrls.length; i += this.MAX_CONCURRENT_PREFETCH) {
      const batch = validUrls.slice(i, i + this.MAX_CONCURRENT_PREFETCH);
      await Promise.allSettled(batch.map(url => this.prefetchImage(url)));
    }
  }

  // Aggressive prefetching for current and upcoming articles
  async prefetchUpcomingArticles(articles: any[], currentIndex: number): Promise<void> {
    if (!articles || articles.length === 0) return;

    const imagesToPrefetch: string[] = [];
    
    // Prefetch current article and next few articles
    const endIndex = Math.min(currentIndex + this.PREFETCH_AHEAD_COUNT, articles.length);
    
    for (let i = currentIndex; i < endIndex; i++) {
      const article = articles[i];
      if (article?.image && !this.cache.has(article.image)) {
        imagesToPrefetch.push(article.image);
      }
    }

    // Also prefetch a few previous articles (for swipe back)
    const startIndex = Math.max(0, currentIndex - 2);
    for (let i = startIndex; i < currentIndex; i++) {
      const article = articles[i];
      if (article?.image && !this.cache.has(article.image)) {
        imagesToPrefetch.push(article.image);
      }
    }

    if (imagesToPrefetch.length > 0) {
      console.log(`🚀 Aggressively prefetching ${imagesToPrefetch.length} images for faster loading`);
      // Start prefetching in background (don't wait)
      this.prefetchImages(imagesToPrefetch).catch(console.warn);
    }
  }

  // Get image dimensions
  private getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      Image.getSize(
        url,
        (width, height) => resolve({ width, height }),
        () => resolve({ width: 400, height: 300 }) // Default dimensions on error
      );
    });
  }

  // Check if image is cached
  isImageCached(url: string): boolean {
    return this.cache.has(url);
  }

  // Get cached image dimensions
  getCachedDimensions(url: string): { width: number; height: number } | null {
    const entry = this.cache.get(url);
    return entry?.dimensions || null;
  }

  // Clean up old cache entries
  private cleanupCache(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE + 10);
    toRemove.forEach(([url]) => this.cache.delete(url));
  }

  // Debounced save to storage
  private saveTimeout?: NodeJS.Timeout;
  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveCacheToStorage();
    }, 2000);
  }

  // Clear all cache
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.prefetchQueue.clear();
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.log('Failed to clear image cache:', error);
    }
  }

  // Get cache statistics
  getCacheStats(): { size: number; prefetching: number } {
    return {
      size: this.cache.size,
      prefetching: this.prefetchQueue.size
    };
  }

  // Warm up cache with critical images (call when app starts)
  async warmUpCache(criticalImages: string[]): Promise<void> {
    console.log(`🔥 Warming up cache with ${criticalImages.length} critical images`);
    const uncachedImages = criticalImages.filter(url => url && !this.cache.has(url));
    
    if (uncachedImages.length > 0) {
      // Prefetch critical images with higher priority
      await this.prefetchImages(uncachedImages.slice(0, 15)); // First 15 images
    }
  }
}

export default ImagePrefetchService;
