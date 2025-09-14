import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Platform, Dimensions, Text } from 'react-native';
import { WebView } from 'react-native-webview';

// Conditional import for YoutubePlayer to avoid web issues
let YoutubePlayer: any = null;
if (Platform.OS !== 'web') {
  try {
    YoutubePlayer = require('react-native-youtube-iframe').default;
    console.log('✅ [YouTubePlayer] Native YouTube player loaded successfully');
  } catch (error) {
    console.error('❌ [YouTubePlayer] Failed to load react-native-youtube-iframe:', error);
  }
}

interface YouTubeVideoPlayerProps {
  videoUrl: string;
  isActive: boolean;
  onReady?: () => void;
  onError?: (error: any) => void;
  onLoadStart?: () => void;
  onLoad?: () => void;
  style?: any;
  muted?: boolean;
}

interface YouTubeVideoPlayerRef {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  getCurrentTime: () => Promise<number>;
  seekTo: (time: number) => Promise<void>;
}

// Helper function to extract YouTube video ID from various URL formats
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Web YouTube Player Component for Video Feed
const WebYouTubeVideoPlayer: React.FC<Omit<YouTubeVideoPlayerProps, 'videoUrl'> & { videoId: string }> = ({
  videoId,
  isActive,
  onReady,
  onError,
  onLoadStart,
  onLoad,
  style,
  muted = true,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Notify parent that video is ready immediately (no loading state needed)
  useEffect(() => {
    console.log(`🎬 YouTube Player mounting/updating for video: ${videoId}`);
    onLoadStart?.();
    // Immediate ready callback since YouTube handles its own loading
    setTimeout(() => onReady?.(), 100); // Small delay to ensure proper initialization
  }, [videoId]);

  // Handle iframe load completion
  const handleIframeLoad = () => {
    console.log('🌐 [WebYouTube] iframe loaded for video:', videoId);
    onLoad?.();
    onReady?.();
  };

  // Handle iframe error
  const handleIframeError = (error: any) => {
    console.error('🌐 [WebYouTube] iframe error for video:', videoId, error);
    onError?.(error);
  };

  // Create optimized embed URL for fastest loading and best performance
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${isActive ? 1 : 0}&mute=${muted ? 1 : 0}&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${videoId}&fs=1&cc_load_policy=0&iv_load_policy=3&autohide=1&disablekb=0&enablejsapi=1&html5=1&vq=hd720&start=0&end=0&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;

  return (
    <View style={[styles.container, style]}>
      {Platform.OS === 'web' ? (
        // @ts-ignore - iframe is valid for web
        <iframe
          key={`youtube-iframe-${videoId}`}
          ref={iframeRef}
          src={embedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#000',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            padding: 0,
            zIndex: 10,
          }}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      ) : (
        // Fallback for non-web platforms that somehow reach this component
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Web player used on non-web platform</Text>
        </View>
      )}
    </View>
  );
};

