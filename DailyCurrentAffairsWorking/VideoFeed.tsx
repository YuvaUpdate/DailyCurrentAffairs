import React, { useState, useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
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
import InshortsFeed from './InshortsFeed';
import { newsService } from './NewsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoReel } from './types';
import YouTubeVideoPlayer, { YouTubeVideoPlayerRef } from './YouTubeVideoPlayer';
import VideoCacheService from './VideoCacheService';

// Lightweight safe require used for optional native modules
function safeRequire(name: string) {
  try {
    // Use an indirect require call to avoid Metro bundler static-analysis errors for dynamic requires
    // (similar approach used elsewhere in this codebase).
    // eslint-disable-next-line no-new-func
    const r = Function('return require')();
    return r(name);
  } catch (e) {
    return null;
  }
}

// Normalize playback URL for proxied R2 media paths so native apps can
// resolve `/api/...` paths to an absolute URL when the backend is deployed
// on a different origin. Priority:
// 1. If VITE_API_BASE_URL is available at build time (web), use it.
// 2. If `globalThis.API_BASE` is set at runtime (recommended for native builds), use it.
// 3. Otherwise, return the original value unchanged.
function normalizePlaybackUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return rawUrl;
  try {
    // If already absolute, return as-is
    if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

    // If it's already a proxied absolute path from server-side (e.g. /api/r2/media?...)
    if (rawUrl.startsWith('/api/')) {
        // Use runtime global if set by the app bootstrap (recommended).
        // Support both `globalThis.API_BASE` and `window.__API_BASE__` injected by web admin.
        const runtimeBase = (globalThis as any)?.API_BASE || (typeof window !== 'undefined' ? (window as any).__API_BASE__ : undefined);
        if (runtimeBase && typeof runtimeBase === 'string' && runtimeBase.trim() !== '') {
          return runtimeBase.replace(/\/$/, '') + rawUrl;
        }
    }
  } catch (e) {
    // ignore and return original
  }
  return rawUrl;
}

// Safe helper for keep-awake: prefer expo-keep-awake when available, otherwise noop functions
function safeKeepAwake() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const k = require('expo-keep-awake');
    if (k && typeof k.activateKeepAwake === 'function' && typeof k.deactivateKeepAwake === 'function') {
      return {
        activate: () => { try { k.activateKeepAwake(); } catch (e) {} },
        deactivate: () => { try { k.deactivateKeepAwake(); } catch (e) {} },
      };
    }
  } catch (e) {}
  // Fallback no-ops
  return { activate: () => {}, deactivate: () => {} };
}

