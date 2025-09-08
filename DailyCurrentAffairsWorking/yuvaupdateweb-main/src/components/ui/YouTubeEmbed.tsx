import React from 'react';
import { Play } from 'lucide-react';

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  className?: string;
  autoplay?: boolean;
  controls?: boolean;
  modestbranding?: boolean;
}

export function YouTubeEmbed({ 
  videoId, 
  title = "YouTube video", 
  className = "",
  autoplay = false,
  controls = true,
  modestbranding = true
}: YouTubeEmbedProps) {
  // Build embed URL with proper parameters for web playback
  const embedUrl = `https://www.youtube.com/embed/${videoId}?` + new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    controls: controls ? '1' : '0',
    modestbranding: modestbranding ? '1' : '0',
    rel: '0', // Don't show related videos from other channels
    enablejsapi: '1', // Enable JavaScript API
    origin: typeof window !== 'undefined' ? window.location.origin : '', // Required for API
    playsinline: '1', // Play inline on mobile devices
    fs: '1', // Allow fullscreen
    cc_load_policy: '1', // Show captions if available
    iv_load_policy: '3', // Hide annotations
    disablekb: '0', // Enable keyboard controls
    showinfo: '0' // Hide video title and uploader info
  }).toString();

  return (
    <div className={`relative aspect-video ${className}`}>
      <iframe
        src={embedUrl}
        title={title}
        className="absolute inset-0 w-full h-full rounded border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        loading="lazy"
        frameBorder="0"
        style={{ border: 'none' }}
      />
    </div>
  );
}

interface YouTubeThumbnailProps {
  videoId: string;
  quality?: 'default' | 'medium' | 'high' | 'maxres';
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  showPlayButton?: boolean;
}

export function YouTubeThumbnail({ 
  videoId, 
  quality = 'high', 
  onClick, 
  className = "",
  showPlayButton = true 
}: YouTubeThumbnailProps) {
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;

  return (
    <div 
      className={`relative cursor-pointer group ${className}`}
      onClick={onClick}
    >
      <img
        src={thumbnailUrl}
        alt="YouTube video thumbnail"
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {showPlayButton && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors duration-200">
          <div className="bg-red-600 hover:bg-red-700 rounded-full p-4 group-hover:scale-110 transition-all duration-200 shadow-lg">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}
      {/* YouTube logo indicator */}
      <div className="absolute bottom-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
        YouTube
      </div>
    </div>
  );
}

// Helper function to extract YouTube video ID
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
