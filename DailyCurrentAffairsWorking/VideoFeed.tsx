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
  Image,
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
  onReady?: () => void;
  shouldPlay?: boolean;
  isLooping?: boolean;
  [key: string]: any;
}

// Web-compatible video player with CORS fallback
const WebVideo = Platform.OS === 'web' ? ({ source, style, onLoadStart, onLoad, onError, shouldPlay, isLooping, ...props }: WebVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCORSError, setHasCORSError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Check if URL is likely to have CORS issues or is unsupported
  const isExternalVideo = useMemo(() => {
    const url = source?.uri || '';
    return url.includes('googlevideo.com') ||
      url.includes('dmate4.online') ||
      url.includes('tomp3.cc') ||
      url.includes('dl188') ||
      url.includes('yt-dlp') ||
      url.includes('ytdl') ||
      url.includes('youtube-downloader') ||
      url.includes('y2mate') ||
      url.includes('savefrom');
  }, [source?.uri]);

  // Check if the video URL is valid and supported
  const isValidVideoUrl = useMemo(() => {
    const url = source?.uri || '';
    if (!url || url.trim() === '') return false;

    // Check for supported video formats
    const supportedFormats = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const hasValidFormat = supportedFormats.some(format => url.toLowerCase().includes(format));

    // Check for valid URL structure
    const urlPattern = /^https?:\/\/.+/;
    const isValidUrl = urlPattern.test(url);

    // Blocked/problematic domains
    const blockedDomains = ['tomp3.cc', 'y2mate', 'savefrom', 'dmate4.online'];
    const isBlocked = blockedDomains.some(domain => url.includes(domain));

    return isValidUrl && !isBlocked && (hasValidFormat || !isExternalVideo);
  }, [source?.uri, isExternalVideo]);

  useEffect(() => {
    if (videoRef.current && source?.uri && !hasCORSError && isValidVideoUrl) {
      const video = videoRef.current;

      // Aggressive preloading for faster video start
      video.preload = 'auto'; // Load entire video for instant playback

      // Remove crossOrigin for external videos to avoid CORS preflight
      if (!isExternalVideo) {
        video.crossOrigin = 'anonymous';
      }

      // Optimize video element for performance
      video.playsInline = true;
      video.muted = true; // Ensure autoplay works
      video.loop = isLooping || false;

      // Force immediate loading
      video.load();

      if (shouldPlay) {
        // Immediate play attempt without waiting
        const playVideo = async () => {
          try {
            await video.play();
          } catch (error) {
            console.warn('Video autoplay failed, retrying muted:', error);
            video.muted = true;
            try {
              await video.play();
            } catch (retryError) {
              console.warn('Muted autoplay also failed:', retryError);
              handleError({ target: { error: { code: 4, message: 'Playback failed' } } });
            }
          }
        };

        // Try to play immediately
        playVideo();
      } else {
        video.pause();
      }
    }
  }, [shouldPlay, source?.uri, hasCORSError, isExternalVideo, isLooping, isValidVideoUrl]);

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
    console.error('Error code:', e.target?.error?.code);
    console.error('Error message:', e.target?.error?.message);

    // Check if this is likely a CORS error or unsupported source
    const url = source?.uri || '';
    const errorCode = e.target?.error?.code;

    const isCORSError = url.includes('googlevideo.com') ||
      url.includes('dmate4.online') ||
      url.includes('tomp3.cc') ||
      url.includes('dl188') ||
      url.includes('youtube-downloader') ||
      errorCode === 4; // MEDIA_ELEMENT_ERROR: MEDIA_ERR_SRC_NOT_SUPPORTED

    const isNetworkError = errorCode === 2; // MEDIA_ERR_NETWORK
    const isDecodeError = errorCode === 3; // MEDIA_ERR_DECODE

    if ((isCORSError || isNetworkError || isDecodeError) && retryCount < 2) {
      console.warn('🚫 Video loading error detected:', {
        url,
        errorCode,
        type: isCORSError ? 'CORS' : isNetworkError ? 'Network' : 'Decode'
      });
      setHasCORSError(true);
      setRetryCount(prev => prev + 1);
      return;
    }

    onError && onError(e);
  };

  const handleLoadedData = () => {
    // Video is ready to play
    onLoad && onLoad();
  };

  // If video is invalid or has errors, show appropriate message
  if (!isValidVideoUrl || (hasCORSError && isExternalVideo)) {
    const isBlocked = source?.uri?.includes('tomp3.cc') ||
      source?.uri?.includes('youtube-downloader') ||
      source?.uri?.includes('y2mate');

    return React.createElement('div', {
      style: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        padding: '20px',
        textAlign: 'center',
        ...style,
      }
    }, [
      React.createElement('div', {
        key: 'icon',
        style: { fontSize: '48px', marginBottom: '16px' }
      }, isBlocked ? '�' : '�📹'),
      React.createElement('div', {
        key: 'message',
        style: { fontSize: '16px', marginBottom: '8px', fontWeight: '600' }
      }, isBlocked ? 'Video Source Blocked' : 'Video Unavailable'),
      React.createElement('div', {
        key: 'reason',
        style: { fontSize: '12px', opacity: 0.7, maxWidth: '300px', lineHeight: '1.4' }
      }, isBlocked
        ? 'This video source is not supported due to security restrictions. The video may be available through other sources.'
        : 'This video cannot be played due to format or network issues. Please try again later.'
      ),
      !isBlocked && source?.uri && React.createElement('button', {
        key: 'retry',
        onClick: () => {
          setHasCORSError(false);
          setRetryCount(0);
          if (videoRef.current) {
            videoRef.current.load();
          }
        },
        style: {
          marginTop: '16px',
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }
      }, 'Retry')
    ]);
  }

  // Only render video element if URL is valid
  if (!isValidVideoUrl) {
    return React.createElement('div', {
      style: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        ...style,
      }
    }, [
      React.createElement('div', {
        key: 'message',
        style: { textAlign: 'center' }
      }, [
        React.createElement('div', { key: 'icon', style: { fontSize: '32px', marginBottom: '8px' } }, '⚠️'),
        React.createElement('div', { key: 'text', style: { fontSize: '14px' } }, 'Invalid video source')
      ])
    ]);
  }

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
    preload: 'auto', // Aggressive preloading for instant start
    crossOrigin: isExternalVideo ? undefined : 'anonymous', // No CORS for external videos
    // Performance optimizations
    'webkit-playsinline': 'true',
    'x5-video-player-type': 'h5',
    'x5-video-player-fullscreen': 'false',
    onLoadStart: handleLoadStart,
    onCanPlay: handleCanPlay,
    onLoadedData: handleLoadedData,
    onError: handleError,
    ...props,
  });
} : null;

