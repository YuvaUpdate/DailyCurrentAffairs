import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Share,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoReel } from './types';
import YouTubeVideoPlayer, { YouTubeVideoPlayerRef } from './YouTubeVideoPlayer';
import VideoCacheService from './VideoCacheService';

// Types for web video component
interface WebVideoProps {
  source?: { uri: string };
  style?: any;
  onLoadStart?: () => void;
  onLoad?: () => void;
  onError?: (error: any) => void;
  shouldPlay?: boolean;
  isLooping?: boolean;
  [key: string]: any;
}

// Web-compatible video player
const WebVideo = Platform.OS === 'web' ? ({ source, style, onLoadStart, onLoad, onError, shouldPlay, isLooping, ...props }: WebVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && source?.uri) {
      const video = videoRef.current;
      
      // Set up video for better web compatibility
      video.preload = 'metadata';
      video.crossOrigin = 'anonymous';
      
      if (shouldPlay) {
        // Try to play with proper error handling
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn('Video autoplay failed:', error);
            // Fallback: just load the video without playing
            video.load();
          });
        }
      } else {
        video.pause();
      }
    }
  }, [shouldPlay, source?.uri]);

  const handleLoadStart = () => {
    onLoadStart && onLoadStart();
  };

  const handleCanPlay = () => {
    onLoad && onLoad();
  };

  const handleError = (e: any) => {
    console.error('Web video error:', e);
    console.error('Video URL that failed:', source?.uri);
    console.error('Video source type:', typeof source?.uri);
    onError && onError(e);
  };

  const handleLoadedData = () => {
    // Video is ready to play
    onLoad && onLoad();
  };

  return React.createElement('video', {
    ref: videoRef,
    src: source?.uri,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      backgroundColor: '#000',
      ...style,
    },
    loop: isLooping,
    muted: true, // Start muted for autoplay compatibility
    playsInline: true,
    controls: false,
    preload: 'metadata',
    crossOrigin: 'anonymous',
    onLoadStart: handleLoadStart,
    onCanPlay: handleCanPlay,
    onLoadedData: handleLoadedData,
    onError: handleError,
    ...props,
  });
} : null;

// Import Video and ResizeMode conditionally
let VideoComponent: any = null;
let ResizeMode: any = null;

if (Platform.OS === 'web') {
  VideoComponent = WebVideo;
  ResizeMode = { COVER: 'cover' }; // Mock ResizeMode for web
} else {
  const expoAv = require('expo-av');
  VideoComponent = expoAv.Video;
  ResizeMode = expoAv.ResizeMode;
}

// Use web-compatible Firebase service when running in browser
const VideoService = Platform.OS === 'web' 
  ? require('./VideoServiceFirebase').VideoService
  : require('./VideoServiceMobile').VideoService;

// Helper function to detect YouTube URLs
const isYouTubeUrl = (url: string): boolean => {
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/,
    /youtube\.com\/.*[?&]v=/,
  ];
  const isYT = youtubePatterns.some(pattern => pattern.test(url));
  console.log('🔍 [VideoFeed] URL check:', url, '-> YouTube:', isYT);
  return isYT;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoFeedProps {
  onClose: () => void;
  isDarkMode: boolean;
}

interface VideoItemProps {
  video: VideoReel;
  isActive: boolean;
  onPress: () => void;
  isDarkMode: boolean;
  isPreloaded?: boolean;
}

