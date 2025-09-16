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
    // Immediate ready callback - no delay for instant playback
    onReady?.();
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

  // Ad-blocker friendly embed URL without tracking APIs
  // Force muted=1 to guarantee autoplay on web
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${videoId}&fs=1&cc_load_policy=0&iv_load_policy=3&disablekb=1&enablejsapi=0&html5=1&start=0&preload=none`;

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

  // Instant YouTube player initialization for fast autoplay
  useEffect(() => {
    setPlayerReady(false);
    onLoadStart?.();
    // Mark as ready immediately for instant playback
    setPlayerReady(true);
    onReady?.();
    onLoad?.();
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    play: async () => {
      // Immediate play attempt for instant response
      setPlaying(true);
      if (playerReady && youtubeRef.current) {
        try {
          // Force play even if not fully ready
          setPlaying(true);
        } catch (error) {
          console.log('YouTube play error (will retry):', error);
        }
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

    // Instant autoplay when becoming active
    if (isActive) {
      setPlaying(true);
      console.log('📱 [MobileYouTube] INSTANT autoplay enabled for:', videoId);
    } else {
      setPlaying(false);
      console.log('📱 [MobileYouTube] Pausing video:', videoId);
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
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${videoId}&fs=1&enablejsapi=0&iv_load_policy=3&cc_load_policy=0&start=0&preload=none`;

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
          cacheEnabled={false} // Prevent black frame caching
          cacheMode={'LOAD_NO_CACHE'}
          incognito={true}
        />
      </View>
    );
  }

  // Force WebView approach for better full-screen control on mobile
  console.log('📱 [MobileYouTube] Forcing WebView approach for full-screen control');
  // Force muted=1 to guarantee autoplay on mobile WebView
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${videoId}&fs=1&enablejsapi=0&iv_load_policy=3&cc_load_policy=0&start=0&preload=none`;

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
        cacheEnabled={false} // Disable caching to prevent black frames
        cacheMode={'LOAD_NO_CACHE'}
        incognito={true} // Fresh load each time
        userAgent={'Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Mobile Safari/537.36'} // Mobile user agent
        // Performance optimizations
        androidHardwareAccelerationDisabled={false}
        androidLayerType={'hardware'}
        startInLoadingState={false}
        renderLoading={() => <View />} // Minimal loading indicator for faster perception
        mixedContentMode={'compatibility'}
        injectedJavaScript={`
          (function() {
            // Remove black screen and loading states immediately
            const removeBlackScreen = () => {
              // Hide any loading spinners or black overlays
              const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="placeholder"]');
              loadingElements.forEach(el => el.style.display = 'none');
              
              // Remove poster images that might show as black frames
              const posterElements = document.querySelectorAll('[poster], [data-poster]');
              posterElements.forEach(el => {
                el.removeAttribute('poster');
                el.removeAttribute('data-poster');
              });
              
              const video = document.querySelector('video');
              if (video) {
                video.muted = ${muted};
                video.currentTime = 0;
                video.poster = ''; // Remove poster to prevent black frame
                video.preload = 'none'; // Prevent preloading that might cause black frames
                video.style.backgroundColor = 'transparent';
                video.play().catch(() => {
                  video.muted = true;
                  video.play();
                });
                console.log('📺 Video optimized for instant play - no black screen');
              }
            };
            
            // Execute immediately
            removeBlackScreen();
            
            // Execute multiple times to catch any delayed loading
            setTimeout(removeBlackScreen, 10);
            setTimeout(removeBlackScreen, 50);
            setTimeout(removeBlackScreen, 100);
          })();
        `}
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
          injectedJavaScript: `
            (function() {
              // Simple video optimization without API calls
              const optimizeVideo = () => {
                // Remove any loading overlays
                const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="placeholder"]');
                loadingElements.forEach(el => el.style.display = 'none');
                
                // Focus on direct video element manipulation only
                const video = document.querySelector('video');
                if (video) {
                  video.muted = ${muted};
                  video.currentTime = 0;
                  video.poster = ''; // Remove poster to prevent black frame
                  video.style.backgroundColor = 'transparent';
                  video.play().catch(() => {
                    video.muted = true;
                    video.play();
                  });
                }
              };
              
              // Execute multiple times for reliability
              optimizeVideo();
              setTimeout(optimizeVideo, 100);
              setTimeout(optimizeVideo, 300);
            })();
          `,
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