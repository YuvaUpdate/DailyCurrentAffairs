import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where, 
  limit,
  startAfter,
  getDoc,
  increment,
  serverTimestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase.config';
import { VideoReel, VideoEngagement } from './types';

export class VideoService {
  private static readonly VIDEOS_COLLECTION = 'video_reels';
  private static readonly ENGAGEMENT_COLLECTION = 'video_engagement';

  /**
   * Add a new video reel
   */
  static async addVideo(videoData: Omit<VideoReel, 'id' | 'timestamp' | 'views' | 'likes' | 'shares' | 'comments' | 'likedBy'>): Promise<string> {
    try {
      const newVideo: Omit<VideoReel, 'id'> = {
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

      const docRef = await addDoc(collection(db, this.VIDEOS_COLLECTION), newVideo);
      console.log('✅ Video added successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to add video:', error);
      throw error;
    }
  }

  /**
   * Get all videos with pagination
   */
  static async getVideos(pageSize: number = 20, lastDoc?: DocumentSnapshot): Promise<{
    videos: VideoReel[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      console.log('🚀 [VideoService] Fetching videos with optimized query...');
      
      let videosQuery = query(
        collection(db, this.VIDEOS_COLLECTION),
        where('isActive', '==', true),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );

      if (lastDoc) {
        videosQuery = query(videosQuery, startAfter(lastDoc));
      }

      const snapshot = await getDocs(videosQuery);
      const videos: VideoReel[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as VideoReel));

      const lastDocument = snapshot.docs[snapshot.docs.length - 1] || null;
      const hasMore = snapshot.docs.length === pageSize;

      console.log(`📹 Loaded ${videos.length} videos in optimized mode`);
      return { videos, lastDoc: lastDocument, hasMore };
    } catch (error) {
      console.error('❌ Failed to get videos:', error);
      throw error;
    }
  }