const VideoItem: React.FC<VideoItemProps> = ({ video, isActive, onPress, isDarkMode, isPreloaded = false }) => {
  const videoRef = useRef<any>(null);
  const youtubeRef = useRef<YouTubeVideoPlayerRef>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showControls, setShowControls] = useState(false);
  
  const isYouTube = useMemo(() => isYouTubeUrl(video.videoUrl), [video.videoUrl]);
  
  // Only show loading for non-YouTube videos
  const [isLoading, setIsLoading] = useState(!isYouTube);
  
  // Debug logging for video type and state
  useEffect(() => {
    console.log(`� [VideoItem] "${video.title?.substring(0, 30)}..." - YouTube: ${isYouTube}, Active: ${isActive}, Loading: ${isLoading}, Platform: ${Platform.OS}`);
  }, [isYouTube, isActive, isLoading, video.title]);

  // Force hide loading animation after 3 seconds for non-YouTube videos only
  useEffect(() => {
    if (isLoading && !isYouTube) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Force hiding loading animation after 3 seconds for video:', video.title);
        setIsLoading(false);
      }, 3000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, isYouTube, video.title]);

  useEffect(() => {
    if (isActive) {
      // Handle YouTube videos
      if (isYouTube && youtubeRef.current) {
        youtubeRef.current.play().catch((error: any) => {
          console.log('YouTube play failed:', error);
        });
      } 
      // Handle regular videos
      else if (!isYouTube && videoRef.current) {
        if (Platform.OS === 'web') {
          videoRef.current.play().catch((error: any) => {
            console.log('Video play failed:', error);
          });
        } else {
          videoRef.current.playAsync();
        }
      }
      
      // Track view
      VideoService.trackVideoView(String(video.id), 'anonymous_user');
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      // Handle pause for YouTube videos
      if (isYouTube && youtubeRef.current) {
        youtubeRef.current.pause().catch((error: any) => {
          console.log('YouTube pause failed:', error);
        });
      }
      // Handle pause for regular videos
      else if (!isYouTube && videoRef.current) {
        if (Platform.OS === 'web') {
          videoRef.current.pause();
        } else {
          videoRef.current.pauseAsync();
        }
      }
    }
  }, [isActive, video.id, fadeAnim, isYouTube]);



  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this video: ${video.title}`,
        url: video.videoUrl,
      });
      // Track share
      VideoService.trackVideoShare(String(video.id), 'anonymous_user');
    } catch (error) {
      console.error('Error sharing video:', error);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    // Hide controls after 3 seconds
    if (!showControls) {
      setTimeout(() => setShowControls(false), 3000);
    }
  };

  const theme = {
    background: isDarkMode ? '#000000' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#cccccc' : '#666666',
    overlay: 'rgba(0, 0, 0, 0.3)',
  };

  // Memoize callbacks to prevent re-renders
  const handleYouTubeLoadStart = useCallback(() => {
    // No loading state needed for YouTube videos
  }, []);

  const handleYouTubeReady = useCallback(() => {
    // YouTube videos are ready immediately
  }, []);

  const handleYouTubeError = useCallback((error: any) => {
    console.error('YouTube video error:', error);
    // No loading state management needed for YouTube
  }, []);

  return (
    <Animated.View key={`video-container-${video.id}`} style={[styles.videoContainer, { opacity: fadeAnim }]}>
      <View key={`strict-clip-${video.id}`} style={styles.strictClipContainer}>
        {isYouTube ? (
          // YouTube videos - no TouchableOpacity wrapper to allow native controls
          <View key={`youtube-container-${video.id}`} style={styles.videoTouchable}>
            <YouTubeVideoPlayer
            key={`youtube-${video.id}`} // Stable key to prevent recreation
            ref={youtubeRef}
            videoUrl={video.videoUrl}
            isActive={isActive}
            style={styles.video}
            onLoadStart={() => {
              console.log('📱 [VideoItem] YouTube onLoadStart for:', video.title?.substring(0, 30));
              handleYouTubeLoadStart();
            }}
            onReady={() => {
              console.log('📱 [VideoItem] YouTube onReady for:', video.title?.substring(0, 30));
              handleYouTubeReady();
            }}
            onError={(error) => {
              console.error('📱 [VideoItem] YouTube onError for:', video.title?.substring(0, 30), error);
              handleYouTubeError(error);
            }}
            muted={false}
          />
        </View>
      ) : (
        // Regular videos - with TouchableOpacity for controls
        <TouchableOpacity 
          key={`regular-video-${video.id}`}
          style={styles.videoTouchable} 
          activeOpacity={1} 
          onPress={toggleControls}
        >
          <VideoComponent
            key={`video-component-${video.id}`}
            ref={videoRef}
            source={{ uri: video.videoUrl }}
            style={styles.video}
            onLoadStart={() => setIsLoading(true)}
            onLoad={() => {
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
              }
              setIsLoading(false);
            }}
            onError={(error: any) => {
              console.error('Video error:', error);
              if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
              }
              setIsLoading(false);
            }}
            {...(Platform.OS === 'web' ? {
              // Web-specific props (already handled in WebVideo component)
            } : {
              // Mobile-specific props (expo-av)
              rate: 1.0,
              volume: 1.0,
              isMuted: false,
              resizeMode: ResizeMode.COVER,
              shouldPlay: isActive,
              isLooping: true,
            })}
          />
        </TouchableOpacity>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      {/* Video overlay content - YouTube gets minimal overlay, others get full overlay */}
      <View key={`overlay-${video.id}`} style={[styles.overlay, isYouTube && styles.youtubeOverlay]}>
        {/* Right side controls - only share and views */}
        <View key={`controls-${video.id}`} style={styles.rightControls}>
          {/* Share button */}
          <TouchableOpacity style={styles.controlButton} onPress={handleShare}>
            <Text style={[styles.controlIcon, { color: "#ffffff" }]}>SHARE</Text>
            <Text style={styles.controlText}>{video.shares || 0}</Text>
          </TouchableOpacity>

          {/* Views */}
          <TouchableOpacity style={styles.controlButton}>
            <Text style={[styles.controlIcon, { color: "#ffffff" }]}>VIEWS</Text>
            <Text style={styles.controlText}>{video.views || 0}</Text>
          </TouchableOpacity>
        </View>

        {/* Video Details - Professional Bottom Layout */}
        <View key={`details-${video.id}`} style={styles.videoDetailsContainer}>
          {/* Source badge - Top priority */}
          <View style={styles.sourceContainer}>
            <Text style={styles.sourceText}>
              {video.originalSource?.sourcePlatform || 'News'}
              {video.originalSource?.creatorName && ` • ${video.originalSource.creatorName}`}
            </Text>
          </View>
          
          {/* Main content */}
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={3}>
            {video.title}
          </Text>
          
          {video.description && (
            <Text style={[styles.description, { color: theme.subText }]} numberOfLines={2}>
              {video.description}
            </Text>
          )}

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <View key={`tags-${video.id}`} style={styles.tagsContainer}>
              {video.tags.slice(0, 2).map((tag, index) => (
                <Text key={`tag-${video.id}-${index}-${tag}`} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
              {video.tags.length > 2 && (
                <Text style={[styles.tag, styles.moreTag]}>
                  +{video.tags.length - 2}
                </Text>
              )}
            </View>
          )}
        </View>

      </View>
      </View>
    </Animated.View>
  );
};

export default function VideoFeed({ onClose, isDarkMode }: VideoFeedProps) {
  const [videos, setVideos] = useState<VideoReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preloadedVideos, setPreloadedVideos] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const preloadRangeRef = useRef({ start: 0, end: 2 }); // Preload range

  useEffect(() => {
    loadVideos();
  }, []);

  // Preload videos for faster access
  const preloadVideo = useCallback((video: VideoReel) => {
    const videoIdStr = String(video.id);
    if (preloadedVideos.has(videoIdStr)) return;
    
    console.log('🚀 [VideoFeed] Preloading video:', video.title?.substring(0, 30));
    
    // For regular videos, we can preload metadata
    if (Platform.OS === 'web' && !isYouTubeUrl(video.videoUrl)) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.src = video.videoUrl;
      videoElement.load();
    }
    
    setPreloadedVideos(prev => new Set([...prev, videoIdStr]));
  }, [preloadedVideos]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [VideoFeed] Loading videos with optimization...');
      
      // Try to load from cache first for instant display
      const cachedVideos = await VideoCacheService.getCachedVideoMetadata();
      if (cachedVideos && cachedVideos.length > 0) {
        console.log('⚡ [VideoFeed] Using cached videos for instant display:', cachedVideos.length);
        setVideos(cachedVideos);
        setLoading(false);

        // Still fetch fresh data in the background
        setTimeout(async () => {
          try {
            const { videos: freshVideoList } = await VideoService.getVideos(50);
            if (freshVideoList.length > 0) {
              console.log('🔄 [VideoFeed] Refreshed with fresh videos:', freshVideoList.length);
              setVideos(freshVideoList);
              await VideoCacheService.cacheVideoMetadata(freshVideoList);
            }
          } catch (error) {
            console.warn('⚠️ [VideoFeed] Background refresh failed:', error);
          }
        }, 1000);
      } else {
        // No cache, load fresh data
        const { videos: videoList } = await VideoService.getVideos(50);
        console.log('📽️ [VideoFeed] Loaded fresh videos:', videoList.length);
        
        setVideos(videoList);
        
        // Cache for next time
        if (videoList.length > 0) {
          await VideoCacheService.cacheVideoMetadata(videoList);
        }
        
        setLoading(false);
      }
      
      // Get current videos for preloading
      const currentVideos = cachedVideos && cachedVideos.length > 0 ? cachedVideos : videos;
      
      if (currentVideos.length > 0) {
        // Log video types
        const youtubeCount = currentVideos.filter((v: VideoReel) => isYouTubeUrl(v.videoUrl)).length;
        const regularCount = currentVideos.length - youtubeCount;
        console.log('📊 [VideoFeed] Video breakdown - YouTube:', youtubeCount, 'Regular:', regularCount);
        
        // Immediately preload first 3 videos for instant playback
        currentVideos.slice(0, 3).forEach((video: VideoReel) => {
          setTimeout(() => preloadVideo(video), 100);
        });
      } else {
        setError('No videos available');
      }
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Failed to load videos');
      setLoading(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      const currentVideo = videos[newIndex];
      const isYT = currentVideo ? isYouTubeUrl(currentVideo.videoUrl) : false;
      console.log('👀 [VideoFeed] Current video:', newIndex, currentVideo?.title?.substring(0, 30), 'YouTube:', isYT);
      setCurrentIndex(newIndex);
      
      // Aggressive preloading - preload next 3 and previous 1 videos
      const preloadRange = { start: Math.max(0, newIndex - 1), end: Math.min(videos.length - 1, newIndex + 3) };
      
      if (preloadRange.start !== preloadRangeRef.current.start || preloadRange.end !== preloadRangeRef.current.end) {
        preloadRangeRef.current = preloadRange;
        
        // Preload videos in range
        for (let i = preloadRange.start; i <= preloadRange.end; i++) {
          if (videos[i] && i !== newIndex) {
            setTimeout(() => preloadVideo(videos[i]), i * 50); // Stagger preloading
          }
        }
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80, // Require 80% visibility
    minimumViewTime: 100, // Minimum time to be considered viewable
  }).current;

  const theme = {
    background: isDarkMode ? '#000000' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading Videos...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadVideos}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
        {/* Close button */}
        <TouchableOpacity 
          style={[styles.closeButton, { top: insets.top + 10 }]} 
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Close button */}
      <TouchableOpacity 
        style={[styles.closeButton, { top: insets.top + 10 }]} 
        onPress={onClose}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      {/* Strict boundary wrapper for video feed */}
      <View style={styles.videoBoundaryContainer}>
        <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item) => `video-${item.id}`}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        style={styles.flatListContainer}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={5} // Increased for better preloading
        initialNumToRender={2} // Render 2 videos initially for faster startup
        maxToRenderPerBatch={3} // Render more videos per batch
        updateCellsBatchingPeriod={16} // Faster updates (60fps)
        getItemLayout={(data, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <VideoItem
            key={`video-item-${item.id}-${index}`}
            video={item}
            isActive={index === currentIndex}
            onPress={() => {}}
            isDarkMode={isDarkMode}
            isPreloaded={preloadedVideos.has(String(item.id))}
          />
        )}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flatListContainer: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoBoundaryContainer: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoContainer: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#000',
    overflow: 'hidden',
    maxWidth: Platform.OS === 'web' ? 600 : screenWidth, // Limit width on web
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  strictClipContainer: {
    width: screenWidth,
    height: screenHeight,
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoTouchable: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000', // Prevent white flash
    zIndex: 1, // Ensure video is above loading overlay
    overflow: 'hidden',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 0, // Below video player
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    left: 16, // Positioned on the left side
    zIndex: 1000,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 16,
    overflow: 'hidden',
    zIndex: 5,
  },
  youtubeOverlay: {
    // YouTube-specific overlay - only show essential UI, allow clicks to pass through to video area
    pointerEvents: 'box-none', // Allow clicks through overlay to YouTube iframe
  },
  rightControls: {
    position: 'absolute',
    right: Platform.OS === 'web' ? 24 : 16,
    top: '50%',
    transform: [{ translateY: -100 }],
    alignItems: 'center',
    zIndex: 10,
  },
  controlButton: {
    alignItems: 'center',
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    minWidth: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  controlIcon: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: 'center',
    color: '#ffffff',
  },
  controlText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
  },
  bottomContent: {
    alignSelf: 'flex-start',
    maxWidth: '70%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    marginLeft: -16,
    paddingLeft: 16,
  },
  bottomDetailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  videoDetailsContainer: {
    position: 'absolute',
    left: 0,
    right: 0, // Complete full width
    bottom: 0, // Align to bottom edge
    backgroundColor: '#000000', // Solid black, non-transparent
    paddingHorizontal: 16,
    paddingRight: 80, // Leave space for right controls
    paddingVertical: 12,
    borderRadius: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
    marginTop: 4,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 12,
    marginBottom: 4,
    color: 'rgba(255, 255, 255, 0.85)',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: '400',
  },
  sourceContainer: {
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  sourceText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 9,
    fontWeight: '500',
    marginRight: 4,
    marginBottom: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
    letterSpacing: 0.1,
  },
  moreTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
});