// Iframe Video Player for embeddable sources
const IframeVideo = Platform.OS === 'web' ? ({ source, style, onLoadStart, onLoad, onError, ...props }: WebVideoProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    onLoadStart && onLoadStart();
    setIsLoading(true);
    setHasError(false);
  }, [source?.uri, onLoadStart]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    onLoad && onLoad();
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);

    // Determine the likely cause of iframe failure
    const url = source?.uri || '';
    let errorReason = 'This embedded content could not be loaded.';

    if (url.includes('mega.nz')) {
      errorReason = 'Mega.nz content may be private or restricted.';
    } else if (url.includes('drive.google.com')) {
      errorReason = 'Google Drive file may be private or sharing restricted.';
    } else if (url.includes('dropbox.com')) {
      errorReason = 'Dropbox file may be private or sharing disabled.';
    }

    onError && onError({ message: 'Iframe failed to load', reason: errorReason });
  };

  if (hasError) {
    return React.createElement('div', {
      style: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        padding: '20px',
        textAlign: 'center',
        ...style,
      }
    }, [
      React.createElement('div', {
        key: 'icon',
        style: { fontSize: '48px', marginBottom: '16px' }
      }, '🚫'),
      React.createElement('div', {
        key: 'message',
        style: { fontSize: '16px', marginBottom: '8px', fontWeight: '600' }
      }, 'Embed Failed'),
      React.createElement('div', {
        key: 'reason',
        style: { fontSize: '12px', opacity: 0.7, maxWidth: '300px', lineHeight: '1.4' }
      }, 'This embedded content could not be loaded. It may be restricted or unavailable.'),
      React.createElement('button', {
        key: 'open',
        onClick: () => window.open(source?.uri, '_blank'),
        style: {
          marginTop: '16px',
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }
      }, 'Open in New Tab')
    ]);
  }

  return React.createElement('div', {
    style: {
      width: '100%',
      height: '100%',
      position: 'relative',
      backgroundColor: '#000',
      ...style,
    }
  }, [
    isLoading && React.createElement('div', {
      key: 'loading',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        zIndex: 1
      }
    }, [
      React.createElement('div', { key: 'spinner', style: { fontSize: '24px' } }, '⏳'),
      React.createElement('div', {
        key: 'text',
        style: { marginLeft: '10px', fontSize: '14px' }
      }, 'Loading embed...')
    ]),
    React.createElement('iframe', {
      key: 'iframe',
      src: source?.uri,
      style: {
        width: '100%',
        height: '100%',
        border: 'none',
        backgroundColor: '#000'
      },
      allowFullScreen: true,
      onLoad: handleIframeLoad,
      onError: handleIframeError,
      // Security attributes
      sandbox: 'allow-scripts allow-same-origin allow-presentation allow-forms',
      referrerPolicy: 'no-referrer-when-downgrade'
    })
  ]);
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

