// Simple mock VideoService for web testing - replace with actual web Firebase implementation
import { VideoReel } from './types';

export class VideoService {
  /**
   * Get videos with pagination - Mock implementation for web testing
   */
  static async getVideos(pageSize: number = 20, lastDoc?: any): Promise<{
    videos: VideoReel[];
    lastDoc: any;
    hasMore: boolean;
  }> {
    try {
      // Mock data for testing
      const mockVideos: VideoReel[] = [
        {
          id: '1',
          title: 'Sample Video 1',
          description: 'This is a sample video for testing the video feed',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnailUrl: 'https://via.placeholder.com/300x400.png?text=Video+1',
          category: 'Entertainment',
          tags: ['sample', 'test'],
          originalSource: {
            sourcePlatform: 'Instagram',
            sourceUrl: 'https://instagram.com/sample',
            creatorName: 'Sample Creator',
            creatorHandle: 'samplecreator'
          },
          timestamp: new Date().toISOString(),
          views: 1234,
          likes: 89,
          likedBy: [],
          shares: 12,
          comments: 34,
          duration: 30,
          resolution: '1080p',
          uploadedBy: 'admin',
          aspectRatio: '9:16',
          isFeatured: false,
          isActive: true,
          moderationStatus: 'approved'
        },
        {
          id: '2',
          title: 'Sample Video 2',
          description: 'Another sample video for testing',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          thumbnailUrl: 'https://via.placeholder.com/300x400.png?text=Video+2',
          category: 'Technology',
          tags: ['tech', 'demo'],
          originalSource: {
            sourcePlatform: 'TikTok',
            sourceUrl: 'https://tiktok.com/@sample',
            creatorName: 'Tech Creator',
            creatorHandle: 'techcreator'
          },
          timestamp: new Date().toISOString(),
          views: 5678,
          likes: 234,
          likedBy: [],
          shares: 45,
          comments: 67,
          duration: 45,
          resolution: '1080p',
          uploadedBy: 'editor1',
          aspectRatio: '9:16',
          isFeatured: true,
          isActive: true,
          moderationStatus: 'approved'
        }
      ];

      console.log(`📹 Loaded ${mockVideos.length} mock videos for web testing`);
      return { 
        videos: mockVideos, 
        lastDoc: null, 
        hasMore: false 
      };
    } catch (error) {
      console.error('❌ Failed to get mock videos:', error);
      throw error;
    }
  }

  /**
   * Track video view - Mock implementation
   */
  static async trackVideoView(videoId: string, userId: string): Promise<void> {
    console.log(`📊 Mock: Video view tracked for ${videoId} by ${userId}`);
  }

  /**
   * Toggle video like - Mock implementation
   */
  static async toggleVideoLike(videoId: string, userId: string): Promise<boolean> {
    console.log(`📊 Mock: Video like toggled for ${videoId} by ${userId}`);
    return Math.random() > 0.5; // Random like state
  }

  /**
   * Track video share - Mock implementation
   */
  static async trackVideoShare(videoId: string, userId: string): Promise<void> {
    console.log(`📊 Mock: Video share tracked for ${videoId} by ${userId}`);
  }

  /**
   * Get video by ID - Mock implementation
   */
  static async getVideoById(videoId: string): Promise<VideoReel | null> {
    const mockVideo: VideoReel = {
      id: videoId,
      title: `Mock Video ${videoId}`,
      description: 'Mock video for testing',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnailUrl: 'https://via.placeholder.com/300x400.png?text=Mock+Video',
      category: 'Test',
      tags: ['mock', 'test'],
      originalSource: {
        sourcePlatform: 'Other',
        sourceUrl: 'https://example.com',
        creatorName: 'Mock Creator',
        creatorHandle: 'mockcreator'
      },
      timestamp: new Date().toISOString(),
      views: 100,
      likes: 10,
      likedBy: [],
      shares: 2,
      comments: 5,
      duration: 30,
      resolution: '1080p',
      uploadedBy: 'system',
      aspectRatio: '9:16',
      isFeatured: false,
      isActive: true,
      moderationStatus: 'approved'
    };
    
    return mockVideo;
  }
}