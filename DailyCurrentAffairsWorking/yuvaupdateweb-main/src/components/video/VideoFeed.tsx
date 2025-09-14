import React, { useState, useEffect, useRef } from 'react';
import { VideoService } from '@/services/VideoService';
import { VideoReel } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Play, Pause, Heart, Share2, Eye, X, Volume2, VolumeX, ExternalLink } from 'lucide-react';
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
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(video.likes || 0);
  const [progress, setProgress] = useState(0);
  
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
      videoRef.current.play();
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
    // For iframe videos, mute is controlled by the embedded player
  };

  const handleLike = async () => {
    setIsLiked(!isLiked);
    setLocalLikes(prev => isLiked ? prev - 1 : prev + 1);
    
    try {
      await VideoService.toggleVideoLike(String(video.id), 'user');
    } catch (error) {
      console.error('Error updating like:', error);
      setIsLiked(isLiked);
      setLocalLikes(video.likes || 0);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: video.description,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
      await VideoService.trackVideoShare(String(video.id), 'user');
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'm':
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
      {/* Video Element, Iframe, or Instagram Special Case */}
      {videoType === 'direct' ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-cover"
          loop
          muted={isMuted}
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
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
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
            objectFit: 'cover'
          }}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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

      {/* Progress Bar (only for direct videos) */}
      {videoType === 'direct' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className="h-full bg-white transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {/* Platform indicator for embedded videos */}
      {videoType !== 'direct' && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {video.platformInfo?.detectedPlatform || 'Embedded Video'}
        </div>
      )}

      {/* Controls - Right Side with responsive positioning */}
      <div className="absolute right-2 sm:right-4 bottom-16 sm:bottom-20 flex flex-col gap-2 sm:gap-4 z-20">
        {/* Like Button */}
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full w-10 h-10 sm:w-12 sm:h-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm flex flex-col gap-0 sm:gap-1 p-0 transition-all"
          onClick={handleLike}
        >
          <Heart className={cn("h-4 w-4 sm:h-6 sm:w-6", isLiked ? "fill-red-500 text-red-500" : "text-white")} />
          <span className="text-[10px] sm:text-xs text-white font-medium leading-none">{localLikes}</span>
        </Button>

        {/* Share Button */}
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full w-10 h-10 sm:w-12 sm:h-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm flex flex-col gap-0 sm:gap-1 p-0 transition-all"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
          <span className="text-[10px] sm:text-xs text-white font-medium leading-none">{video.shares || 0}</span>
        </Button>

        {/* Views */}
        <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center gap-0 sm:gap-1">
          <Eye className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
          <span className="text-[10px] sm:text-xs text-white font-medium leading-none">{video.views || 0}</span>
        </div>

        {/* Mute Button */}
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full w-10 h-10 sm:w-12 sm:h-12 bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
          ) : (
            <Volume2 className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
          )}
        </Button>
      </div>

      {/* Video Details - Top Left with gradient overlay */}
      <div className="absolute top-16 sm:top-20 left-3 sm:left-4 right-16 sm:right-20 bg-gradient-to-b from-black/70 via-black/50 to-transparent px-3 sm:px-4 py-3 sm:py-4 max-h-[45vh] overflow-hidden rounded-b-lg">
        <div className="space-y-1 sm:space-y-2">
          <h3 className="text-white font-semibold text-sm sm:text-base mb-1 line-clamp-2 leading-tight drop-shadow-lg">{video.title}</h3>
          <p className="text-white/90 text-xs sm:text-sm mb-2 line-clamp-3 leading-tight drop-shadow-md">{video.description}</p>
          
          {/* Source */}
          <div className="flex items-center gap-1 sm:gap-2 mb-2">
            <span className="bg-blue-500/90 text-white text-[10px] sm:text-xs font-medium px-2 py-1 rounded-full truncate max-w-[180px] sm:max-w-[220px] shadow-lg">
              FROM: {video.originalSource?.sourcePlatform || 'Unknown'}
              {video.originalSource?.creatorName && ` • @${video.originalSource.creatorName}`}
            </span>
          </div>

          {/* Tags - Top positioned with better visibility */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap max-w-full overflow-hidden">
              {video.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="bg-cyan-500/30 text-cyan-200 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded shrink-0 max-w-[70px] sm:max-w-[90px] truncate shadow-md"
                >
                  #{tag}
                </span>
              ))}
              <span className="sm:hidden bg-cyan-500/30 text-cyan-200 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 max-w-[50px] truncate shadow-md">
                {video.tags.length > 2 && `+${video.tags.length - 2}`}
              </span>
              <span className="hidden sm:inline bg-gray-500/30 text-gray-200 text-xs font-medium px-2 py-1 rounded shrink-0 shadow-md">
                {video.tags.length > 3 && `+${video.tags.length - 3}`}
              </span>
            </div>
          )}
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
      {/* Close Button with Label */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-50">
        <Button
          onClick={onClose}
          size="lg"
          variant="ghost"
          className="rounded-full w-12 h-12 sm:w-14 sm:h-14 bg-black/60 hover:bg-black/80 backdrop-blur-md border-2 border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-110 group"
        >
          <X className="h-6 w-6 sm:h-8 sm:w-8 text-white font-bold" />
        </Button>
        <div className="absolute top-14 sm:top-16 right-0 bg-black/80 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap hidden sm:block">
          Back to Home (ESC)
        </div>
      </div>

      {/* Scrollable Video Feed with proper containment */}
      <div 
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={(e) => {
          const container = e.currentTarget;
          const scrollTop = container.scrollTop;
          const videoHeight = container.clientHeight;
          const newIndex = Math.round(scrollTop / videoHeight);
          if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
            setCurrentIndex(newIndex);
          }
        }}
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