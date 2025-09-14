import firestore from '@react-native-firebase/firestore';
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

      const docRef = await firestore().collection(this.VIDEOS_COLLECTION).add(newVideo);
      console.log('✅ Video added successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to add video:', error);
      throw error;
    }
  }

  /**
   * Get videos with pagination
   */
  static async getVideos(pageSize: number = 20, lastDoc?: any): Promise<{
    videos: VideoReel[];
    lastDoc: any;
    hasMore: boolean;
  }> {
    try {
      let videosQuery = firestore()
        .collection(this.VIDEOS_COLLECTION)
        .where('isActive', '==', true)
        .orderBy('timestamp', 'desc')
        .limit(pageSize);

      if (lastDoc) {
        videosQuery = videosQuery.startAfter(lastDoc);
      }

      const snapshot = await videosQuery.get();
      const videos: VideoReel[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as VideoReel));

      const lastDocument = snapshot.docs[snapshot.docs.length - 1] || null;
      const hasMore = snapshot.docs.length === pageSize;

      console.log(`📹 Loaded ${videos.length} videos`);
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
      const snapshot = await firestore()
        .collection(this.VIDEOS_COLLECTION)
        .where('isActive', '==', true)
        .where('category', '==', category)
        .orderBy('timestamp', 'desc')
        .limit(pageSize)
        .get();

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
   * Track video view
   */
  static async trackVideoView(videoId: string, userId: string): Promise<void> {
    try {
      const batch = firestore().batch();

      // Update video view count
      const videoRef = firestore().collection(this.VIDEOS_COLLECTION).doc(videoId);
      batch.update(videoRef, {
        views: firestore.FieldValue.increment(1)
      });

      // Add engagement record
      const engagementRef = firestore().collection(this.ENGAGEMENT_COLLECTION).doc(`${videoId}_${userId}_view_${Date.now()}`);
      batch.set(engagementRef, {
        videoId,
        userId,
        type: 'view',
        timestamp: new Date().toISOString()
      });

      await batch.commit();
      console.log('📊 Video view tracked:', videoId);
    } catch (error) {
      console.error('❌ Failed to track video view:', error);
      // Don't throw - view tracking shouldn't break user experience
    }
  }

  /**
   * Toggle video like
   */
  static async toggleVideoLike(videoId: string, userId: string): Promise<boolean> {
    try {
      const videoRef = firestore().collection(this.VIDEOS_COLLECTION).doc(videoId);
      const videoDoc = await videoRef.get();
      
      if (!videoDoc.exists) {
        throw new Error('Video not found');
      }

      const videoData = videoDoc.data() as VideoReel;
      const likedBy = videoData.likedBy || [];
      const isCurrentlyLiked = likedBy.includes(userId);
      
      const batch = firestore().batch();

      if (isCurrentlyLiked) {
        // Unlike
        batch.update(videoRef, {
          likes: firestore.FieldValue.increment(-1),
          likedBy: firestore.FieldValue.arrayRemove(userId)
        });
      } else {
        // Like
        batch.update(videoRef, {
          likes: firestore.FieldValue.increment(1),
          likedBy: firestore.FieldValue.arrayUnion(userId)
        });
      }

      // Add engagement record
      const engagementRef = firestore().collection(this.ENGAGEMENT_COLLECTION).doc(`${videoId}_${userId}_like_${Date.now()}`);
      batch.set(engagementRef, {
        videoId,
        userId,
        type: isCurrentlyLiked ? 'unlike' : 'like',
        timestamp: new Date().toISOString()
      });

      await batch.commit();
      console.log(`📊 Video ${isCurrentlyLiked ? 'unliked' : 'liked'}:`, videoId);
      return !isCurrentlyLiked;
    } catch (error) {
      console.error('❌ Failed to toggle video like:', error);
      throw error;
    }
  }

  /**
   * Track video share
   */
  static async trackVideoShare(videoId: string, userId: string): Promise<void> {
    try {
      const batch = firestore().batch();

      // Update video share count
      const videoRef = firestore().collection(this.VIDEOS_COLLECTION).doc(videoId);
      batch.update(videoRef, {
        shares: firestore.FieldValue.increment(1)
      });

      // Add engagement record
      const engagementRef = firestore().collection(this.ENGAGEMENT_COLLECTION).doc(`${videoId}_${userId}_share_${Date.now()}`);
      batch.set(engagementRef, {
        videoId,
        userId,
        type: 'share',
        timestamp: new Date().toISOString()
      });

      await batch.commit();
      console.log('📊 Video share tracked:', videoId);
    } catch (error) {
      console.error('❌ Failed to track video share:', error);
      // Don't throw - share tracking shouldn't break user experience
    }
  }

  /**
   * Get video by ID
   */
  static async getVideoById(videoId: string): Promise<VideoReel | null> {
    try {
      const doc = await firestore().collection(this.VIDEOS_COLLECTION).doc(videoId).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      } as VideoReel;
    } catch (error) {
      console.error('❌ Failed to get video by ID:', error);
      throw error;
    }
  }

  /**
   * Update video
   */
  static async updateVideo(videoId: string, updates: Partial<VideoReel>): Promise<void> {
    try {
      await firestore().collection(this.VIDEOS_COLLECTION).doc(videoId).update(updates);
      console.log('✅ Video updated successfully:', videoId);
    } catch (error) {
      console.error('❌ Failed to update video:', error);
      throw error;
    }
  }

  /**
   * Delete video (soft delete by setting isActive to false)
   */
  static async deleteVideo(videoId: string): Promise<void> {
    try {
      await firestore().collection(this.VIDEOS_COLLECTION).doc(videoId).update({
        isActive: false,
        deletedAt: new Date().toISOString()
      });
      console.log('✅ Video deleted successfully:', videoId);
    } catch (error) {
      console.error('❌ Failed to delete video:', error);
      throw error;
    }
  }

  /**
   * Get video analytics
   */
  static async getVideoAnalytics(videoId: string): Promise<{
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    engagementRate: number;
  }> {
    try {
      const video = await this.getVideoById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      const views = video.views || 0;
      const likes = video.likes || 0;
      const shares = video.shares || 0;
      
      const engagementRate = views > 0 ? ((likes + shares) / views) * 100 : 0;

      return {
        totalViews: views,
        totalLikes: likes,
        totalShares: shares,
        engagementRate: Math.round(engagementRate * 100) / 100
      };
    } catch (error) {
      console.error('❌ Failed to get video analytics:', error);
      throw error;
    }
  }

  /**
   * Get trending videos (high engagement in last 24h)
   */
  static async getTrendingVideos(pageSize: number = 10): Promise<VideoReel[]> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const snapshot = await firestore()
        .collection(this.VIDEOS_COLLECTION)
        .where('isActive', '==', true)
        .where('timestamp', '>=', yesterday.toISOString())
        .orderBy('timestamp', 'desc')
        .orderBy('likes', 'desc')
        .limit(pageSize)
        .get();

      const videos: VideoReel[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as VideoReel));

      console.log(`🔥 Loaded ${videos.length} trending videos`);
      return videos;
    } catch (error) {
      console.error('❌ Failed to get trending videos:', error);
      throw error;
    }
  }
}