// Mobile YouTube Player Component for Video Feed
const MobileYouTubeVideoPlayer = forwardRef<YouTubeVideoPlayerRef, Omit<YouTubeVideoPlayerProps, 'videoUrl'> & { videoId: string }>(({
  videoId,
  isActive,
  onReady,
  onError,
  onLoadStart,
  onLoad,
  style,
  muted = true,
}, ref) => {
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const youtubeRef = useRef<any>(null);

  // Initialize YouTube player - no loading timeout needed
  useEffect(() => {
    setPlayerReady(false);
    onLoadStart?.();
    // YouTube player handles its own loading, just mark as ready
    setTimeout(() => {
      setPlayerReady(true);
      onReady?.();
      onLoad?.();
    }, 100); // Minimal delay for initialization
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    play: async () => {
      if (playerReady && youtubeRef.current) {
        setPlaying(true);
      }
    },
    pause: async () => {
      if (playerReady && youtubeRef.current) {
        setPlaying(false);
      }
    },
    getCurrentTime: async () => {
      if (playerReady && youtubeRef.current) {
        try {
          return await youtubeRef.current.getCurrentTime();
        } catch (error) {
          console.log('Error getting current time:', error);
          return 0;
        }
      }
      return 0;
    },
    seekTo: async (time: number) => {
      if (playerReady && youtubeRef.current) {
        try {
          await youtubeRef.current.seekTo(time);
        } catch (error) {
          console.log('Error seeking:', error);
        }
      }
    },
  }));

  useEffect(() => {
    console.log('📱 [MobileYouTube] isActive changed for video:', videoId, 'isActive:', isActive, 'playerReady:', playerReady);
    if (playerReady) {
      console.log('📱 [MobileYouTube] Setting playing to:', isActive);
      setPlaying(isActive);
    } else if (isActive) {
      // If becoming active but player not ready, set playing state for when it becomes ready
      console.log('📱 [MobileYouTube] Player not ready yet, but setting playing state for later');
      setPlaying(true);
    }
  }, [isActive, playerReady, videoId]);

  const handleReady = () => {
    console.log('📱 [MobileYouTube] Player Ready for video:', videoId, 'isActive:', isActive);
    setPlayerReady(true);
    // If video should be active, start playing immediately
    if (isActive) {
      console.log('📱 [MobileYouTube] Video is active, starting playback');
      setPlaying(true);
    }
    onReady?.();
    onLoad?.();
  };

  const handleError = (error: string) => {
    console.error('📱 [MobileYouTube] Player Error for video:', videoId, 'Error:', error);
    onError?.(error);
  };

  const handleStateChange = (state: string) => {
    console.log('📱 [MobileYouTube] State changed for video:', videoId, 'State:', state, 'isActive:', isActive);
    // You can handle different states here: playing, paused, ended, etc.
  };

  // Get screen dimensions once
  const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

  // Fallback to WebView if YoutubePlayer is not available
  if (!YoutubePlayer) {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${playing ? 1 : 0}&mute=${muted ? 1 : 0}&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${videoId}&fs=1&enablejsapi=1&widgetid=1&iv_load_policy=3&cc_load_policy=0&start=0&end=0`;
    
    return (
      <View style={[styles.fullScreenContainer, style]}>
        <WebView
          key={`youtube-webview-${videoId}-${Date.now()}`}
          source={{ uri: embedUrl }}
          style={styles.fullScreenWebView}
          onLoad={handleReady}
          onError={(error) => handleError(error.nativeEvent.description || 'Unknown error')}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          bounces={false}
          scrollEnabled={false}
          scalesPageToFit={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          cacheEnabled={false}
          cacheMode={'LOAD_NO_CACHE'}
          incognito={true}
        />
      </View>
    );
  }

  // Force WebView approach for better full-screen control on mobile
  console.log('📱 [MobileYouTube] Forcing WebView approach for full-screen control');
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${playing ? 1 : 0}&mute=${muted ? 1 : 0}&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${videoId}&fs=1&enablejsapi=1&widgetid=1&iv_load_policy=3&cc_load_policy=0&start=0&end=0`;
  
  return (
    <View style={[styles.fullScreenContainer, style]}>
      <WebView
        key={`youtube-webview-main-${videoId}-${Date.now()}`}
        source={{ uri: embedUrl }}
        style={styles.fullScreenWebView}
        onLoad={handleReady}
        onLoadStart={() => console.log('🚀 [WebView] Started loading:', videoId)}
        onLoadEnd={() => console.log('✅ [WebView] Finished loading:', videoId)}
        onError={(error) => handleError(error.nativeEvent.description || 'Unknown error')}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        bounces={false}
        scrollEnabled={false}
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        cacheEnabled={true} // Enable caching for better performance
        cacheMode={'LOAD_CACHE_ELSE_NETWORK'}
        incognito={false} // Allow caching
        // Performance optimizations
        androidHardwareAccelerationDisabled={false}
        androidLayerType={'hardware'}
        startInLoadingState={false}
        renderLoading={() => <View />} // Minimal loading indicator for faster perception
        mixedContentMode={'compatibility'}
      />
    </View>
  );

  return (
    <View style={[styles.fullScreenContainer, style]}>
      <YoutubePlayer
        ref={youtubeRef}
        height={screenHeight}
        width={screenWidth}
        play={playing}
        videoId={videoId}
        onReady={handleReady}
        onError={handleError}
        onChangeState={handleStateChange}
        volume={muted ? 0 : 50}
        playbackRate={1}
        initialPlayerParams={{
          controls: true,
          modestbranding: false,
          rel: false,
          showinfo: true,
          iv_load_policy: 3,
          cc_load_policy: 0,
          loop: true,
          playlist: videoId,
          autoplay: isActive ? 1 : 0,
          fs: 1, // Enable fullscreen
          playsinline: 1, // Play inline for mobile
        }}
        webViewStyle={styles.fullScreenWebView}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          bounces: false,
          scrollEnabled: false,
          style: styles.fullScreenWebViewStyle,
          scalesPageToFit: false,
          showsHorizontalScrollIndicator: false,
          showsVerticalScrollIndicator: false,
        }}
      />
    </View>
  );
});

// Main YouTube Video Player Component for Video Feed
const YouTubeVideoPlayer = forwardRef<YouTubeVideoPlayerRef, YouTubeVideoPlayerProps>((props, ref) => {
  const { videoUrl, isActive, ...otherProps } = props;
  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    console.error('Invalid YouTube URL:', videoUrl);
    return (
      <View style={[styles.container, otherProps.style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Invalid YouTube URL</Text>
          <Text style={styles.errorSubText}>{videoUrl}</Text>
        </View>
      </View>
    );
  }

  console.log('🎥 [YouTubePlayer] Rendering player - Video ID:', videoId, 'Platform:', Platform.OS, 'isActive:', isActive, 'URL:', videoUrl);

  if (Platform.OS === 'web') {
    console.log('🌐 [YouTubePlayer] Using Web YouTube Player for:', videoId);
    return <WebYouTubeVideoPlayer videoId={videoId} isActive={isActive} {...otherProps} />;
  } else {
    console.log('📱 [YouTubePlayer] Using Mobile YouTube Player for:', videoId, 'YoutubePlayer available:', !!YoutubePlayer);
    if (!YoutubePlayer) {
      console.error('❌ [YouTubePlayer] Mobile YouTube player not available! Install react-native-youtube-iframe');
      return (
        <View style={[styles.errorContainer, otherProps.style]}>
          <Text style={styles.errorText}>❌ YouTube Player Not Available</Text>
          <Text style={styles.errorSubText}>react-native-youtube-iframe is required for mobile</Text>
        </View>
      );
    }
    return <MobileYouTubeVideoPlayer ref={ref} videoId={videoId} isActive={isActive} {...otherProps} />;
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    zIndex: 2, // Ensure YouTube container is above loading overlay
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden', // Ensure content stays within bounds
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    overflow: 'hidden',
    margin: 0,
    padding: 0,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
  },
  youtubeWebView: {
    backgroundColor: '#000',
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullScreenWebView: {
    backgroundColor: '#000',
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    margin: 0,
    padding: 0,
    borderWidth: 0,
  },
  fullScreenWebViewStyle: {
    backgroundColor: '#000',
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    margin: 0,
    padding: 0,
    borderWidth: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default YouTubeVideoPlayer;
export type { YouTubeVideoPlayerRef };