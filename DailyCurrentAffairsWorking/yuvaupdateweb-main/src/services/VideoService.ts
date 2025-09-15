// VideoService with Firebase integration
import { VideoReel } from '../types/types';

export class VideoService {
  private static readonly VIDEOS_STORAGE_KEY = 'daily_current_affairs_videos';
  private static readonly USE_FIREBASE = true; // Now using Firebase for cross-platform sync

  /**
   * Debug: Show videos in localStorage
   */
  static debugLocalStorage(): void {
    console.log('🔍 DEBUGGING LOCALSTORAGE:');
    console.log('Current storage key:', this.VIDEOS_STORAGE_KEY);
    
    // Check all localStorage keys
    console.log('All localStorage keys:');
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        allKeys.push(key);
        console.log(`  - ${key}: ${value ? `${value.length} chars` : 'null'}`);
        
        // Check for any video-related content
        if (key.toLowerCase().includes('video') || key.toLowerCase().includes('reel') || key.toLowerCase().includes('media')) {
          console.log(`    🎥 Video-related key found: ${key}`);
          try {
            const parsed = value ? JSON.parse(value) : null;
            if (Array.isArray(parsed)) {
              console.log(`    📊 Contains ${parsed.length} items`);
              parsed.forEach((item, index) => {
                if (item && typeof item === 'object') {
                  console.log(`      Item ${index + 1}:`, {
                    id: item.id,
                    title: item.title || item.headline,
                    url: item.videoUrl || item.youtubeUrl,
                    type: typeof item
                  });
                }
              });
            } else if (parsed && typeof parsed === 'object') {
              console.log(`    📄 Single object:`, Object.keys(parsed));
            }
          } catch (e) {
            console.log('    ⚠️ Not JSON data or parsing error:', e.message);
          }
        }
        
        // Also check for any array data that might contain videos
        if (value && value.startsWith('[') && value.includes('videoUrl')) {
          console.log(`    🎬 Potential video array found in key: ${key}`);
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              console.log(`    📊 Contains ${parsed.length} items with videoUrl`);
              parsed.forEach((item, index) => {
                if (item && item.videoUrl) {
                  console.log(`      Video ${index + 1}: ${item.title || 'No title'} - ${item.videoUrl}`);
                }
              });
            }
          } catch (e) {
            console.log('    ⚠️ Error parsing potential video array');
          }
        }
      }
    }
    
    console.log(`📝 Total localStorage keys: ${allKeys.length}`);
    console.log('All keys:', allKeys);
    
    const videos = this.getStoredVideos();
    console.log(`📊 Videos in current key '${this.VIDEOS_STORAGE_KEY}':`, videos.length);
    videos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title} (ID: ${video.id})`);
      console.log(`   URL: ${video.videoUrl}`);
      console.log(`   Platform: ${video.originalSource?.sourcePlatform || 'Unknown'}`);
    });
  }

  /**
   * Search for videos in any localStorage key
   */
  static findAllVideosInStorage(): VideoReel[] {
    console.log('🔍 Searching for videos in all localStorage keys...');
    const allVideos: VideoReel[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              // Check if this looks like a video array
              const videos = parsed.filter(item => 
                item && 
                typeof item === 'object' && 
                (item.videoUrl || item.embedUrl) &&
                item.title
              );
              
              if (videos.length > 0) {
                console.log(`✅ Found ${videos.length} videos in key: ${key}`);
                allVideos.push(...videos);
              }
            }
          }
        } catch (e) {
          // Not JSON, skip
        }
      }
    }
    
    console.log(`🎉 Total videos found across all keys: ${allVideos.length}`);
    return allVideos;
  }

  /**
   * Migrate videos from localStorage to Firebase
   */
  static async migrateToFirebase(): Promise<void> {
    try {
      // First try the current key
      let localVideos = this.getStoredVideos();
      
      // If no videos in current key, search all keys
      if (localVideos.length === 0) {
        console.log('🔄 No videos in current key, searching all localStorage keys...');
        localVideos = this.findAllVideosInStorage();
      }
      
      console.log(`🔄 Found ${localVideos.length} videos to migrate`);
      
      if (localVideos.length === 0) {
        console.log('⚠️ No videos found anywhere in localStorage to migrate');
        console.log('💡 Try adding a video through the admin panel first, then migrate');
        return;
      }

      const { VideoService: FirebaseVideoService } = await import('./VideoServiceFirebase');
      
      let successCount = 0;
      for (const video of localVideos) {
        try {
          // Remove id from video data as Firebase will generate new ones
          const { id, ...videoData } = video;
          
          // Ensure required fields exist
          if (!videoData.title || !videoData.videoUrl) {
            console.warn(`⚠️ Skipping video with missing required fields:`, video);
            continue;
          }
          
          const newId = await FirebaseVideoService.addVideo(videoData);
          console.log(`✅ Migrated video "${video.title}" to Firebase with new ID: ${newId}`);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to migrate video "${video.title}":`, error);
        }
      }
      
      console.log(`🎉 Migration completed! Successfully migrated ${successCount}/${localVideos.length} videos`);
      console.log('💡 You can now enable Firebase in VideoService by setting USE_FIREBASE = true');
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }

  static async addVideo(videoData: Omit<VideoReel, 'id' | 'timestamp' | 'views' | 'likes' | 'shares' | 'comments' | 'likedBy'>): Promise<string | number> {
    if (this.USE_FIREBASE) {
      try {
        const { VideoService: FirebaseVideoService } = await import('./VideoServiceFirebase');
        return await FirebaseVideoService.addVideo(videoData);
      } catch (error) {
        console.warn('Firebase not available, falling back to localStorage');
      }
    }

    const videos = this.getStoredVideos();
    const newVideo: VideoReel = {
      id: `video_${Date.now()}`,
      ...videoData,
      timestamp: new Date().toISOString(),
      views: 0,
      likes: 0,
      likedBy: [],
      shares: 0,
      comments: 0,
      isActive: true,
      moderationStatus: 'approved' // Auto-approve for admin uploads
    };
    
    videos.unshift(newVideo);
    this.saveVideos(videos);
    return newVideo.id;
  }

  static async getVideos(pageSize: number = 20, lastDoc?: any): Promise<{
    videos: VideoReel[];
    lastDoc: any;
    hasMore: boolean;
  }> {
    if (this.USE_FIREBASE) {
      try {
        const { VideoService: FirebaseVideoService } = await import('./VideoServiceFirebase');
        return await FirebaseVideoService.getVideos(pageSize, lastDoc);
      } catch (error) {
        console.warn('Firebase not available, falling back to localStorage');
      }
    }

    const allVideos = this.getStoredVideos();
    console.log(`📹 getVideos: Found ${allVideos.length} videos in localStorage`);
    const startIndex = lastDoc?.index || 0;
    const endIndex = Math.min(startIndex + pageSize, allVideos.length);
    const videos = allVideos.slice(startIndex, endIndex);
    
    console.log(`📹 getVideos: Returning ${videos.length} videos (${startIndex}-${endIndex-1})`);
    return {
      videos,
      lastDoc: endIndex < allVideos.length ? { index: endIndex } : null,
      hasMore: endIndex < allVideos.length
    };
  }

  static async deleteVideo(videoId: string): Promise<void> {
    if (this.USE_FIREBASE) {
      try {
        const { VideoService: FirebaseVideoService } = await import('./VideoServiceFirebase');
        await FirebaseVideoService.deleteVideo(videoId);
        return;
      } catch (error) {
        console.warn('Firebase not available, falling back to localStorage');
      }
    }

    const videos = this.getStoredVideos();
    const updatedVideos = videos.filter(video => video.id !== videoId);
    this.saveVideos(updatedVideos);
  }

  static async updateVideo(videoId: string, updates: Partial<VideoReel>): Promise<void> {
    if (this.USE_FIREBASE) {
      try {
        const { VideoService: FirebaseVideoService } = await import('./VideoServiceFirebase');
        await FirebaseVideoService.updateVideo(videoId, updates);
        return;
      } catch (error) {
        console.warn('Firebase not available, falling back to localStorage');
      }
    }

    const videos = this.getStoredVideos();
    const videoIndex = videos.findIndex(video => video.id === videoId);
    
    if (videoIndex === -1) {
      throw new Error(`Video with ID ${videoId} not found`);
    }

    // Update the video with new data, preserving existing fields
    videos[videoIndex] = {
      ...videos[videoIndex],
      ...updates,
      id: videoId, // Ensure ID doesn't change
      timestamp: videos[videoIndex].timestamp, // Preserve original timestamp
    };

    this.saveVideos(videos);
  }

  private static getStoredVideos(): VideoReel[] {
    try {
      const stored = localStorage.getItem(this.VIDEOS_STORAGE_KEY);
      const videos = stored ? JSON.parse(stored) : [];
      console.log(`📦 localStorage key '${this.VIDEOS_STORAGE_KEY}' contains ${videos.length} videos`);
      return videos;
    } catch (error) {
      console.error('Error reading videos from localStorage:', error);
      return [];
    }
  }

  static async toggleVideoLike(videoId: string, userId: string): Promise<boolean> {
    if (this.USE_FIREBASE) {
      try {
        const { VideoService: FirebaseVideoService } = await import('./VideoServiceFirebase');
        return await FirebaseVideoService.toggleVideoLike(videoId, userId);
      } catch (error) {
        console.warn('Firebase not available, falling back to localStorage');
      }
    }

    const videos = this.getStoredVideos();
    const videoIndex = videos.findIndex(video => video.id.toString() === videoId);
    if (videoIndex !== -1) {
      const video = videos[videoIndex];
      const likedBy = video.likedBy || [];
      const isLiked = likedBy.includes(userId);
      
      if (isLiked) {
        video.likes = (video.likes || 0) - 1;
        video.likedBy = likedBy.filter(id => id !== userId);
      } else {
        video.likes = (video.likes || 0) + 1;
        video.likedBy = [...likedBy, userId];
      }
      
      this.saveVideos(videos);
      return !isLiked;
    }
    return false;
  }

  static async trackVideoShare(videoId: string, userId: string): Promise<void> {
    if (this.USE_FIREBASE) {
      try {
        const { VideoService: FirebaseVideoService } = await import('./VideoServiceFirebase');
        await FirebaseVideoService.trackVideoShare(videoId, userId);
        return;
      } catch (error) {
        console.warn('Firebase not available, falling back to localStorage');
      }
    }

    const videos = this.getStoredVideos();
    const videoIndex = videos.findIndex(video => video.id.toString() === videoId);
    if (videoIndex !== -1) {
      videos[videoIndex].shares = (videos[videoIndex].shares || 0) + 1;
      this.saveVideos(videos);
    }
  }

  private static saveVideos(videos: VideoReel[]): void {
    try {
      localStorage.setItem(this.VIDEOS_STORAGE_KEY, JSON.stringify(videos));
    } catch (error) {
      console.error('Error saving videos to localStorage:', error);
    }
  }
}
