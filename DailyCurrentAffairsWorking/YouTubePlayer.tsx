import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { showInApp } from './InAppBrowser';
import FastTouchable from './FastTouchable';

// Safe dynamic import for WebView - only available on native platforms
let NativeWebView: any = null;
if (Platform.OS !== 'web') {
  try { 
    NativeWebView = require('react-native-webview').WebView; 
  } catch (e) { 
    NativeWebView = null; 
  }
}

interface YouTubePlayerProps {
  youtubeUrl: string;
  style?: any;
  thumbnailImage?: string; // Optional custom thumbnail image
}

// Extract YouTube video ID from various URL formats
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/user\/[^\/]+#.*\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Get YouTube thumbnail URL with fallback options
const getYouTubeThumbnail = (videoId: string, quality: 'maxres' | 'high' | 'medium' | 'default' = 'maxres'): string => {
  const qualityMap = {
    maxres: 'maxresdefault.jpg',
    high: 'hqdefault.jpg', 
    medium: 'mqdefault.jpg',
    default: 'default.jpg'
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}`;
};

// Create YouTube embed URL for iframe
const createEmbedUrl = (videoId: string): string => {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
};

export default function YouTubePlayer({ youtubeUrl, style, thumbnailImage }: YouTubePlayerProps) {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentThumbnailQuality, setCurrentThumbnailQuality] = useState<'maxres' | 'high' | 'medium' | 'default'>('maxres');

  const videoId = extractVideoId(youtubeUrl);
  
  if (!videoId) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Invalid YouTube URL</Text>
        </View>
      </View>
    );
  }

  // Auto-generate thumbnail URL from YouTube
  const autoThumbnailUrl = getYouTubeThumbnail(videoId, currentThumbnailQuality);
  const displayThumbnail = thumbnailImage || autoThumbnailUrl;
  const embedUrl = createEmbedUrl(videoId);

  const handlePlayPress = () => {
    setIsPlaying(true);
  };

  const handleCloseVideo = () => {
    setIsPlaying(false);
  };

  const handleThumbnailError = () => {
    // Try lower quality thumbnails as fallback
    if (currentThumbnailQuality === 'maxres') {
      setCurrentThumbnailQuality('high');
      setThumbnailError(false);
    } else if (currentThumbnailQuality === 'high') {
      setCurrentThumbnailQuality('medium');
      setThumbnailError(false);
    } else if (currentThumbnailQuality === 'medium') {
      setCurrentThumbnailQuality('default');
      setThumbnailError(false);
    } else {
      // All YouTube thumbnails failed, show error state
      setThumbnailError(true);
    }
  };

  const handleThumbnailLoad = () => {
    setThumbnailLoaded(true);
    setThumbnailError(false);
  };

  return (
    <View style={[styles.container, style]}>
      {!isPlaying ? (
        // Show thumbnail with play button
        <View style={styles.thumbnailContainer}>
          {/* Thumbnail Image - only show if not in final error state */}
          {!(thumbnailError && currentThumbnailQuality === 'default') && (
            <Image
              source={{ uri: displayThumbnail }}
              style={styles.thumbnailImage}
              onLoad={handleThumbnailLoad}
              onError={handleThumbnailError}
              resizeMode="cover"
            />
          )}
          
          {/* Fallback background for failed thumbnails */}
          {thumbnailError && currentThumbnailQuality === 'default' && (
            <View style={styles.fallbackBackground}>
              <Text style={styles.fallbackTitle}>📹</Text>
              <Text style={styles.fallbackSubtitle}>YouTube Video</Text>
            </View>
          )}
          
          {/* Dark Overlay for better contrast */}
          <View style={styles.overlay} />
          
          {/* YouTube Play Button */}
          <FastTouchable style={styles.playButton} onPress={handlePlayPress}>
            <View style={styles.playIconContainer}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </FastTouchable>
          
          {/* YouTube Label */}
          <View style={styles.youtubeLabel}>
            <Text style={styles.youtubeLabelText}>📺 YouTube</Text>
          </View>
          
          {/* Video Badge */}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>VIDEO</Text>
          </View>
          
          {/* Loading State */}
          {!thumbnailLoaded && !thumbnailError && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}
        </View>
      ) : (
        // Show embedded YouTube video
        <View style={styles.videoContainer}>
          {/* Close button */}
          <FastTouchable style={styles.closeButton} onPress={handleCloseVideo}>
            <Text style={styles.closeButtonText}>✕</Text>
          </FastTouchable>
          
          {/* Embedded video */}
          {Platform.OS === 'web' ? (
            // Web: Use iframe
            // @ts-ignore
            <iframe
              src={embedUrl}
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                borderRadius: '12px'
              }}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            // Native: Use WebView
            NativeWebView ? (
              <NativeWebView
                source={{ uri: embedUrl }}
                style={styles.webView}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                allowsFullscreenVideo={true}
                onError={(e: any) => {
                  console.error('YouTube WebView error:', e);
                  setIsPlaying(false);
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
              />
            ) : (
              // Fallback if WebView not available
              <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackText}>
                  WebView not available. Opening in browser...
                </Text>
                <FastTouchable 
                  style={styles.openBrowserButton} 
                  onPress={() => {
                    setIsPlaying(false);
                    showInApp(youtubeUrl);
                  }}
                >
                  <Text style={styles.openBrowserButtonText}>Open in Browser</Text>
                </FastTouchable>
              </View>
            )
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 2,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    zIndex: 3,
  },
  playIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  playIcon: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  youtubeLabel: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 3,
  },
  youtubeLabelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 3,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 4,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
  fallbackBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackTitle: {
    fontSize: 48,
    marginBottom: 8,
  },
  fallbackSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  // Video container styles
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  fallbackText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  openBrowserButton: {
    backgroundColor: '#ff0000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  openBrowserButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
