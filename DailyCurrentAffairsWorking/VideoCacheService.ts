import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoReel } from './types';

export class VideoCacheService {
  private static readonly CACHE_KEY = 'video_cache';
  private static readonly METADATA_CACHE_KEY = 'video_metadata_cache';
  private static readonly MAX_CACHE_SIZE = 100; // Maximum number of videos to cache
  private static readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  /**
   * Cache video metadata for faster access
   */
  static async cacheVideoMetadata(videos: VideoReel[]): Promise<void> {
    try {
      const cacheData = {
        videos,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(this.METADATA_CACHE_KEY, JSON.stringify(cacheData));
      console.log('📦 [VideoCache] Cached', videos.length, 'video metadata entries');
    } catch (error) {
      console.error('❌ [VideoCache] Failed to cache video metadata:', error);
    }
  }

  /**
   * Get cached video metadata
   */
  static async getCachedVideoMetadata(): Promise<VideoReel[] | null> {
    try {
      const cacheData = await AsyncStorage.getItem(this.METADATA_CACHE_KEY);
      if (!cacheData) return null;

      const { videos, timestamp } = JSON.parse(cacheData);
      
      // Check if cache is still valid
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        console.log('🕐 [VideoCache] Metadata cache expired, clearing...');
        await AsyncStorage.removeItem(this.METADATA_CACHE_KEY);
        return null;
      }

      console.log('📦 [VideoCache] Retrieved', videos.length, 'cached video metadata entries');
      return videos;
    } catch (error) {
      console.error('❌ [VideoCache] Failed to get cached video metadata:', error);
      return null;
    }
  }

  /**
   * Cache video URLs for offline/faster access
   */
  static async cacheVideoUrl(videoId: string, url: string): Promise<void> {
    try {
      const cache = await this.getVideoUrlCache();
      cache[videoId] = {
        url,
        timestamp: Date.now(),
      };

      // Limit cache size
      const entries = Object.entries(cache);
      if (entries.length > this.MAX_CACHE_SIZE) {
        // Remove oldest entries
        entries.sort(([, a], [, b]) => (a as any).timestamp - (b as any).timestamp);
        const toKeep = entries.slice(-this.MAX_CACHE_SIZE);
        const newCache: any = {};
        toKeep.forEach(([id, data]) => {
          newCache[id] = data;
        });
        await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(newCache));
      } else {
        await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      }

      console.log('📦 [VideoCache] Cached URL for video:', videoId);
    } catch (error) {
      console.error('❌ [VideoCache] Failed to cache video URL:', error);
    }
  }

  /**
   * Get cached video URL
   */
  static async getCachedVideoUrl(videoId: string): Promise<string | null> {
    try {
      const cache = await this.getVideoUrlCache();
      const cachedData = cache[videoId];

      if (!cachedData) return null;

      // Check if cache is still valid
      if (Date.now() - cachedData.timestamp > this.CACHE_DURATION) {
        console.log('🕐 [VideoCache] URL cache expired for video:', videoId);
        delete cache[videoId];
        await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
        return null;
      }

      console.log('📦 [VideoCache] Retrieved cached URL for video:', videoId);
      return cachedData.url;
    } catch (error) {
      console.error('❌ [VideoCache] Failed to get cached video URL:', error);
      return null;
    }
  }

  /**
   * Get video URL cache
   */
  private static async getVideoUrlCache(): Promise<any> {
    try {
      const cacheData = await AsyncStorage.getItem(this.CACHE_KEY);
      return cacheData ? JSON.parse(cacheData) : {};
    } catch (error) {
      console.error('❌ [VideoCache] Failed to get video URL cache:', error);
      return {};
    }
  }

  /**
   * Clear all caches
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.CACHE_KEY, this.METADATA_CACHE_KEY]);
      console.log('🧹 [VideoCache] All caches cleared');
    } catch (error) {
      console.error('❌ [VideoCache] Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    metadataCacheSize: number;
    urlCacheSize: number;
    totalCacheAge: number;
  }> {
    try {
      const metadataCache = await AsyncStorage.getItem(this.METADATA_CACHE_KEY);
      const urlCache = await this.getVideoUrlCache();

      const metadataCacheSize = metadataCache ? JSON.parse(metadataCache).videos?.length || 0 : 0;
      const urlCacheSize = Object.keys(urlCache).length;
      const totalCacheAge = metadataCache ? Date.now() - JSON.parse(metadataCache).timestamp : 0;

      return {
        metadataCacheSize,
        urlCacheSize,
        totalCacheAge,
      };
    } catch (error) {
      console.error('❌ [VideoCache] Failed to get cache stats:', error);
      return {
        metadataCacheSize: 0,
        urlCacheSize: 0,
        totalCacheAge: 0,
      };
    }
  }
}

export default VideoCacheService;