// Helper function to detect YouTube URLs with better validation
const isYouTubeUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    console.log('🔍 [VideoFeed] Invalid URL:', url);
    return false;
  }

  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)/,
    /youtube\.com\/.*[?&]v=/,
  ];

  const isYT = youtubePatterns.some(pattern => pattern.test(url));

  // Additional validation - check if video ID can be extracted
  if (isYT) {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      console.log('🔍 [VideoFeed] YouTube URL but no video ID:', url);
      return false;
    }
  }

  console.log('🔍 [VideoFeed] URL check:', url, '-> YouTube:', isYT);
  return isYT;
};

// Helper function to extract YouTube video ID
const extractYouTubeVideoId = (url: string): string | null => {
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

// Helper function to convert URLs to embeddable iframe format
const convertToEmbedUrl = (url: string): string => {
  if (!url) return url;

  // Google Drive: Convert sharing URL to embed URL
  if (url.includes('drive.google.com/file/d/')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }

  // Dropbox: Convert sharing URL to embed URL
  if (url.includes('dropbox.com') && url.includes('?dl=0')) {
    return url.replace('?dl=0', '?raw=1');
  }

  // Vimeo: Convert to embed format
  if (url.includes('vimeo.com/') && !url.includes('/embed/')) {
    const videoIdMatch = url.match(/vimeo\.com\/(\d+)/);
    if (videoIdMatch) {
      return `https://player.vimeo.com/video/${videoIdMatch[1]}`;
    }
  }

  // Dailymotion: Convert to embed format
  if (url.includes('dailymotion.com/video/') && !url.includes('/embed/')) {
    const videoIdMatch = url.match(/video\/([a-zA-Z0-9]+)/);
    if (videoIdMatch) {
      return `https://www.dailymotion.com/embed/video/${videoIdMatch[1]}`;
    }
  }

  // Return original URL if no conversion needed
  return url;
};

// Helper function to check if URL is an iframe-embeddable source
const isIframeEmbeddableUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return false;

  // Check for iframe-friendly domains (more flexible matching)
  const iframeDomains = [
    'mega.nz',
    'drive.google.com',
    'dropbox.com',
    'vimeo.com',
    'dailymotion.com',
    'streamable.com',
    'archive.org'
  ];

  return iframeDomains.some(domain => url.toLowerCase().includes(domain));
};