// Simple time-ago formatter (lightweight, avoids extra deps)
const formatTimeAgo = (iso?: string) => {
  try {
    if (!iso) return '';
    const ts = typeof iso === 'string' ? new Date(iso).getTime() : (iso as any).getTime();
    if (!ts) return '';
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    if (d < 7) return `${d}d ago`;
    const wk = Math.floor(d / 7);
    if (wk < 4) return `${wk}w ago`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `${mo}mo ago`;
    const yr = Math.floor(d / 365);
    return `${yr}y ago`;
  } catch (e) {
    return '';
  }
};

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
const WebVideo = Platform.OS === 'web' ? forwardRef<HTMLVideoElement, WebVideoProps>(({ source, style, onLoadStart, onLoad, onError, shouldPlay, isLooping, ...props }: WebVideoProps, forwardedRef) => {
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
  const video = videoRef.current;
  if (video && source?.uri && !hasCORSError && isValidVideoUrl) {

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
    ref: (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      // Forward the DOM node to parent ref
      try {
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else if (forwardedRef) (forwardedRef as any).current = el;
      } catch (e) {}
    },
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
}) : null;

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

let useReactNativeVideo = false;
if (Platform.OS === 'web') {
  VideoComponent = WebVideo;
  ResizeMode = { COVER: 'cover' }; // Mock ResizeMode for web
} else {
  // Prefer react-native-video if available (better native compatibility on some devices)
  try {
    // attempt to require react-native-video
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RNV = require('react-native-video');
    if (RNV && (RNV as any).default) {
      VideoComponent = (RNV as any).default;
      useReactNativeVideo = true;
    } else if (RNV) {
      VideoComponent = RNV;
      useReactNativeVideo = true;
    }
  } catch (e) {
    useReactNativeVideo = false;
  }

  if (!useReactNativeVideo) {
    const expoAv = require('expo-av');
    VideoComponent = expoAv.Video;
    ResizeMode = expoAv.ResizeMode;
  }
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
  onNext?: () => void;
  bottomCardHeight?: number;
  isManuallyPaused?: boolean;
  onManualPauseChange?: (paused: boolean) => void;
  isMuted?: boolean;
  onMuteChange?: (muted: boolean) => void;
  onBottomCardLayout?: (height: number) => void;
  onShare?: (item: VideoReel) => void;
  remountVersion?: number;
  onRequestRemount?: (id: string | number) => void;
  isFirst?: boolean;
}

// Track remount requests per-id to avoid spamming logs and repeated remounts
// Use a richer structure to implement attempt counting and exponential backoff
const remountRequested: Record<string, boolean> = {};
const remountAttemptsGlobal: Record<string, { attempts: number; lastAttemptTs: number }> = {};

const MAX_REMOUNT_ATTEMPTS = 3;
const shouldAttemptRemount = (id: string) => {
  try {
    const meta = remountAttemptsGlobal[id] || { attempts: 0, lastAttemptTs: 0 };
    const now = Date.now();
    const attempts = meta.attempts || 0;
    // exponential backoff: wait 2^attempts * 1000 ms before next try
    const backoffMs = Math.pow(2, attempts) * 1000;
    if (attempts >= MAX_REMOUNT_ATTEMPTS) return false;
    if (now - (meta.lastAttemptTs || 0) < backoffMs) return false;
    return true;
  } catch (e) {
    return false;
  }
};

const noteRemountAttempt = (id: string) => {
  const meta = remountAttemptsGlobal[id] || { attempts: 0, lastAttemptTs: 0 };
  remountAttemptsGlobal[id] = { attempts: (meta.attempts || 0) + 1, lastAttemptTs: Date.now() };
};

const VideoItem: React.FC<VideoItemProps> = ({ video, isActive, onPress, onNext, isDarkMode, isPreloaded = false, bottomCardHeight = 0, isManuallyPaused = false, onManualPauseChange, isMuted = false, onMuteChange, onBottomCardLayout, onShare: onShareProp, remountVersion = 0, onRequestRemount, isFirst = false }) => {
  const videoRef = useRef<any>(null);
  const youtubeRef = useRef<YouTubeVideoPlayerRef>(null);
  const progressIntervalRef = useRef<any>(null);
  const progressLoggedForIdRef = useRef<string | number | null>(null);
  const nativePollAttemptsRef = useRef<number>(0);
  const forcePlayDoneRef = useRef<boolean>(false);
  const estimatedDurationRef = useRef<number | null>(null);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(0);
  const [isProgressReady, setIsProgressReady] = useState<boolean>(false);
  // Local playback UI state: whether playback appears to be playing and local manual pause flag
  const [isPlayingState, setIsPlayingState] = useState<boolean>(false);
  const keepAwake = useRef<{ activate: () => void; deactivate: () => void } | null>(null);
  const [localManuallyPaused, setLocalManuallyPaused] = useState<boolean>(!!isManuallyPaused);
  const remountAttemptsRef = useRef<number>(0);
  const lastPositionRef = useRef<number>(0);
  const lastPositionTsRef = useRef<number>(Date.now());
  const progressWidthRef = useRef<number>(screenWidth - 16);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showControls, setShowControls] = useState(false);

  const isYouTube = useMemo(() => isYouTubeUrl(video.videoUrl), [video.videoUrl]);
  const isIframeEmbeddable = useMemo(() => isIframeEmbeddableUrl(video.videoUrl), [video.videoUrl]);
  // Normalize any proxied relative URLs (e.g. `/api/r2/media?...`) to absolute
  // when possible so native players can load them. Then validate the normalized URL.
  const normalizedUrl = useMemo(() => normalizePlaybackUrl(video.videoUrl), [video.videoUrl]);
  const isValidUrl = useMemo(() => isValidVideoUrl(normalizedUrl || ''), [normalizedUrl]);

  // Instant loading state management for smooth scrolling
  const [isLoading, setIsLoading] = useState(!isYouTube && !isIframeEmbeddable && !isPreloaded && isValidUrl); // Preloaded videos skip loading
  const [isVideoReady, setIsVideoReady] = useState(isYouTube || isIframeEmbeddable || isPreloaded || !isValidUrl); // YouTube, iframe and preloaded videos are always ready
  const [hasError, setHasError] = useState(!isValidUrl);

  // Debug logging for video type and state
  useEffect(() => {
    console.log(`� [VideoItem] "${video.title?.substring(0, 30)}..." - YouTube: ${isYouTube}, Iframe: ${isIframeEmbeddable}, Active: ${isActive}, Loading: ${isLoading}, Ready: ${isVideoReady}, Platform: ${Platform.OS}`);

    if (isIframeEmbeddable) {
      console.log(`🖼️ [VideoItem] Iframe source detected:`, normalizedUrl || video.videoUrl);
      console.log(`🖼️ [VideoItem] Will use embed URL:`, convertToEmbedUrl(normalizedUrl || video.videoUrl));
    }
  }, [isYouTube, isIframeEmbeddable, isActive, isLoading, isVideoReady, video.title, video.videoUrl]);

  // Initialize keep-awake helper once per item
  useEffect(() => {
    keepAwake.current = safeKeepAwake();
    return () => {
      try {
        keepAwake.current && keepAwake.current.deactivate();
      } catch (e) {}
      keepAwake.current = null;
    };
  }, []);

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

  // For players that don't reliably emit playback status (YouTube/iframe), use isActive as proxy to manage keep-awake
  useEffect(() => {
    try {
      if (isYouTube || isIframeEmbeddable) {
        if (isActive) {
          keepAwake.current && keepAwake.current.activate();
        } else {
          keepAwake.current && keepAwake.current.deactivate();
        }
      }
    } catch (e) {}
    // Also deactivate keep-awake on unmount of this effect
    return () => {
      try { keepAwake.current && keepAwake.current.deactivate(); } catch (e) {}
    };
  }, [isActive, isYouTube, isIframeEmbeddable]);

  // Keep local manual pause state in-sync with parent prop
  useEffect(() => {
    setLocalManuallyPaused(!!isManuallyPaused);
  }, [isManuallyPaused]);

  // Debug: log when parent mute prop changes for this item
  useEffect(() => {
    try {
      console.log('🔊 [VideoItem] isMuted prop for id', video.id, isMuted);
    } catch (e) {}
  }, [isMuted, video.id]);

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

          try {
            const y = youtubeRef.current as any;
            if (y && typeof y.play === 'function') {
              y.play().catch((error: any) => {
                console.log(`YouTube play attempt ${attempt + 1} failed:`, error);
                // Ultra-fast retry with 25ms delay
                setTimeout(() => attemptPlay(attempt + 1), 25);
              });
            } else {
              console.warn('[VideoItem] youtubeRef.play not available for video id', video.id);
            }
          } catch (err) {
            console.warn('[VideoItem] youtube play attempt threw', err);
            setTimeout(() => attemptPlay(attempt + 1), 25);
          }
        };

        // Try to play immediately, then with rapid retries
        attemptPlay();

        // Also try a second immediate attempt
        setTimeout(() => attemptPlay(0), 10);
      }
      // Handle regular videos with minimal delay
      else if (!isYouTube) {
        // Retry loop to start playback robustly on various native players
        const tryStart = (attempt = 0) => {
          setTimeout(async () => {
            const v = videoRef.current;
              if (!v) {
                if (attempt < 8) {
                  tryStart(attempt + 1);
                } else {
                  // Avoid spamming the logs and remount requests for the same id
                  if (!remountRequested[video.id]) {
                    console.warn('[VideoItem] play requested but videoRef is null for video id', video.id);
                    remountRequested[video.id] = true;
                    try { onRequestRemount && onRequestRemount(video.id); } catch (e) {}
                  }
                }
                return;
              }

            // If using react-native-video, attempt to nudge the player via native props
            if (useReactNativeVideo && Platform.OS !== 'web') {
              try {
                if (typeof v.setNativeProps === 'function') {
                  v.setNativeProps({ paused: false });
                }
              } catch (e) {}

              // Also try seek to current position as a nudge
              try {
                if (typeof v.seek === 'function') {
                  // seek to current pos or 0
                  try { v.seek(0); } catch (e) {}
                }
              } catch (e) {}

              // schedule another attempt if not started yet
              if (attempt < 8) tryStart(attempt + 1);
              return;
            }

            // Web path
            if (Platform.OS === 'web') {
              try {
                v.play && v.play().catch((error: any) => {
                  // ignore and retry
                });
              } catch (e) {}
              if (attempt < 8) tryStart(attempt + 1);
              return;
            }

            // expo-av path: attempt playAsync with retries
            try {
              if (typeof v.playAsync === 'function') {
                try {
                  await v.playAsync();
                } catch (err) {
                  // ignore: schedule retry
                }
              } else if (typeof v.play === 'function') {
                try { v.play(); } catch (e) {}
              }
            } catch (e) {}

            if (attempt < 8) tryStart(attempt + 1);
          }, attempt === 0 ? 30 : 200);
        };

        tryStart(0);
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
      if (isYouTube) {
        try {
          const y = youtubeRef.current as any;
          if (y && typeof y.pause === 'function') {
            y.pause().catch((error: any) => {
              console.log('YouTube pause failed:', error);
            });
          } else {
            console.warn('[VideoItem] pause requested but youtubeRef.pause not available for video id', video.id);
          }
        } catch (err) {
          console.warn('[VideoItem] youtube pause attempt threw', err);
        }
      }
      // Handle pause for regular videos
      else if (!isYouTube) {
        const v = videoRef.current;
        if (!v) {
          // videoRef missing - may be unmounted or not yet attached; request a remount once if configured
          if (typeof onRequestRemount === 'function' && remountAttemptsRef.current < 1) {
            remountAttemptsRef.current += 1;
            console.log('🔁 [VideoItem] Requesting remount because pause was requested but videoRef is missing for id', video.id);
            try { onRequestRemount(video.id); } catch (e) {}
          } else {
            // Avoid noisy repeated warnings
            // console.warn('[VideoItem] pause requested but videoRef is null for video id', video.id);
          }
          return;
        } else {
          try {
            if (Platform.OS === 'web') {
              v.pause && v.pause();
            } else {
              if (typeof v.pauseAsync === 'function') {
                v.pauseAsync().catch((err: any) => console.warn('[VideoItem] pauseAsync failed', err));
              } else if (typeof v.pause === 'function') {
                v.pause();
              }
            }
          } catch (e) {
            console.warn('[VideoItem] pause attempt threw', e);
          }
        }
      }
    }
  }, [isActive, video.id, fadeAnim, isYouTube]);

  // Apply the `isMuted` prop to the platform player whenever it or active state changes.
  useEffect(() => {
    try {
      const applyMute = async (muted: boolean) => {
        if (isYouTube) {
          const y = (youtubeRef.current as any);
          if (!y) return;
          try {
            if (muted) {
              if (typeof y.mute === 'function') y.mute();
              else if (typeof y.pause === 'function') y.pause();
            } else {
              if (typeof y.unMute === 'function') y.unMute();
            }
          } catch (err) { console.warn('[VideoItem] youtube mute/unmute attempt threw', err); }
          return;
        }

        const v = videoRef.current;
        if (!v) return;

        if (Platform.OS === 'web') {
          try { if (typeof v.muted !== 'undefined') v.muted = muted; } catch (e) { console.warn('[VideoItem] setting web muted failed', e); }
        } else {
          try {
            if (useReactNativeVideo) {
              try { if (typeof v.setNativeProps === 'function') v.setNativeProps({ muted }); } catch (e) {}
            } else if (typeof v.setIsMutedAsync === 'function') {
              await v.setIsMutedAsync(muted);
            }
          } catch (e) { console.warn('[VideoItem] setIsMutedAsync attempt threw', e); }
        }
      };

      // If this item is active or the global mute changed, apply mute state.
      applyMute(!!isMuted);
    } catch (e) {
      console.warn('[VideoItem] applyMute effect failed', e);
    }
  }, [isMuted, isYouTube, isActive]);

  // Playback progress tracking: expo-av supports onPlaybackStatusUpdate, web uses timeupdate events
  useEffect(() => {
    // Clear any existing interval/listeners
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // For web (HTMLVideoElement), attach timeupdate listener
    if (Platform.OS === 'web' && videoRef.current && !isYouTube) {
      const el = videoRef.current as HTMLVideoElement;
      const onTime = () => {
        try {
          const pos = Math.floor(el.currentTime * 1000) || 0;
          const rawDur = Math.floor((el.duration || 0) * 1000) || 0;
          const dur = rawDur >= 1000 ? rawDur : 0;
          setSafePosition(pos);
          if (dur > 0) setDurationMillis(dur);
          // One-time log when we first observe timeupdate for this video id
          if (progressLoggedForIdRef.current !== video.id) {
            progressLoggedForIdRef.current = video.id;
            console.log('👂 [VideoFeed] onTime fired for video id', video.id, 'currentTime(ms)=', pos, 'duration(ms)=', dur);
          }
        } catch (e) {}
      };
      el.addEventListener('timeupdate', onTime);
      el.addEventListener('durationchange', onTime);
      // Initialize values
      onTime();

      return () => {
        try { el.removeEventListener('timeupdate', onTime); el.removeEventListener('durationchange', onTime); } catch (e) {}
      };
    }

    // For mobile/native expo-av, we will rely on onPlaybackStatusUpdate prop (no extra interval here)
      // Fallback: on some platforms the onPlaybackStatusUpdate may not fire immediately for the first video.
      // Use getStatusAsync polling as a short-term fallback when running on native (Android/iOS) and videoRef exposes the method.
      if (!isYouTube && Platform.OS !== 'web' && videoRef.current) {
        try {
          const v: any = videoRef.current;
          if (typeof v.getStatusAsync === 'function') {
            // Initial read
            (async () => {
              try {
                const status = await v.getStatusAsync();
                    console.log('👂 [VideoFeed] native getStatusAsync initial for video id', video.id, 'rawStatus:', status && { positionMillis: status.positionMillis, durationMillis: status.durationMillis });
                    if (status) {
                      const pos = Math.floor((status.positionMillis || 0));
                      const rawDur = Math.floor(status.durationMillis || 0);
                      const dur = rawDur >= 1000 ? rawDur : 0;
                      setSafePosition(pos);
                      if (dur > 0) setDurationMillis(dur);
                    }
              } catch (e) { console.warn('[VideoFeed] native getStatusAsync initial read failed', e); }
            })();

            // Start a short polling interval to update progress until playback status update takes over
            nativePollAttemptsRef.current = 0;
            progressIntervalRef.current = setInterval(async () => {
              try {
                nativePollAttemptsRef.current += 1;
                    const status = await v.getStatusAsync();
                    if (status) {
                      const pos = Math.floor((status.positionMillis || 0));
                      const rawDur = Math.floor(status.durationMillis || 0);
                      const dur = rawDur >= 1000 ? rawDur : 0;
                      setPositionMillis(pos);
                      if (dur > 0) setDurationMillis(dur);
                    }
                // Stop polling after 12 attempts (~4.8s) or when we have progress
                    if (nativePollAttemptsRef.current > 12 || (status && (status.positionMillis || 0) > 0 && (Math.floor(status.durationMillis || 0) > 1000))) {
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                  }
                }
              } catch (e) {
                // ignore individual read errors but stop if too many
                if (nativePollAttemptsRef.current > 12) {
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                  }
                }
              }
            }, 400);

            return () => {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
            };
          }
        } catch (e) {}
      }
    // For YouTube, try a polling fallback if the youtubeRef provides getCurrentTime
    if (isYouTube && youtubeRef.current) {
      const anyRef = youtubeRef.current as any;
      if (typeof anyRef.getCurrentTime === 'function') {
        progressIntervalRef.current = setInterval(async () => {
          try {
            const sec = await anyRef.getCurrentTime();
            const durSec = typeof anyRef.getDuration === 'function' ? await anyRef.getDuration() : 0;
            const p = Math.floor((sec || 0) * 1000);
            const rawDurMs = Math.floor((durSec || 0) * 1000);
            const d = rawDurMs >= 1000 ? rawDurMs : 0;
            setSafePosition(p);
            if (d > 0) setDurationMillis(d);
          } catch (e) {}
        }, 500);

        return () => {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        };
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isYouTube, isVideoReady, video.id]);

  // Reset progress when switching to a new video item to avoid stale values (prevents first-video showing full)
  useEffect(() => {
    setPositionMillis(0);
    setDurationMillis(0);
    setIsProgressReady(false);
    estimatedDurationRef.current = null;
    // Reset smoothing and force-play state for new video
    lastPositionRef.current = 0;
    lastPositionTsRef.current = Date.now();
    forcePlayDoneRef.current = false;
  }, [video.id]);

  // Helper to set position with basic smoothing to avoid sudden large jumps
  const setSafePosition = (newPos: number) => {
    try {
      const now = Date.now();
      const last = lastPositionRef.current || 0;
      const elapsed = Math.max(0, now - (lastPositionTsRef.current || now));
      // Allow up to elapsed + 500ms of forward progress; cap excessively large jumps
      const maxAdvance = elapsed + 500;
      const allowed = last + maxAdvance;
      const finalPos = newPos > allowed ? allowed : newPos;
      lastPositionRef.current = finalPos;
      lastPositionTsRef.current = now;
      setPositionMillis(finalPos);
      // If duration is not yet known but position is progressing, create an estimated duration
      // so the progress UI can show approximate progress instead of staying empty.
      if ((!durationMillis || durationMillis === 0) && finalPos > 0 && !estimatedDurationRef.current) {
        // Estimate conservatively: assume at least 15s, or 4x current position (to avoid early full bar)
        estimatedDurationRef.current = Math.max(15000, finalPos * 4);
        try { setIsProgressReady(true); } catch (e) {}
        console.log('🧭 [VideoItem] Estimated duration set for video id', video.id, estimatedDurationRef.current);
      }
    } catch (e) {}
  };

  // Mark progress ready only when we get a reasonable duration (avoid showing full bar for unknown duration)
  useEffect(() => {
    try {
      // Consider progress ready if we have a real non-zero duration, or if we have an estimated duration and playback has started.
      const hasRealDuration = !!durationMillis && durationMillis >= 200;
      const hasEstimated = !!estimatedDurationRef.current && estimatedDurationRef.current >= 200;
      if (hasRealDuration || (hasEstimated && positionMillis > 0)) {
        setIsProgressReady(true);
      } else {
        setIsProgressReady(false);
      }
    } catch (e) {}
  }, [durationMillis, positionMillis]);

  // Force-play fallback: if polling didn't yield duration/position for the active native video,
  // briefly play muted then pause to coax platforms (notably some Android devices) to populate metadata.
  useEffect(() => {
    // Only for regular native videos
    if (!isActive || isYouTube || Platform.OS === 'web' || !isVideoReady) return;

    // Only run once per video
    if (forcePlayDoneRef.current) return;

    // Trigger fallback only when we've polled a few times and still have no useful duration/position
    if ((nativePollAttemptsRef.current >= 4 || nativePollAttemptsRef.current === 0) && durationMillis === 0 && positionMillis === 0) {
      const v = videoRef.current;
      if (!v) {
        console.warn('⚡ [VideoItem] Force-play fallback requested but videoRef is null for video id', video.id);
        // Backoff-aware remount
        if (shouldAttemptRemount(String(video.id))) {
          noteRemountAttempt(String(video.id));
          console.log('🔁 [VideoItem] Requesting remount (backoff) because videoRef is missing for video id', video.id);
          try { onRequestRemount && onRequestRemount(video.id); } catch (e) {}
        } else {
          console.warn('⚡ [VideoItem] Remount attempts exhausted for video id', video.id, '-> marking error');
          setHasError(true);
        }
        forcePlayDoneRef.current = true;
        return;
      }

      (async () => {
        try {
          console.log('⚡ [VideoItem] Force-play fallback initiating for video id', video.id, 'nativePollAttempts=', nativePollAttemptsRef.current);

          // Remember previous mute state if possible
          let prevMuted = false;
          try {
            if (typeof v.getStatusAsync === 'function') {
              const s = await v.getStatusAsync();
              prevMuted = !!(s && s.isMuted);
            } else if (typeof v.muted !== 'undefined') {
              prevMuted = !!v.muted;
            }
          } catch (e) {}

          // Ensure muted play to avoid audible blip
          try {
            if (typeof v.setIsMutedAsync === 'function') {
              await v.setIsMutedAsync(true);
            } else if (typeof v.muted !== 'undefined') {
              try { v.muted = true; } catch (e) {}
            }
          } catch (e) {}

          // Short play then pause
          try {
            if (typeof v.playAsync === 'function') {
              await v.playAsync();
              await new Promise((res) => setTimeout(res, 220));
              if (typeof v.pauseAsync === 'function') await v.pauseAsync();
            } else if (typeof v.play === 'function') {
              // Rare fallback
              try { await v.play(); } catch (e) {}
              await new Promise((res) => setTimeout(res, 220));
              try { if (typeof v.pause === 'function') v.pause(); } catch (e) {}
            }
          } catch (e) {
            console.warn('⚡ [VideoItem] Force-play play/pause attempt failed for video id', video.id, e);
          }

          // Restore mute to previous value (or keep unmuted if parent requested unmute)
          try {
            // If parent requested unmute for the active item, respect that by unmuting
            if (typeof v.setIsMutedAsync === 'function') {
              // If parent intends unmuted (isActive auto-unmute earlier), set to false; otherwise restore previous
              await v.setIsMutedAsync(false);
            } else if (typeof v.muted !== 'undefined') {
              try { v.muted = false; } catch (e) {}
            }
          } catch (e) {}

          console.log('⚡ [VideoItem] Force-play fallback complete for video id', video.id);
        } catch (e) {
          console.warn('⚡ [VideoItem] Force-play fallback failed for video id', video.id, e);
        } finally {
          forcePlayDoneRef.current = true;
        }
      })();
    }
  }, [isActive, isYouTube, isVideoReady, durationMillis, positionMillis, video.id]);

  // If metadata never arrives after force-play, remount the component once to recover
  useEffect(() => {
    if (!isActive || isYouTube || Platform.OS === 'web') return;
    if (durationMillis > 0 || positionMillis > 0) return;

    if (forcePlayDoneRef.current && remountAttemptsRef.current < 1) {
      remountAttemptsRef.current += 1;
      console.log('🔁 [VideoItem] Requesting remount to recover metadata for video id', video.id);
      try {
        if (typeof onRequestRemount === 'function') onRequestRemount(video.id);
      } catch (e) {}
    }
  }, [isActive, isYouTube, durationMillis, positionMillis, video.id, onRequestRemount]);



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
                videoUrl={normalizedUrl || video.videoUrl}
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
                source={{ uri: convertToEmbedUrl(normalizedUrl || video.videoUrl) }}
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
                {(normalizedUrl || video.videoUrl).length > 50 ? (normalizedUrl || video.videoUrl).substring(0, 50) + '...' : (normalizedUrl || video.videoUrl)}
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
            {/* If we have unrecoverable remount attempts for this id, show placeholder UI instead of trying to mount repeatedly */}
            {remountAttemptsGlobal[String(video.id)] && remountAttemptsGlobal[String(video.id)].attempts >= MAX_REMOUNT_ATTEMPTS && hasError ? (
              <View style={[styles.videoPlaceholder, { backgroundColor: '#000' }]}> 
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Video unavailable</Text>
                <Text style={{ color: '#ccc', fontSize: 12, marginTop: 8, paddingHorizontal: 20, textAlign: 'center' }}>This video could not be loaded automatically. You can retry manually.</Text>
                <TouchableOpacity onPress={() => {
                  // Clear remount attempts and request remount again
                  try {
                    remountAttemptsGlobal[String(video.id)] = { attempts: 0, lastAttemptTs: 0 };
                    remountRequested[video.id] = false;
                    setHasError(false);
                    setIsLoading(true);
                    // bump remount map so child will re-create
                    try { onRequestRemount && onRequestRemount(video.id); } catch (e) {}
                  } catch (e) { console.warn('Retry click failed', e); }
                }} style={{ marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#007AFF', borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <VideoComponent
              key={`video-component-${video.id}`}
              ref={videoRef}
              source={{ uri: normalizedUrl || video.videoUrl }}
              style={styles.video}
              onLoadStart={() => {
                // Only show loading for non-preloaded videos
                if (!isPreloaded) {
                  setIsLoading(true);
                }
              }}
              onLoad={() => {
                try {
                  if (loadingTimeoutRef.current) {
                    clearTimeout(loadingTimeoutRef.current);
                    loadingTimeoutRef.current = null;
                  }
                  setIsLoading(false);
                  setIsVideoReady(true);
                  console.log('🛬 [VideoItem] onLoad fired for video id', video.id, 'isActive:', isActive, 'videoRef current:', !!videoRef.current);

                  // For preloaded videos, ensure instant playback on web
                  if (isPreloaded && Platform.OS === 'web') {
                    const videoElement = videoRef.current;
                    if (videoElement && isActive) {
                      videoElement.play().catch(() => {
                        console.log('Instant play failed, retrying...');
                        videoElement.muted = true;
                        videoElement.play().catch(() => {});
                      });
                    }
                  }

                  // Apply mute/unmute according to parent prop
                  const desiredMuted = !!isMuted;
                  const v = videoRef.current;
                  if (!v) {
                    // Do backoff-aware remount attempts. If exhausted, mark unrecoverable so we show a placeholder instead of looping.
                    if (!shouldAttemptRemount(String(video.id))) {
                      console.warn('⚡ [VideoItem] onLoad: videoRef missing and remount attempts exhausted for video id', video.id);
                      remountRequested[video.id] = true;
                      forcePlayDoneRef.current = true;
                      setHasError(true);
                      setIsVideoReady(false);
                      return;
                    }

                    console.warn('⚡ [VideoItem] onLoad: videoRef is null for video id', video.id, '-> requesting remount');
                    noteRemountAttempt(String(video.id));
                    remountRequested[video.id] = true;
                    try { onRequestRemount && onRequestRemount(video.id); } catch (e) {}
                    forcePlayDoneRef.current = true;
                    return;
                  }

                  if (Platform.OS === 'web') {
                    try {
                      // Set muted flag first then attempt play if desired
                      v.muted = !!desiredMuted;
                      if (!desiredMuted && isActive) {
                        try { v.play && v.play().catch(() => {}); } catch (e) {}
                      }
                    } catch (e) { console.warn('[VideoItem] apply web muted failed', e); }
                  } else {
                    try {
                      if (typeof v.setIsMutedAsync === 'function') {
                        v.setIsMutedAsync(desiredMuted).catch((err: any) => console.warn('[VideoItem] setIsMutedAsync failed', err));
                      } else if (typeof v.setNativeProps === 'function') {
                        try { v.setNativeProps({ muted: desiredMuted }); } catch (e) {}
                      } else if (typeof v.muted !== 'undefined') {
                        try { v.muted = desiredMuted; } catch (e) {}
                      }
                    } catch (e) { console.warn('[VideoItem] apply native muted failed', e); }
                  }
                } catch (e) {
                  console.warn('[VideoItem] onLoad handler failed', e);
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
              } : (useReactNativeVideo ? {
                // react-native-video props
                paused: !isActive,
                muted: !isActive,
                repeat: true,
                resizeMode: 'cover',
                onLoad: (meta: any) => {
                  try {
                    const durMs = Math.floor((meta.duration || 0) * 1000);
                    if (durMs >= 1000) setDurationMillis(durMs);
                    setIsLoading(false);
                    setIsVideoReady(true);
                  } catch (e) {}
                },
                onProgress: (data: any) => {
                  try {
                    const pos = Math.floor((data.currentTime || 0) * 1000);
                    setSafePosition(pos);
                  } catch (e) {}
                }
              } : {
                // Mobile-specific props (expo-av)
                rate: 1.0,
                volume: 1.0,
                // Ensure non-active items are muted so only the active video plays audio
                isMuted: !!isMuted || !isActive,
                resizeMode: ResizeMode.COVER,
                shouldPlay: isActive,
                isLooping: true,
                onPlaybackStatusUpdate: (status: any) => {
                  try {
                    // Debug log playback status for this video id
                    if (status) {
                        const posRaw = typeof status.positionMillis === 'number' ? Math.floor(status.positionMillis) : -1;
                        const durRaw = typeof status.durationMillis === 'number' ? Math.floor(status.durationMillis) : 0;
                        // Treat tiny durations (<1000ms) as invalid/unknown until a real duration is provided
                        const dur = durRaw >= 1000 ? durRaw : 0;
                        const playing = !!status.isPlaying || !!status.shouldPlay || false;
                        console.log('🔔 [VideoItem] onPlaybackStatusUpdate for id', video.id, { pos: posRaw, dur, playing, rawDur: durRaw });
                        // Update playing UI state only when user hasn't manually paused this item
                        if (!localManuallyPaused) setIsPlayingState(playing);
                        // Keep screen awake while actually playing
                        try {
                          if (playing) {
                            keepAwake.current && keepAwake.current.activate();
                          } else {
                            keepAwake.current && keepAwake.current.deactivate();
                          }
                        } catch (e) {}
                        if (posRaw >= 0) setSafePosition(posRaw);
                        if (dur > 0) {
                          // Real duration has arrived; clear any estimated duration and mark ready
                          estimatedDurationRef.current = null;
                          setDurationMillis(dur);
                          try { setIsProgressReady(true); } catch (e) {}
                        }
                    }
                  } catch (e) { console.warn('[VideoItem] onPlaybackStatusUpdate error', e); }
                },
              }))}
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
          {/* Creator profile (positioned just above the bottom details card) */}
          {/* Move creator profile further up by adding extra offset */}
          {/* Move creator profile higher above the details card and ensure it sits above via zIndex */}
          {/* Progress UI removed per request */}

          <View pointerEvents="box-none" style={{ position: 'absolute', left: 8, right: 8, bottom: (24 + (bottomCardHeight || 52) + 84), zIndex: 1300, elevation: 16 }}>
            <TouchableOpacity onPress={() => {
              // Open creator profile/source if available
              const url = video.originalSource?.sourceUrl;
              if (url) {
                if (typeof window !== 'undefined' && window.open) {
                  window.open(url, '_blank');
                } else {
                  try { const Linking = require('react-native').Linking; Linking.openURL(url); } catch (e) {}
                }
              }
            }} activeOpacity={0.85} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              
            </TouchableOpacity>
          </View>

          {/* Video Details - Bottom card with title, source link, share and views (centered and fuller) */}
          <View key={`details-${video.id}`} style={[styles.videoDetailsContainer, { backgroundColor: 'transparent', paddingHorizontal: 0, alignItems: 'center' }]} pointerEvents="box-none">
            <View pointerEvents="auto" style={{ position: 'absolute', left: 0, right: 0, bottom: 40, zIndex: 1200, elevation: 12 }} onLayout={(e) => { const h = e.nativeEvent.layout?.height || 0; if (h && onBottomCardLayout) onBottomCardLayout(h); }}>
              <View style={{ width: '100%', alignSelf: 'stretch' }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.35, shadowRadius: 6 }}>
                  <View style={{ flex: 1, minWidth: 0, marginRight: 10, paddingLeft: 6, alignItems: 'flex-start' }}>
                    <Text style={[styles.title, { color: '#FFFFFF', fontSize: 18, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]} numberOfLines={2}>{video.title}</Text>
                    {video.timestamp ? (
                      <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 6 }}>{formatTimeAgo(video.timestamp)}</Text>
                    ) : null}
                    {video.originalSource?.sourceUrl ? (
                      <TouchableOpacity onPress={() => {
                        if (typeof window !== 'undefined' && window.open) {
                          window.open(video.originalSource.sourceUrl, '_blank');
                        } else {
                          try { const Linking = require('react-native').Linking; Linking.openURL(video.originalSource.sourceUrl); } catch (e) {}
                        }
                      }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ marginTop: 6 }}>
                        <View style={{ backgroundColor: '#122F3E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                          <Text style={{ color: '#4FC3F7', fontSize: 13, fontWeight: '600' }} numberOfLines={1}>Source Link</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <View style={{ width: 68, alignItems: 'center', justifyContent: 'center' }}>
                    <TouchableOpacity onPress={async () => {
                      try {
                        const url = video?.videoUrl || '';
                        const message = video?.title ? `${video.title}\n${url}` : url;
                        await Share.share({ message, url });
                        // Track share if VideoService available
                        try { if (typeof VideoService?.trackVideoShare === 'function') VideoService.trackVideoShare(String(video.id), 'anonymous_user'); } catch (e) { }
                      } catch (err) {
                        console.warn('Share failed', err);
                      }
                    }} style={{ marginBottom: 8, padding: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <View style={{ borderWidth: 1, borderColor: '#fff', borderRadius: 18, padding: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
                        <ShareIcon size={16} color="#fff" />
                      </View>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ borderWidth: 1, borderColor: '#fff', borderRadius: 16, padding: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
                        <EyeIcon size={14} color="#fff" />
                      </View>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginTop: 6 }}>{video.views || 0}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

        </View>
      </View>
    </Animated.View>
  );
};

export default function VideoFeed({ onClose, isDarkMode }: VideoFeedProps) {
  // Default to unmuted (audio ON) at app start. Persist '0' if no preference exists.
  const [isMutedGlobal, setIsMutedGlobal] = useState<boolean>(false);

  // Load persisted mute preference on mount; if missing, explicitly persist '0' (unmuted)
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('video_muted');
        if (v !== null) {
          setIsMutedGlobal(v === '1');
          console.log('🔊 [VideoFeed] loaded persisted mute:', v === '1');
        } else {
          // No preference found: default to unmuted and persist this choice so next open
          // reflects the same audio-on behavior.
          try {
            await AsyncStorage.setItem('video_muted', '0');
            console.log('🔊 [VideoFeed] no persisted mute found - defaulting to UNMUTED and persisting');
          } catch (e) {
            console.warn('Failed to persist default mute preference', e);
          }
          setIsMutedGlobal(false);
        }
      } catch (e) {
        console.warn('Failed to load mute preference', e);
        setIsMutedGlobal(false);
      }
    })();
  }, []);

  // AV warm-up: initialize native audio mode to help expo-av cold-starts on some Android devices.
  // This is guarded so it only runs when expo-av is available at runtime. Low-risk and helps first-video autoplay.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Delay slightly to avoid blocking startup (200ms)
        await new Promise(res => setTimeout(res, 200));
        const expoAv = safeRequire('expo-av');
        if (!expoAv || !expoAv.Audio || typeof expoAv.Audio.setAudioModeAsync !== 'function') return;
        // Call with conservative options that work across platforms
        await expoAv.Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        if (!cancelled) console.log('✅ [VideoFeed] AV warm-up completed');
      } catch (err) {
        console.warn('⚠️ [VideoFeed] AV warm-up failed', err);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const setMutedGlobally = async (muted: boolean) => {
    setIsMutedGlobal(muted);
    try {
      await AsyncStorage.setItem('video_muted', muted ? '1' : '0');
      console.log('🔊 [VideoFeed] setMutedGlobally persisted:', muted);
    } catch (e) {
      console.warn('Failed to save mute preference', e);
    }
  };
  const [videos, setVideos] = useState<VideoReel[]>([]);
  // remountMap holds per-video remount version counters. Child can request remount via onRequestRemount.
  const [remountMap, setRemountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preloadedVideos, setPreloadedVideos] = useState<Set<string>>(new Set());
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  // Animated scroll value to drive background reveal when scrolling between videos
  const scrollY = useRef(new Animated.Value(0)).current;
  // Transition mask (black) used to cover animated background when scrolling down on mobile APK
  const maskAnim = useRef(new Animated.Value(0)).current;
  const [articles, setArticles] = useState<any[]>([]);
  const [showArticlesBackground, setShowArticlesBackground] = useState(false);
  const showTimerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const prevOffsetRef = useRef<number>(0);
  const upStreakRef = useRef<number>(0);

  useEffect(() => {
    // Load sample articles for background preview (fast, avoids network during scroll)
    try {
      const sample = newsService.getSampleNews();
      setArticles(sample);
    } catch (err) {
      setArticles([]);
    }
  }, []);
  const insets = useSafeAreaInsets();
  const preloadRangeRef = useRef({ start: 0, end: 2 }); // Preload range

  useEffect(() => {
    loadVideos();
  }, []);

  // Ensure previous video is fully stopped when switching: force a remount of the previous item
  const prevIndexRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevIndexRef.current;
    if (prev !== null && prev !== currentIndex && videos[prev]) {
      const key = String(videos[prev].id);
      setRemountMap((m) => ({ ...m, [key]: (m[key] || 0) + 1 }));
      console.log('🔁 [VideoFeed] Forcing remount of previous video id', key);
    }
    prevIndexRef.current = currentIndex;
  }, [currentIndex, videos]);

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



      {/* Top-right global audio toggle */}
      <TouchableOpacity
        style={{ position: 'absolute', right: 12, top: insets.top + 12, zIndex: 2000, width: 42, height: 42, borderRadius: 21, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}
        onPress={() => {
          setMutedGlobally(!isMutedGlobal);
        }}
        activeOpacity={0.85}
      >
        <Image source={isMutedGlobal ? require('./assets/mute.png') : require('./assets/high-volume.png')} style={{ width: 22, height: 22, tintColor: '#fff' }} />
      </TouchableOpacity>

      {/* Strict boundary wrapper for video feed */}
      <View style={styles.videoBoundaryContainer}>

        {/* Animated background that will fade/translate as user scrolls */}
        <Animated.View pointerEvents="none" style={[styles.animatedBackground, {
          opacity: showArticlesBackground ? scrollY.interpolate({
            // Require a slightly larger scroll before background becomes visible to prevent sparks
            inputRange: [0, 20, screenHeight * 0.5, screenHeight],
            outputRange: [0, 0.18, 0.6, 1],
            extrapolate: 'clamp'
          }) : 0,
          transform: [{
            translateY: scrollY.interpolate({ inputRange: [0, screenHeight], outputRange: [0, -40], extrapolate: 'clamp' })
          }]
        }]}
        >
          {/* Render a lightweight read-only articles preview behind the videos. Pointer events disabled so feed remains interactive. */}
          <View style={{ flex: 1, backgroundColor: 'transparent' }} pointerEvents="none">
            <InshortsFeed articles={articles} refreshing={false} onRefresh={() => {}} onArticlePress={() => {}} bookmarkedArticles={new Set()} onBookmarkToggle={() => {}} />
          </View>
        </Animated.View>

        {/* Mobile-only black transition mask to prevent background flash when scrolling down */}
        {Platform.OS !== 'web' && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', zIndex: 2, opacity: maskAnim }]} />
        )}

        <Animated.FlatList
          ref={flatListRef}
          data={videos}
          extraData={[isMutedGlobal, currentIndex]}
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
          // Wire animated scroll to scrollY for background interpolation
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            {
              useNativeDriver: true,
              listener: (e: any) => {
                try {
                  const offsetY = e?.nativeEvent?.contentOffset?.y || 0;
                  const prev = prevOffsetRef.current || 0;
                  const dy = offsetY - prev; // positive when scrolling down, negative when scrolling up
                  prevOffsetRef.current = offsetY;

                  // Only trigger background reveal when user is scrolling UP (dy < -threshold).
                  // This avoids showing homepage when user scrolls DOWN quickly.
                  const directionThreshold = 16;
                  if (dy < -directionThreshold) {
                    // Hide mask when scrolling up (allow articles to reveal)
                    try { Animated.timing(maskAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(); } catch (err) {}
                    // Scrolling up meaningfully - increment streak
                    upStreakRef.current = (upStreakRef.current || 0) + 1;
                    // Require at least 2 consecutive upward events to avoid accidental shows
                    if (upStreakRef.current >= 2) {
                      if (showTimerRef.current) {
                        clearTimeout(showTimerRef.current as any);
                        showTimerRef.current = null;
                      }
                      // Confirm sustained upward scroll before showing
                      showTimerRef.current = setTimeout(() => {
                        setShowArticlesBackground(true);
                        showTimerRef.current = null;
                      }, 300) as unknown as number;
                    }
                  } else if (dy > directionThreshold) {
                    // Scrolling down significantly: show black mask to prevent background flashes
                    try { Animated.timing(maskAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start(); } catch (err) {}
                    // Scrolling down significantly: cancel any pending show and hide immediately
                    upStreakRef.current = 0;
                    if (showTimerRef.current) {
                      clearTimeout(showTimerRef.current as any);
                      showTimerRef.current = null;
                    }
                    if (stopTimerRef.current) {
                      clearTimeout(stopTimerRef.current as any);
                      stopTimerRef.current = null;
                    }
                    setShowArticlesBackground(false);
                  } else {
                    // small movements - reset streak
                    upStreakRef.current = 0;
                  }

                  // Clear any existing stop timer (we're still scrolling)
                  if (stopTimerRef.current) {
                    clearTimeout(stopTimerRef.current as any);
                    stopTimerRef.current = null;
                  }

                  // After a short idle (300ms) hide the articles background
                  stopTimerRef.current = setTimeout(() => {
                    setShowArticlesBackground(false);
                    // Also hide the mask after idle so background can be revealed later
                    try { Animated.timing(maskAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(); } catch (err) {}
                    stopTimerRef.current = null;
                    if (showTimerRef.current) {
                      clearTimeout(showTimerRef.current as any);
                      showTimerRef.current = null;
                    }
                  }, 300) as unknown as number;
                } catch (err) {}
              }
            }
          )}
          onScrollBeginDrag={(e: any) => {
            try {
              prevOffsetRef.current = e?.nativeEvent?.contentOffset?.y || 0;
              upStreakRef.current = 0;
              if (showTimerRef.current) { clearTimeout(showTimerRef.current as any); showTimerRef.current = null; }
            } catch (err) {}
          }}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => (
            <VideoItem
              key={`video-item-${item.id}-${index}-${remountMap[String(item.id)] || 0}`}
              video={item}
              isActive={index === currentIndex}
              onPress={() => { }}
              isDarkMode={isDarkMode}
              isPreloaded={preloadedVideos.has(String(item.id))}
              // Mute child if global mute is enabled or if this item is not the active one
              isMuted={!!isMutedGlobal || index !== currentIndex}
              onMuteChange={(m) => setMutedGlobally(m)}
              isFirst={index === 0}
              remountVersion={remountMap[String(item.id)] || 0}
              onRequestRemount={(id: string | number) => {
                const key = String(id);
                setRemountMap(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
              }}
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
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: screenHeight,
    backgroundColor: '#0a1220',
    zIndex: 0,
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