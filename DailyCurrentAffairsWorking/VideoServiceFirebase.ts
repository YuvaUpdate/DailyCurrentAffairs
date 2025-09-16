// Firebase VideoService for React Native web - syncs with React Native app
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
import { VideoReel } from './types';

export class VideoService {
  private static readonly VIDEOS_COLLECTION = 'video_reels';
  private static readonly ENGAGEMENT_COLLECTION = 'video_engagement';

  /**
   * Validate if a video URL is safe and playable
   */
  private static isValidVideoUrl(url: string): boolean {
    if (!url || url.trim() === '') return false;
    
    // Check for basic URL structure
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(url)) return false;
    
    // Blocked/problematic domains that cause CORS or other issues
    const blockedDomains = [
      'tomp3.cc',
      'youtube-downloader',
      'y2mate',
      'savefrom',
      'dmate4.online',
      'dl188',
      'yt-dlp'
    ];
    
    const isBlocked = blockedDomains.some(domain => url.toLowerCase().includes(domain));
    if (isBlocked) return false;
    
    // Check for supported video formats, YouTube, or iframe-embeddable sources
    const supportedFormats = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
    const hasValidFormat = supportedFormats.some(format => url.toLowerCase().includes(format));
    
    // YouTube URL patterns
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/,
      /youtube\.com\/.*[?&]v=/,
    ];
    const isYouTube = youtubePatterns.some(pattern => pattern.test(url));
    
    // Iframe-embeddable domains (more flexible matching)
    const iframeDomains = [
      'mega.nz',
      'drive.google.com',
      'dropbox.com',
      'vimeo.com',
      'dailymotion.com',
      'streamable.com',
      'archive.org'
    ];
    const isIframeEmbeddable = iframeDomains.some(domain => url.toLowerCase().includes(domain));
    
    return hasValidFormat || isYouTube || isIframeEmbeddable;
  }

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
      console.log('🔥 VideoServiceFirebase: Attempting to fetch videos from Firebase...');
      
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
        
        // Validate video URL before adding to results
        const videoUrl = data.videoUrl || '';
        const isValidUrl = this.isValidVideoUrl(videoUrl);
        
        if (isValidUrl) {
          videos.push({
            id: doc.id,
            ...data,
            // Convert Firestore timestamp to string if needed
            timestamp: data.timestamp?.toDate?.() ? data.timestamp.toDate().toISOString() : data.timestamp
          } as VideoReel);
        } else {
          console.warn('🚫 VideoService: Filtered out invalid video URL:', videoUrl);
        }
      });

      const lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      const hasMore = querySnapshot.docs.length === pageSize;

      console.log(`✅ VideoServiceFirebase: Loaded ${videos.length} videos from Firebase successfully`);
      return { videos, lastDoc: lastDocument, hasMore };
    } catch (error) {
      console.error('❌ VideoServiceFirebase: Error fetching videos from Firebase:', error);
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

  /**
   * Identify videos with problematic URLs for admin review
   */
  static async getVideosWithInvalidUrls(): Promise<VideoReel[]> {
    try {
      const { videos } = await this.getVideos(100); // Get more videos for analysis
      
      const invalidVideos = videos.filter(video => !this.isValidVideoUrl(video.videoUrl));
      
      console.log(`🔍 Found ${invalidVideos.length} videos with invalid URLs:`, 
        invalidVideos.map(v => ({ id: v.id, title: v.title, url: v.videoUrl })));
      
      return invalidVideos;
    } catch (error) {
      console.error('❌ Error analyzing video URLs:', error);
      throw error;
    }
  }
}