// Helper function to validate if a video URL is safe and playable
const isValidVideoUrl = (url: string): boolean => {
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
  if (isBlocked) {
    console.warn('🚫 Blocked video URL detected:', url);
    return false;
  }

  // Check for supported video formats, YouTube, or iframe-embeddable sources
  const supportedFormats = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
  const hasValidFormat = supportedFormats.some(format => url.toLowerCase().includes(format));
  const isYouTube = isYouTubeUrl(url);
  const isIframeEmbeddable = isIframeEmbeddableUrl(url);

  return hasValidFormat || isYouTube || isIframeEmbeddable;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Share Icon using asset
const ShareIcon = ({ size = 16, color = "#ffffff" }) => (
  <Image
    source={require('./assets/share.png')}
    style={{
      width: size,
      height: size,
      tintColor: color,
    }}
    resizeMode="contain"
  />
);

// Eye Icon using asset
const EyeIcon = ({ size = 16, color = "#ffffff" }) => (
  <Image
    source={require('./assets/eye.png')}
    style={{
      width: size,
      height: size,
      tintColor: color,
    }}
    resizeMode="contain"
  />
);

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
  const isIframeEmbeddable = useMemo(() => isIframeEmbeddableUrl(video.videoUrl), [video.videoUrl]);
  const isValidUrl = useMemo(() => isValidVideoUrl(video.videoUrl), [video.videoUrl]);

  // Instant loading state management for smooth scrolling
  const [isLoading, setIsLoading] = useState(!isYouTube && !isIframeEmbeddable && !isPreloaded && isValidUrl); // Preloaded videos skip loading
  const [isVideoReady, setIsVideoReady] = useState(isYouTube || isIframeEmbeddable || isPreloaded || !isValidUrl); // YouTube, iframe and preloaded videos are always ready
  const [hasError, setHasError] = useState(!isValidUrl);

  // Debug logging for video type and state
  useEffect(() => {
    console.log(`� [VideoItem] "${video.title?.substring(0, 30)}..." - YouTube: ${isYouTube}, Iframe: ${isIframeEmbeddable}, Active: ${isActive}, Loading: ${isLoading}, Ready: ${isVideoReady}, Platform: ${Platform.OS}`);

    if (isIframeEmbeddable) {
      console.log(`🖼️ [VideoItem] Iframe source detected:`, video.videoUrl);
      console.log(`🖼️ [VideoItem] Will use embed URL:`, convertToEmbedUrl(video.videoUrl));
    }
  }, [isYouTube, isIframeEmbeddable, isActive, isLoading, isVideoReady, video.title, video.videoUrl]);

  // Instant initialization for YouTube and iframe videos
  useEffect(() => {
    if (isYouTube || isIframeEmbeddable) {
      // YouTube and iframe videos are instantly ready - no delays
      setIsLoading(false);
      setIsVideoReady(true);
      setHasError(false);
    } else {
      // Regular videos start ready but can show loading if needed
      setIsVideoReady(true);
    }
  }, [isYouTube, isIframeEmbeddable, video.id]);

  // Ultra-minimal timeout for instant experience
  useEffect(() => {
    if (isLoading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Force hiding loading animation after timeout for video:', video.title);
        setIsLoading(false);
        setIsVideoReady(true);
      }, 300); // Ultra-fast 300ms timeout for instant experience
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, video.title]);

  useEffect(() => {
    if (isActive) {
      // Ultra-aggressive YouTube autoplay with rapid retry logic
      if (isYouTube && youtubeRef.current) {
        const attemptPlay = (attempt = 0) => {
          if (attempt > 10) return; // Max 10 attempts for reliability

          youtubeRef.current?.play().catch((error: any) => {
            console.log(`YouTube play attempt ${attempt + 1} failed:`, error);
            // Ultra-fast retry with 25ms delay
            setTimeout(() => attemptPlay(attempt + 1), 25);
          });
        };

        // Try to play immediately, then with rapid retries
        attemptPlay();

        // Also try a second immediate attempt
        setTimeout(() => attemptPlay(0), 10);
      }
      // Handle regular videos with minimal delay
      else if (!isYouTube && videoRef.current) {
        setTimeout(() => {
          if (Platform.OS === 'web') {
            videoRef.current.play().catch((error: any) => {
              console.log('Video play failed:', error);
            });
          } else {
            videoRef.current.playAsync();
          }
        }, 30); // Minimal delay only for regular videos
      }

      // Track view
      VideoService.trackVideoView(String(video.id), 'anonymous_user');

      // Faster fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200, // Faster animation
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

  // Improved YouTube callbacks with proper error handling
  const handleYouTubeLoadStart = useCallback(() => {
    console.log('🎬 [YouTube] Load started for:', video.title);
    // YouTube videos never show loading - always ready for smooth scrolling
    setHasError(false);
  }, [video.title]);

  const handleYouTubeReady = useCallback(() => {
    console.log('✅ [YouTube] Video ready:', video.title);
    // YouTube is always ready - no state changes needed
    setHasError(false);
  }, [video.title]);

  const handleYouTubeError = useCallback((error: any) => {
    console.error('❌ [YouTube] Video error for', video.title, ':', error);
    setIsLoading(false);
    setHasError(true);
    setIsVideoReady(false);

    // Extract YouTube video ID for debugging
    const videoId = extractYouTubeVideoId(video.videoUrl);

    // Try to provide helpful error message
    const errorMessage = error?.message || error || 'YouTube video configuration error';
    console.log('🔧 [YouTube] Error details:', {
      url: video.videoUrl,
      videoId: videoId,
      error: errorMessage,
      platform: Platform.OS,
      userAgent: Platform.OS === 'web' ? (typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown') : `${Platform.OS} app`,
      timestamp: new Date().toISOString()
    });

    // Log common YouTube issues
    if (errorMessage.includes('configuration')) {
      console.log('💡 [YouTube] Tip: Video may be restricted, age-gated, or unavailable in this region');
    }
    if (errorMessage.includes('network')) {
      console.log('💡 [YouTube] Tip: Check network connection and try again');
    }
  }, [video.title, video.videoUrl]);

  return (
    <Animated.View key={`video-container-${video.id}`} style={[styles.videoContainer, { opacity: fadeAnim }]}>
      <View key={`strict-clip-${video.id}`} style={styles.strictClipContainer}>
        {isYouTube ? (
          // YouTube videos - with error handling
          <View key={`youtube-container-${video.id}`} style={styles.videoTouchable}>
            {hasError ? (
              // YouTube error fallback
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>📺</Text>
                <Text style={[styles.errorText, { color: theme.text }]}>
                  YouTube video unavailable
                </Text>
                <Text style={[styles.errorSubtext, { color: theme.subText }]}>
                  This video may be restricted or require viewing on YouTube
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    setHasError(false);
                    setIsLoading(true);
                    setIsVideoReady(false);
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
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
                muted={!isActive}
              />
            )}
          </View>
        ) : isIframeEmbeddable ? (
          // Iframe embeddable videos (Mega, Google Drive, etc.)
          <View key={`iframe-container-${video.id}`} style={styles.videoTouchable}>
            {Platform.OS === 'web' && IframeVideo ? (
              <IframeVideo
                key={`iframe-${video.id}`}
                source={{ uri: convertToEmbedUrl(video.videoUrl) }}
                style={styles.video}
                onLoadStart={() => {
                  console.log('🖼️ [VideoItem] Iframe onLoadStart for:', video.title?.substring(0, 30));
                  console.log('🖼️ [VideoItem] Using embed URL:', convertToEmbedUrl(video.videoUrl));
                  setIsLoading(true);
                }}
                onLoad={() => {
                  console.log('✅ [VideoItem] Iframe onLoad for:', video.title?.substring(0, 30));
                  setIsLoading(false);
                  setIsVideoReady(true);
                  setHasError(false);
                }}
                onError={(error) => {
                  console.error('❌ [VideoItem] Iframe onError for:', video.title?.substring(0, 30), error);
                  setIsLoading(false);
                  setHasError(true);
                  setIsVideoReady(false);
                }}
              />
            ) : (
              // Fallback for non-web platforms
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>🖼️</Text>
                <Text style={[styles.errorText, { color: theme.text }]}>
                  Embedded Content
                </Text>
                <Text style={[styles.errorSubtext, { color: theme.subText }]}>
                  This embedded video is only available on web platforms
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    // Open in external browser/app
                    if (Platform.OS !== 'web') {
                      // For mobile, this would open in default browser
                      console.log('Opening iframe URL in external app:', video.videoUrl);
                    }
                  }}
                >
                  <Text style={styles.retryButtonText}>Open Externally</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : !isValidUrl ? (
          // Invalid video URL fallback
          <View key={`invalid-video-${video.id}`} style={styles.videoTouchable}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>🚫</Text>
              <Text style={[styles.errorText, { color: theme.text }]}>
                Invalid Video Source
              </Text>
              <Text style={[styles.errorSubtext, { color: theme.subText }]}>
                This video cannot be played due to an unsupported or blocked source
              </Text>
              <Text style={[styles.errorUrl, { color: theme.subText }]}>
                {video.videoUrl.length > 50 ? video.videoUrl.substring(0, 50) + '...' : video.videoUrl}
              </Text>
            </View>
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
              onLoadStart={() => {
                // Only show loading for non-preloaded videos
                if (!isPreloaded) {
                  setIsLoading(true);
                }
              }}
              onLoad={() => {
                if (loadingTimeoutRef.current) {
                  clearTimeout(loadingTimeoutRef.current);
                }
                setIsLoading(false);
                setIsVideoReady(true);

                // For preloaded videos, ensure instant playback
                if (isPreloaded && Platform.OS === 'web') {
                  const videoElement = videoRef.current;
                  if (videoElement && isActive) {
                    videoElement.play().catch(() => {
                      console.log('Instant play failed, retrying...');
                      videoElement.muted = true;
                      videoElement.play();
                    });
                  }
                }
              }}
              onError={(error: any) => {
                console.error('Video error:', error);
                if (loadingTimeoutRef.current) {
                  clearTimeout(loadingTimeoutRef.current);
                }
                setIsLoading(false);
                setHasError(true);
              }}
              onReady={() => {
                // Immediate ready state for faster responsiveness
                setIsVideoReady(true);
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
              <ShareIcon size={18} color="#ffffff" />
              <Text style={styles.controlText}>{video.shares || 0}</Text>
            </TouchableOpacity>

            {/* Views */}
            <TouchableOpacity style={styles.controlButton}>
              <EyeIcon size={18} color="#ffffff" />
              <Text style={styles.controlText}>{video.views || 0}</Text>
            </TouchableOpacity>
          </View>

          {/* Professional Creator Profile Section */}
          <View key={`creator-${video.id}`} style={styles.creatorProfileContainer}>
            <View style={styles.creatorInfo}>
              {/* Creator Profile Picture */}
              <View style={styles.profilePictureContainer}>
                <Image
                  source={{
                    uri: video.originalSource?.creatorProfilePic ||
                      'https://via.placeholder.com/40x40/4F46E5/FFFFFF?text=' +
                      (video.originalSource?.creatorName?.charAt(0) || 'N')
                  }}
                  style={styles.profilePicture}
                  defaultSource={{
                    uri: 'https://via.placeholder.com/40x40/4F46E5/FFFFFF?text=' +
                      (video.originalSource?.creatorName?.charAt(0) || 'N')
                  }}
                />
              </View>

              {/* Creator Name and Platform */}
              <View style={styles.creatorDetails}>
                <Text style={[styles.creatorName, { color: theme.text }]} numberOfLines={1}>
                  {video.originalSource?.creatorName || 'Daily Current Affairs'}
                </Text>
                <Text style={[styles.sourcePlatform, { color: theme.subText }]} numberOfLines={1}>
                  {video.originalSource?.sourcePlatform || 'News'} • Few hours ago
                </Text>
              </View>
            </View>
          </View>

          {/* Video Details - Simplified Title Only */}
          <View key={`details-${video.id}`} style={styles.videoDetailsContainer}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {video.title}
            </Text>
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
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const preloadRangeRef = useRef({ start: 0, end: 2 }); // Preload range

  useEffect(() => {
    loadVideos();
  }, []);

  // Check for no videos only after loading has been attempted and enough time has passed
  useEffect(() => {
    if (!loading && hasAttemptedLoad && videos.length === 0 && !error) {
      const timer = setTimeout(() => {
        if (videos.length === 0) {
          console.log('⚠️ [VideoFeed] No videos found after loading attempt');
          setError('No videos available');
        }
      }, 2000); // Wait 2 seconds after loading completes

      return () => clearTimeout(timer);
    }
  }, [loading, hasAttemptedLoad, videos.length, error]);

  // Ultra-aggressive preloading for instant access
  const preloadVideo = useCallback((video: VideoReel) => {
    const videoIdStr = String(video.id);
    if (preloadedVideos.has(videoIdStr)) return;

    console.log('🚀 [VideoFeed] Preloading video:', video.title?.substring(0, 30));

    // For regular videos, preload entire video for instant playback
    if (Platform.OS === 'web' && !isYouTubeUrl(video.videoUrl)) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'auto'; // Load entire video, not just metadata
      videoElement.muted = true; // Enable autoplay compatibility
      videoElement.playsInline = true;
      videoElement.src = video.videoUrl;

      // Force immediate loading
      videoElement.load();

      // Try to buffer video data immediately
      videoElement.addEventListener('canplaythrough', () => {
        console.log('✅ [VideoPreload] Video ready for instant playback:', video.title?.substring(0, 20));
      });

      // Store video element for instant access
      (window as any).preloadedVideoElements = (window as any).preloadedVideoElements || new Map();
      (window as any).preloadedVideoElements.set(videoIdStr, videoElement);
    }

    // For YouTube videos, prefetch embed and extract video ID for faster loading
    if (isYouTubeUrl(video.videoUrl)) {
      const videoId = extractYouTubeVideoId(video.videoUrl);
      if (videoId) {
        console.log('🎬 [VideoFeed] YouTube video ID extracted for instant loading:', videoId);

        // Prefetch YouTube embed page
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = `https://www.youtube-nocookie.com/embed/${videoId}`;
        document.head.appendChild(link);

        // Also prefetch thumbnail for immediate display
        const thumbLink = document.createElement('link');
        thumbLink.rel = 'prefetch';
        thumbLink.href = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        document.head.appendChild(thumbLink);
      }
    }

    setPreloadedVideos(prev => new Set([...prev, videoIdStr]));
  }, [preloadedVideos]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      setHasAttemptedLoad(true);
      console.log('🔄 [VideoFeed] Loading videos with optimization...');

      // Try to load from cache first for instant display
      const cachedVideos = await VideoCacheService.getCachedVideoMetadata();
      if (cachedVideos && cachedVideos.length > 0) {
        console.log('⚡ [VideoFeed] Using cached videos for instant display:', cachedVideos.length);
        setVideos(cachedVideos);
        setLoading(false);

        // Still fetch fresh data in the background immediately
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

        // Aggressively preload first 5 videos for instant playback
        currentVideos.slice(0, 5).forEach((video: VideoReel, index: number) => {
          setTimeout(() => preloadVideo(video), index * 2); // Stagger by 2ms for ultra-fast loading
        });
      } else {
        // Don't immediately set error - videos may still be loading
        console.log('⚠️ [VideoFeed] No videos yet, but continuing to try loading...');
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

      // Super aggressive preloading for smooth YouTube scrolling
      const preloadRange = { start: Math.max(0, newIndex - 2), end: Math.min(videos.length - 1, newIndex + 5) };

      if (preloadRange.start !== preloadRangeRef.current.start || preloadRange.end !== preloadRangeRef.current.end) {
        preloadRangeRef.current = preloadRange;

        // Prioritized preloading - YouTube videos first for instant scrolling
        const videosToPreload = [];
        for (let i = preloadRange.start; i <= preloadRange.end; i++) {
          if (videos[i] && i !== newIndex) {
            videosToPreload.push(videos[i]);
          }
        }

        // Sort by YouTube videos first for priority loading
        videosToPreload.sort((a, b) => {
          const aIsYT = isYouTubeUrl(a.videoUrl);
          const bIsYT = isYouTubeUrl(b.videoUrl);
          if (aIsYT && !bIsYT) return -1;
          if (!aIsYT && bIsYT) return 1;
          return 0;
        });

        // Preload with minimal staggering
        videosToPreload.forEach((video, index) => {
          setTimeout(() => preloadVideo(video), index * 1); // Ultra-fast 1ms stagger
        });
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70, // Reduced for faster switching
    minimumViewTime: 50, // Faster switching for smooth YouTube experience
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

      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />



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
          removeClippedSubviews={false} // Keep all videos in memory for instant access
          windowSize={15} // Extremely large window for YouTube video smooth scrolling
          initialNumToRender={4} // Render 4 videos initially for instant YouTube access
          maxToRenderPerBatch={7} // Render even more videos per batch
          updateCellsBatchingPeriod={5} // Ultra-fast updates for instant YouTube switching
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
              onPress={() => { }}
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
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
    lineHeight: 18,
  },
  errorUrl: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
    fontFamily: 'monospace',
    opacity: 0.5,
    paddingHorizontal: 20,
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
    marginVertical: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 22,
    minWidth: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  controlIcon: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 3,
    textAlign: 'center',
    color: '#ffffff',
  },
  controlText: {
    color: '#ffffff',
    fontSize: 10,
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
  // Creator Profile Styles
  creatorProfileContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 70, // Move closer to video details section
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flex: 1, // Take full available width
  },
  profilePictureContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
    marginRight: 12,
  },
  profilePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  creatorDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sourcePlatform: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
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