  /**
   * Get videos by category
   */
  static async getVideosByCategory(category: string, pageSize: number = 20): Promise<VideoReel[]> {
    try {
      const videosQuery = query(
        collection(db, this.VIDEOS_COLLECTION),
        where('isActive', '==', true),
        where('category', '==', category),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );

      const snapshot = await getDocs(videosQuery);
      const videos: VideoReel[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as VideoReel));

      console.log(`📹 Loaded ${videos.length} videos for category: ${category}`);
      return videos;
    } catch (error) {
      console.error('❌ Failed to get videos by category:', error);
      throw error;
    }
  }

  /**
   * Get featured videos
   */
  static async getFeaturedVideos(pageSize: number = 10): Promise<VideoReel[]> {
    try {
      const videosQuery = query(
        collection(db, this.VIDEOS_COLLECTION),
        where('isActive', '==', true),
        where('isFeatured', '==', true),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );

      const snapshot = await getDocs(videosQuery);
      const videos: VideoReel[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as VideoReel));

      console.log(`🌟 Loaded ${videos.length} featured videos`);
      return videos;
    } catch (error) {
      console.error('❌ Failed to get featured videos:', error);
      throw error;
    }
  }

  /**
   * Update video
   */
  static async updateVideo(videoId: string, updates: Partial<VideoReel>): Promise<void> {
    try {
      const videoRef = doc(db, this.VIDEOS_COLLECTION, videoId);
      await updateDoc(videoRef, updates);
      console.log('✅ Video updated successfully:', videoId);
    } catch (error) {
      console.error('❌ Failed to update video:', error);
      throw error;
    }
  }

  /**
   * Delete video (soft delete)
   */
  static async deleteVideo(videoId: string): Promise<void> {
    try {
      const videoRef = doc(db, this.VIDEOS_COLLECTION, videoId);
      await updateDoc(videoRef, { isActive: false });
      console.log('✅ Video deleted successfully:', videoId);
    } catch (error) {
      console.error('❌ Failed to delete video:', error);
      throw error;
    }
  }

  /**
   * Track video view
   */
  static async trackVideoView(videoId: string, userId?: string, watchDuration?: number): Promise<void> {
    try {
      // Increment view count
      const videoRef = doc(db, this.VIDEOS_COLLECTION, videoId);
      await updateDoc(videoRef, {
        views: increment(1)
      });

      // Track engagement if user ID provided
      if (userId) {
        const engagement: Omit<VideoEngagement, 'id'> = {
          videoId,
          userId,
          action: 'view',
          timestamp: new Date().toISOString(),
          metadata: {
            watchDuration,
            deviceInfo: 'mobile' // Can be enhanced with actual device info
          }
        };

        await addDoc(collection(db, this.ENGAGEMENT_COLLECTION), engagement);
      }

      console.log('📊 Video view tracked:', videoId);
    } catch (error) {
      console.error('❌ Failed to track video view:', error);
    }
  }

  /**
   * Like/Unlike video
   */
  static async toggleVideoLike(videoId: string, userId: string): Promise<boolean> {
    try {
      const videoRef = doc(db, this.VIDEOS_COLLECTION, videoId);
      const videoDoc = await getDoc(videoRef);
      
      if (!videoDoc.exists()) {
        throw new Error('Video not found');
      }

      const videoData = videoDoc.data() as VideoReel;
      const likedBy = videoData.likedBy || [];
      const isLiked = likedBy.includes(userId);

      if (isLiked) {
        // Unlike
        await updateDoc(videoRef, {
          likes: increment(-1),
          likedBy: likedBy.filter(id => id !== userId)
        });
      } else {
        // Like
        await updateDoc(videoRef, {
          likes: increment(1),
          likedBy: [...likedBy, userId]
        });

        // Track engagement
        const engagement: Omit<VideoEngagement, 'id'> = {
          videoId,
          userId,
          action: 'like',
          timestamp: new Date().toISOString()
        };
        await addDoc(collection(db, this.ENGAGEMENT_COLLECTION), engagement);
      }

      console.log(`${isLiked ? '💔' : '❤️'} Video like toggled:`, videoId);
      return !isLiked; // Return new like status
    } catch (error) {
      console.error('❌ Failed to toggle video like:', error);
      throw error;
    }
  }

  /**
   * Track video share
   */
  static async trackVideoShare(videoId: string, userId?: string, shareMethod?: string): Promise<void> {
    try {
      // Increment share count
      const videoRef = doc(db, this.VIDEOS_COLLECTION, videoId);
      await updateDoc(videoRef, {
        shares: increment(1)
      });

      // Track engagement if user ID provided
      if (userId) {
        const engagement: Omit<VideoEngagement, 'id'> = {
          videoId,
          userId,
          action: 'share',
          timestamp: new Date().toISOString(),
          metadata: {
            shareMethod: shareMethod as any
          }
        };

        await addDoc(collection(db, this.ENGAGEMENT_COLLECTION), engagement);
      }

      console.log('📤 Video share tracked:', videoId);
    } catch (error) {
      console.error('❌ Failed to track video share:', error);
    }
  }

  /**
   * Get video analytics for admin
   */
  static async getVideoAnalytics(videoId: string): Promise<{
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    engagementRate: number;
    avgWatchDuration: number;
  }> {
    try {
      const videoRef = doc(db, this.VIDEOS_COLLECTION, videoId);
      const videoDoc = await getDoc(videoRef);
      
      if (!videoDoc.exists()) {
        throw new Error('Video not found');
      }

      const videoData = videoDoc.data() as VideoReel;
      
      // Get engagement data
      const engagementQuery = query(
        collection(db, this.ENGAGEMENT_COLLECTION),
        where('videoId', '==', videoId)
      );
      const engagementSnapshot = await getDocs(engagementQuery);
      
      let totalWatchDuration = 0;
      let viewsWithDuration = 0;
      
      engagementSnapshot.docs.forEach(doc => {
        const engagement = doc.data() as VideoEngagement;
        if (engagement.action === 'view' && engagement.metadata?.watchDuration) {
          totalWatchDuration += engagement.metadata.watchDuration;
          viewsWithDuration++;
        }
      });

      const avgWatchDuration = viewsWithDuration > 0 ? totalWatchDuration / viewsWithDuration : 0;
      const engagementActions = videoData.likes + videoData.shares + videoData.comments;
      const engagementRate = videoData.views > 0 ? (engagementActions / videoData.views) * 100 : 0;

      return {
        totalViews: videoData.views,
        totalLikes: videoData.likes,
        totalShares: videoData.shares,
        totalComments: videoData.comments,
        engagementRate: Math.round(engagementRate * 100) / 100,
        avgWatchDuration: Math.round(avgWatchDuration)
      };
    } catch (error) {
      console.error('❌ Failed to get video analytics:', error);
      throw error;
    }
  }
}

export default VideoService;