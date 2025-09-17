import React, { useState, useEffect, useRef } from 'react';
import { VideoService } from '@/services/VideoService';
import { VideoReel } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Play, Pause, Share2, Eye, X, ExternalLink, Volume2, VolumeX, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoUrlUtils } from '@/utils/VideoUrlUtils';
import '@/styles/video-feed.css';

interface VideoFeedProps {
  onClose: () => void;
}

interface VideoPlayerProps {
  video: VideoReel;
  isActive: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isActive, onNext, onPrevious }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const seekingRef = useRef(false);
  const lastSeekPct = useRef(0);

  // Determine video type and source URL
  const getVideoType = () => {
    if (video.embedUrl && (video.platformInfo?.detectedPlatform === 'YouTube' || video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be'))) {
      return 'youtube';
    }
    if (video.embedUrl && (video.platformInfo?.detectedPlatform === 'Instagram' || video.videoUrl.includes('instagram.com'))) {
      return 'instagram';
    }
    if (video.embedUrl && (video.platformInfo?.detectedPlatform === 'TikTok' || video.videoUrl.includes('tiktok.com'))) {
      return 'tiktok';
    }
    return 'direct';
  };

  const videoType = getVideoType();
  const videoSrc = videoType === 'direct'
    ? video.videoUrl
    : (isActive
      ? VideoUrlUtils.getEmbedUrlWithAutoplay(video.videoUrl, true, true) || video.embedUrl
      : VideoUrlUtils.getEmbedUrlWithAutoplay(video.videoUrl, false, true) || video.embedUrl
    );

  

  useEffect(() => {
    if (isActive && videoType === 'direct' && videoRef.current) {
      // Ensure muted before attempting autoplay (required by most browsers)
      videoRef.current.muted = true;
      // Some browsers require the muted attribute to be set before play()
      try {
        videoRef.current.play();
      } catch (e) {
        // Retry once more muted
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => { });
      }
      setIsPlaying(true);
    } else if (videoType === 'direct' && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    // For iframe videos, we can't control playback directly
    // YouTube and other embeds handle their own playback
  }, [isActive, videoType]);

  const togglePlayPause = () => {
    if (videoType === 'direct' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
    // For iframe videos, the user controls playback through the embedded player
  };

  const toggleMute = () => {
    if (videoType === 'direct' && videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };



  const handleShare = async () => {
    try {
      const shareUrl = video.videoUrl || window.location.href;
      const shareTitle = video.title || 'Check out this video!';
      const shareText = video.description || 'Interesting video from Daily Current Affairs';

      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Fallback to copying link to clipboard
        await navigator.clipboard.writeText(shareUrl);

        // Show a temporary success message
        const button = document.activeElement as HTMLElement;
        const originalText = button?.querySelector('span')?.textContent;
        const spanElement = button?.querySelector('span');

        if (spanElement) {
          spanElement.textContent = 'Copied!';
          setTimeout(() => {
            spanElement.textContent = originalText || 'Share';
          }, 2000);
        }
      }

      // Track the share action
      try {
        await VideoService.trackVideoShare(String(video.id), 'user');
      } catch (error) {
        console.log('Share tracking failed:', error);
      }
    } catch (error) {
      console.error('Error sharing video:', error);

      // Fallback error handling
      try {
        await navigator.clipboard.writeText(video.videoUrl || window.location.href);
        alert('Video link copied to clipboard!');
      } catch (clipboardError) {
        console.error('Clipboard access failed:', clipboardError);
        alert('Unable to share. Please copy the link manually.');
      }
    }
  };

  

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  // Helper: format timestamp (milliseconds or ISO) into a short relative time string
  const formatRelativeTime = (ts?: number | string | null) => {
    if (!ts) return 'Unknown';
    const t = typeof ts === 'string' ? Date.parse(ts) : (typeof ts === 'number' ? ts : NaN);
    if (!t || Number.isNaN(t)) return 'Unknown';
    const diff = Date.now() - t;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  };

  const openSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    const href = (video.originalSource && (video.originalSource as any).sourceUrl) || video.videoUrl;
    if (href) {
      try {
        window.open(href, '_blank', 'noopener');
      } catch (err) {
        // fallback
        window.location.href = href;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
    }
  };

  return (
    <div
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ contain: 'layout style' }}
    >
      {/* Remove overlay that blocks interactions */}
      {/* Video Element, Iframe, or Instagram Special Case */}
      {videoType === 'direct' ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-cover"
          loop
          muted={isMuted}
          autoPlay
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlayPause}
          poster={video.thumbnailUrl}
        />
      ) : videoType === 'instagram' ? (
        // Instagram special case - show thumbnail with "Open in Instagram" overlay
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          {video.thumbnailUrl && (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          )}
          {/* Instagram Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">Instagram Reel</h3>
            <p className="text-white text-sm text-center mb-4 px-4">
              Instagram blocks embedding. Tap to view on Instagram.
            </p>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              onClick={() => window.open(video.videoUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Instagram
            </Button>
          </div>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          key={`${video.id}-${isActive}`}
          src={videoSrc}
          className="w-full h-full absolute inset-0 border-0"
          style={{
            overflow: 'hidden',
            objectFit: 'cover',
            pointerEvents: 'auto',
            zIndex: 10
          }}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          title={video.title}
        />
      )}

      {/* Play/Pause Overlay (only for direct videos) */}
      {videoType === 'direct' && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            onClick={togglePlayPause}
          >
            <Play className="h-8 w-8 text-white ml-1" />
          </Button>
        </div>
      )}

      {/* Audio Button (only for direct videos) */}
      {videoType === 'direct' && (
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-4 left-4 rounded-full w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20"
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-white" />
          ) : (
            <Volume2 className="h-4 w-4 text-white" />
          )}
        </Button>
      )}

      {/* Progress Bar (only for direct videos) */}
      {videoType === 'direct' && (
        <div
          className="absolute bottom-0 left-0 right-0 h-3 bg-white/20 cursor-pointer"
          onMouseDown={(e) => {
            // Begin seeking
            seekingRef.current = true;
            setIsSeeking(true);
            const el = e.currentTarget as HTMLDivElement;
            const rect = el.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            lastSeekPct.current = pct;
            if (videoRef.current && videoRef.current.duration) {
              try {
                videoRef.current.currentTime = pct * videoRef.current.duration;
                setProgress(pct * 100);
              } catch (err) {
                // ignore
              }
            }

            const onMove = (ev: MouseEvent) => {
              if (!seekingRef.current) return;
              const movePct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
              lastSeekPct.current = movePct;
              if (videoRef.current && videoRef.current.duration) {
                try {
                  videoRef.current.currentTime = movePct * videoRef.current.duration;
                  setProgress(movePct * 100);
                } catch (err) {}
              }
            };

            const onUp = () => {
              seekingRef.current = false;
              setIsSeeking(false);
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        >
          <div
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-0 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-lg"
            style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      )}

      {/* Platform indicator for embedded videos */}
      {videoType !== 'direct' && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {video.platformInfo?.detectedPlatform || 'Embedded Video'}
        </div>
      )}



      {/* Bottom details card - mobile friendly: stacks on small screens, aligns buttons to the right */}
      <div className="absolute bottom-4 sm:bottom-16 left-4 right-4 sm:left-20 sm:right-24 z-10">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center gap-3">
          {/* Source + time (clickable) */}
          <button onClick={openSource} className="flex items-center gap-2 min-w-0 text-white text-left truncate focus:outline-none" style={{ background: 'transparent', border: 'none', padding: 0 }}>
            <ExternalLink className="w-5 h-5 text-white/90 flex-shrink-0" />
            <div className="font-medium text-sm truncate">{video.originalSource?.sourcePlatform || 'Source'}</div>
            <div className="text-white/80 text-xs flex items-center gap-1 ml-2">
              <Clock className="w-4 h-4 text-white/70" />
              <span className="whitespace-nowrap">{formatRelativeTime(video.timestamp)}</span>
            </div>
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm sm:text-base line-clamp-2 leading-tight">{video.title}</h3>
          </div>

          {/* Buttons - right aligned; horizontal on mobile, vertical on desktop */}
          <div className="flex items-center gap-2 sm:flex-col sm:items-center">
            <button
              className="h-10 px-3 rounded-full flex items-center justify-center border border-white/10 bg-transparent whitespace-nowrap"
              title={`${video.views || 0} views`}
              onClick={(e) => { e.stopPropagation(); /* optional: show view details */ }}
              aria-label="Views"
            >
              <Eye className="h-4 w-4 text-white mr-2" />
              <span className="text-white text-xs font-medium">{video.views || 0}</span>
            </button>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 bg-transparent"
              title="Share"
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              aria-label="Share"
            >
              <Share2 className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VideoFeed: React.FC<VideoFeedProps> = ({ onClose }) => {
  const [videos, setVideos] = useState<VideoReel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Black transition mask state
  const maskTimerRef = useRef<number | null>(null);
  const [maskVisible, setMaskVisible] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const { videos: videoList } = await VideoService.getVideos(20);
      setVideos(videoList);
      // Prewarm network for first items to reduce startup delay
      try {
        prewarmVideoResources(videoList.slice(0, 5));
      } catch { }

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

  // Scroll handler used for the parent container: updates current index and shows a short black mask during scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const videoHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / videoHeight);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex);
    }

    setMaskVisible(true);
    if (maskTimerRef.current) {
      window.clearTimeout(maskTimerRef.current);
    }
    maskTimerRef.current = window.setTimeout(() => {
      setMaskVisible(false);
      maskTimerRef.current = null;
    }, 260);
  };

  // Add <link rel="preconnect|dns-prefetch|preload|prefetch"> for first videos
  const prewarmVideoResources = (items: VideoReel[]) => {
    const head = document.head;
    const appendOnce = (rel: string, href: string, attrs: Record<string, string> = {}) => {
      if (!href) return;
      const key = `${rel}:${href}`;
      if ((window as any).__prewarmKeys?.has(key)) return;
      (window as any).__prewarmKeys = (window as any).__prewarmKeys || new Set();
      (window as any).__prewarmKeys.add(key);
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      Object.entries(attrs).forEach(([k, v]) => link.setAttribute(k, v));
      head.appendChild(link);
    };

    // Global preconnects
    ['https://firebasestorage.googleapis.com', 'https://www.youtube-nocookie.com', 'https://img.youtube.com']
      .forEach(origin => {
        appendOnce('preconnect', origin, { crossOrigin: '' });
        appendOnce('dns-prefetch', origin);
      });

    items.forEach((v) => {
      const url = v.videoUrl || v.embedUrl;
      if (!url) return;
      const isYouTube = /youtube\.com|youtu\.be/.test(url);
      const isDirect = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || /firebasestorage\.googleapis\.com/.test(url);

      if (isDirect) {
        appendOnce('preload', url, { as: 'video', crossOrigin: 'anonymous' });
        appendOnce('prefetch', url, { as: 'video', crossOrigin: 'anonymous' });
      } else if (isYouTube) {
        // Prefetch thumbnail for instant paint
        const idMatch = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([^&\n?#]+)/);
        const vid = idMatch?.[1];
        if (vid) {
          appendOnce('prefetch', `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`, { as: 'image' });
          appendOnce('preconnect', 'https://www.youtube-nocookie.com', { crossOrigin: '' });
        }
      }
    });
  };

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleShare = async () => {
    console.log('handleShare called!');
    const currentVideo = videos[currentIndex];
    if (!currentVideo) {
      console.log('No current video found');
      return;
    }

    console.log('Sharing video:', currentVideo.title);

    const shareUrl = currentVideo.videoUrl || window.location.href;
    const shareTitle = currentVideo.title || 'Check out this video!';
    const shareText = currentVideo.description || 'Interesting video from Daily Current Affairs';

    try {
      // Check if native sharing is available and works
      if (navigator.share) {
        console.log('Using native share');
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else {
        console.log('Using clipboard fallback');
        // Faster clipboard approach
        try {
          await navigator.clipboard.writeText(shareUrl);
          // Quick success notification
          const notification = document.createElement('div');
          notification.textContent = '✓ Link copied!';
          notification.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 999999;
            transition: opacity 0.3s;
          `;
          document.body.appendChild(notification);
          setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => document.body.removeChild(notification), 300);
          }, 2000);
        } catch (clipError) {
          // Fallback for clipboard failure
          prompt('Copy this link to share:', shareUrl);
        }
      }

      // Track the share action in background (non-blocking)
      VideoService.trackVideoShare(String(currentVideo.id), 'user')
        .then(() => console.log('Share tracked successfully'))
        .catch((error) => console.log('Share tracking failed:', error));

    } catch (error) {
      console.error('Share failed:', error);
      // Quick fallback
      prompt('Copy this link to share:', shareUrl);
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error || videos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-center">
          <p className="mb-4">{error || 'No videos available'}</p>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden">

      {/* CLOSE BUTTON - Top Right - Completely Independent */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Immediate visual feedback
          e.currentTarget.style.transform = 'scale(0.95)';
          setTimeout(() => {
            e.currentTarget.style.transform = 'scale(1)';
          }, 100);

          console.log('CLOSE CLICKED!');
          // Execute immediately without delay
          onClose();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="fixed top-4 sm:top-6 right-4 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-transparent hover:bg-white/5 active:bg-white/10 border border-white/20 flex items-center justify-center transition-all duration-100 hover:scale-105 active:scale-95 z-[99999]"
        style={{
          pointerEvents: 'auto',
          zIndex: 99999,
          position: 'fixed',
          touchAction: 'manipulation'
        }}
      >
        <X className="h-6 w-6 sm:h-8 sm:w-8 text-white font-bold" />
      </button>

      {/* Removed large fixed share and views widgets - using compact right-side buttons near video details */}

      {/* Scrollable Video Feed with proper containment */}
      {/* Black mask covers background during transitions to avoid flash */}
      {maskVisible && (
        <div className="absolute inset-0 bg-black z-[40000] pointer-events-none" />
      )}
      <div
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={handleScroll}
      >
        {videos.map((video, index) => (
          <div
            key={`video-${video.id}-${index}`}
            className="h-screen snap-start relative overflow-hidden"
            style={{ contain: 'layout style paint' }}
          >
            <VideoPlayer
              video={video}
              isActive={index === currentIndex}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          </div>
        ))}
      </div>
    </div>
  );
};