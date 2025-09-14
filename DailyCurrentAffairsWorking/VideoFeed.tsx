import React, { useState, useRef, useEffect } from 'react';
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
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoReel } from './types';

// Use web-compatible Firebase service when running in browser
const VideoService = Platform.OS === 'web' 
  ? require('./yuvaupdateweb-main/src/services/VideoService').VideoService
  : require('./VideoServiceMobile').VideoService;

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
}

const VideoItem: React.FC<VideoItemProps> = ({ video, isActive, onPress, isDarkMode }) => {
  const videoRef = useRef<Video>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [localLikes, setLocalLikes] = useState(video.likes || 0);

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.playAsync();
      // Track view
      VideoService.trackVideoView(String(video.id), 'anonymous_user');
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
  }, [isActive, video.id, fadeAnim]);

  const handleLike = async () => {
    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLocalLikes(prev => newLikedState ? prev + 1 : prev - 1);
      
      await VideoService.toggleVideoLike(String(video.id), 'anonymous_user');
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update
      setIsLiked(!isLiked);
      setLocalLikes(prev => isLiked ? prev + 1 : prev - 1);
    }
  };

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

  return (
    <Animated.View style={[styles.videoContainer, { opacity: fadeAnim }]}>
      <TouchableOpacity 
        style={styles.videoTouchable} 
        activeOpacity={1} 
      onPress={toggleControls}
    >
      <Video
        ref={videoRef}
        source={{ uri: video.videoUrl }}
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode={ResizeMode.COVER}
        shouldPlay={isActive}
        isLooping
        style={styles.video}
        onLoadStart={() => setIsLoading(true)}
        onLoad={() => setIsLoading(false)}
        onError={(error) => {
          console.error('Video error:', error);
          setIsLoading(false);
        }}
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      {/* Video overlay content */}
      <View style={styles.overlay}>
        {/* Right side controls */}
        <View style={styles.rightControls}>
          {/* Like button */}
          <TouchableOpacity style={styles.controlButton} onPress={handleLike}>
            <Text style={[styles.controlIcon, { color: isLiked ? "#ff3040" : "#ffffff" }]}>
              {isLiked ? "LIKED" : "LIKE"}
            </Text>
            <Text style={styles.controlText}>{localLikes}</Text>
          </TouchableOpacity>

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

        {/* Video Details - Positioned at Bottom */}
        <View style={styles.bottomDetailsContainer}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {video.title}
          </Text>
          <Text style={[styles.description, { color: theme.subText }]} numberOfLines={2}>
            {video.description}
          </Text>
          
          {/* Source attribution */}
          <View style={styles.sourceContainer}>
            <Text style={styles.sourceText}>
              FROM: {video.originalSource?.sourcePlatform || 'Unknown'}
              {video.originalSource?.creatorName && ` • @${video.originalSource.creatorName}`}
            </Text>
          </View>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {video.tags.slice(0, 3).map((tag, index) => (
                <Text key={index} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
            </View>
          )}
        </View>

      </View>
    </TouchableOpacity>
    </Animated.View>
  );
};

export default function VideoFeed({ onClose, isDarkMode }: VideoFeedProps) {
  const [videos, setVideos] = useState<VideoReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const { videos: videoList } = await VideoService.getVideos(20);
      setVideos(videoList);
      
      if (videoList.length === 0) {
        setError('No videos available');
      }
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
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

      {/* Video feed */}
      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <VideoItem
            video={item}
            isActive={index === currentIndex}
            onPress={() => {}}
            isDarkMode={isDarkMode}
          />
        )}
        getItemLayout={(data, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
      />

      {/* Video counter */}
      <View style={[styles.counterContainer, { bottom: insets.bottom + 20 }]}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {videos.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
  },
  videoTouchable: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
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
    right: 16,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
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
  },
  rightControls: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -100 }],
    alignItems: 'center',
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
    fontSize: 18,
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    lineHeight: 18,
  },
  description: {
    fontSize: 13,
    marginBottom: 6,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 16,
  },
  sourceContainer: {
    backgroundColor: 'rgba(74, 144, 226, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sourceText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  tag: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    color: '#00d4ff',
    fontSize: 10,
    fontWeight: '600',
    marginRight: 4,
    marginBottom: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.4)',
    overflow: 'hidden',
  },
  counterContainer: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 4,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});