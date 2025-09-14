// Firebase VideoService for web - syncs with React Native app
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
import { VideoReel } from '../types/types';

export class VideoService {
  private static readonly VIDEOS_COLLECTION = 'video_reels';
  private static readonly ENGAGEMENT_COLLECTION = 'video_engagement';

  /**
   * Clean object by removing undefined values recursively
   */
  private static cleanObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObject(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanObject(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  /**
   * Add a new video reel to Firebase
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

      // Clean the data to remove undefined values
      const cleanedVideo = this.cleanObject(newVideo);
      console.log('📤 Adding video with cleaned data:', cleanedVideo);

      const docRef = await addDoc(collection(db, this.VIDEOS_COLLECTION), cleanedVideo);
      console.log('✅ Video added to Firebase with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding video to Firebase:', error);
      throw error;
    }
  }

  /**
   * Get videos with pagination from Firebase
   */
  static async getVideos(pageSize: number = 20, lastDoc?: DocumentSnapshot): Promise<{
    videos: VideoReel[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      let q = query(
        collection(db, this.VIDEOS_COLLECTION),
        where('isActive', '==', true),
        orderBy('timestamp', 'desc'),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(
          collection(db, this.VIDEOS_COLLECTION),
          where('isActive', '==', true),
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );
      }

      const querySnapshot = await getDocs(q);
      const videos: VideoReel[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        videos.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamp to string if needed
          timestamp: data.timestamp?.toDate?.() ? data.timestamp.toDate().toISOString() : data.timestamp
        } as VideoReel);
      });

      const lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      const hasMore = querySnapshot.docs.length === pageSize;

      console.log(`📹 Loaded ${videos.length} videos from Firebase`);
      return { videos, lastDoc: lastDocument, hasMore };
    } catch (error) {
      console.error('❌ Error fetching videos from Firebase:', error);
      throw error;
    }
  }

  /**
   * Get video by ID from Firebase
   */
  static async getVideoById(videoId: string): Promise<VideoReel | null> {
    try {
      const docRef = doc(db, this.VIDEOS_COLLECTION, videoId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() ? data.timestamp.toDate().toISOString() : data.timestamp
        } as VideoReel;
      } else {
        console.log(`📹 Video ${videoId} not found`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error retrieving video:', error);
      return null;
    }
  }

  /**
   * Delete a video from Firebase
   */
  static async deleteVideo(videoId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.VIDEOS_COLLECTION, videoId));
      console.log(`✅ Video ${videoId} deleted from Firebase`);
    } catch (error) {
      console.error('❌ Error deleting video:', error);
      throw error;
    }
  }

  /**
   * Update video in Firebase
   */
  static async updateVideo(videoId: string, updates: Partial<VideoReel>): Promise<void> {
    try {
      const docRef = doc(db, this.VIDEOS_COLLECTION, videoId);
      await updateDoc(docRef, updates);
      console.log(`✅ Video ${videoId} updated in Firebase`);
    } catch (error) {
      console.error('❌ Error updating video:', error);
      throw error;
    }
  }

  /**
   * Track video view
   */
  static async trackVideoView(videoId: string, userId: string): Promise<void> {
    try {
      // Update view count
      const videoRef = doc(db, this.VIDEOS_COLLECTION, videoId);
      await updateDoc(videoRef, {
        views: increment(1)
      });
      
      // Log engagement
      await addDoc(collection(db, this.ENGAGEMENT_COLLECTION), {
        videoId,
        userId,
        action: 'view',
        timestamp: serverTimestamp()
      });
      
      console.log(`📊 Video view tracked for ${videoId} by ${userId}`);
    } catch (error) {
      console.error('❌ Error tracking video view:', error);
    }
  }

  /**
   * Toggle video like
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
      }
      
      // Log engagement
      await addDoc(collection(db, this.ENGAGEMENT_COLLECTION), {
        videoId,
        userId,
        action: isLiked ? 'unlike' : 'like',
        timestamp: serverTimestamp()
      });
      
      console.log(`📊 Video like toggled for ${videoId} by ${userId}`);
      return !isLiked;
    } catch (error) {
      console.error('❌ Error toggling video like:', error);
      throw error;
    }
  }

  /**
   * Track video share
   */
  static async trackVideoShare(videoId: string, userId: string): Promise<void> {
    try {
      // Update share count
      const videoRef = doc(db, this.VIDEOS_COLLECTION, videoId);
      await updateDoc(videoRef, {
        shares: increment(1)
      });
      
      // Log engagement
      await addDoc(collection(db, this.ENGAGEMENT_COLLECTION), {
        videoId,
        userId,
        action: 'share',
        timestamp: serverTimestamp()
      });
      
      console.log(`📊 Video share tracked for ${videoId} by ${userId}`);
    } catch (error) {
      console.error('❌ Error tracking video share:', error);
    }
  }
}