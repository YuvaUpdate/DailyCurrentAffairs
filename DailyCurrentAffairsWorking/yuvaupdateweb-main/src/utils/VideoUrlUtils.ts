// Video URL utilities for handling different platforms
export interface VideoUrlInfo {
  originalUrl: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  platform: 'YouTube' | 'Instagram' | 'TikTok' | 'Facebook' | 'Twitter' | 'Direct' | 'Other';
  videoId?: string;
  isSupported: boolean;
  playbackType: 'embed' | 'direct' | 'external';
}

export class VideoUrlUtils {
  
  /**
   * Parse and extract information from various video URLs
   */
  static parseVideoUrl(url: string): VideoUrlInfo {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // YouTube Shorts and regular videos
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return this.parseYouTubeUrl(url, urlObj);
      }
      
      // Instagram Reels and videos
      if (hostname.includes('instagram.com')) {
        return this.parseInstagramUrl(url, urlObj);
      }
      
      // TikTok videos
      if (hostname.includes('tiktok.com')) {
        return this.parseTikTokUrl(url, urlObj);
      }
      
      // Facebook videos
      if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
        return this.parseFacebookUrl(url, urlObj);
      }
      
      // Twitter/X videos
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        return this.parseTwitterUrl(url, urlObj);
      }
      
      // Direct video files
      if (url.match(/\.(mp4|webm|ogg|avi|mov|wmv|flv|m4v)(\?.*)?$/i)) {
        return {
          originalUrl: url,
          embedUrl: url,
          platform: 'Direct',
          isSupported: true,
          playbackType: 'direct'
        };
      }
      
      // Other/Unknown
      return {
        originalUrl: url,
        platform: 'Other',
        isSupported: false,
        playbackType: 'external'
      };
      
    } catch (error) {
      return {
        originalUrl: url,
        platform: 'Other',
        isSupported: false,
        playbackType: 'external'
      };
    }
  }
  
  /**
   * Parse YouTube URLs (regular videos, shorts, embedded)
   */
  private static parseYouTubeUrl(url: string, urlObj: URL): VideoUrlInfo {
    let videoId: string | null = null;
    
    // Extract video ID from various YouTube URL formats
    if (urlObj.hostname.includes('youtu.be')) {
      // https://youtu.be/VIDEO_ID
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.pathname.includes('/watch')) {
      // https://www.youtube.com/watch?v=VIDEO_ID
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.pathname.includes('/shorts/')) {
      // https://www.youtube.com/shorts/VIDEO_ID
      videoId = urlObj.pathname.split('/shorts/')[1];
    } else if (urlObj.pathname.includes('/embed/')) {
      // https://www.youtube.com/embed/VIDEO_ID
      videoId = urlObj.pathname.split('/embed/')[1];
    }
    
    if (videoId) {
      // Clean up video ID (remove any query parameters or extra characters)
      const cleanVideoId = videoId.split('?')[0].split('&')[0];
      
      // For YouTube Shorts, we need special embed parameters
      const isShorts = url.includes('/shorts/');
      const embedParams = isShorts 
        ? '?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&showinfo=0&fs=1&cc_load_policy=0&iv_load_policy=3&autohide=0&loop=1&playlist=' + cleanVideoId
        : '?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0&showinfo=0&loop=1&playlist=' + cleanVideoId;
      
      return {
        originalUrl: url,
        embedUrl: `https://www.youtube.com/embed/${cleanVideoId}${embedParams}`,
        thumbnailUrl: `https://img.youtube.com/vi/${cleanVideoId}/maxresdefault.jpg`,
        platform: 'YouTube',
        videoId: cleanVideoId,
        isSupported: true,
        playbackType: 'embed'
      };
    }
    
    return {
      originalUrl: url,
      platform: 'YouTube',
      isSupported: false,
      playbackType: 'external'
    };
  }
  
  /**
   * Parse Instagram URLs (reels, videos, posts)
   */
  private static parseInstagramUrl(url: string, urlObj: URL): VideoUrlInfo {
    // Instagram reels: https://www.instagram.com/reel/VIDEO_ID/
    // Instagram posts: https://www.instagram.com/p/POST_ID/
    const reelMatch = urlObj.pathname.match(/\/reel\/([^\/]+)/);
    const postMatch = urlObj.pathname.match(/\/p\/([^\/]+)/);
    
    const videoId = reelMatch?.[1] || postMatch?.[1];
    
    if (videoId) {
      // Clean URL - remove trailing slash and query parameters
      const cleanUrl = url.replace(/\/$/, '').split('?')[0];
      
      // Instagram blocks iframe embedding with X-Frame-Options: deny
      // So we'll treat it as external link but still mark as supported for tracking
      const thumbnailUrl = `https://via.placeholder.com/400x600/E4405F/white?text=📸+Instagram+Reel`;
      
      return {
        originalUrl: url,
        embedUrl: cleanUrl, // Keep original URL since embed is blocked
        thumbnailUrl,
        platform: 'Instagram',
        videoId,
        isSupported: true,
        playbackType: 'external' // Changed to external since iframe is blocked
      };
    }
    
    return {
      originalUrl: url,
      platform: 'Instagram',
      isSupported: false,
      playbackType: 'external'
    };
  }

  /**
   * Generate Instagram thumbnail using various methods
   */
  private static generateInstagramThumbnail(videoId: string, cleanUrl: string): string {
    // Method 1: Try Instagram oembed API for thumbnail
    // Note: This returns a placeholder since we can't make API calls from utils
    // The actual thumbnail will be fetched by the admin panel when processing the URL
    
    // Return a placeholder that can be replaced by actual thumbnail fetch
    return `https://instagram.com/favicon.ico`; // Placeholder
  }

  /**
   * Fetch Instagram thumbnail using oembed API
   */
  static async fetchInstagramThumbnail(instagramUrl: string): Promise<string | null> {
    try {
      console.log('🔍 Attempting Instagram thumbnail fetch for:', instagramUrl);
      
      // Clean the URL
      const cleanUrl = instagramUrl.replace(/\/$/, '').split('?')[0];
      
      // Note: Instagram's oembed API has CORS restrictions and requires authentication
      // For now, we'll return a branded placeholder
      console.log('ℹ️ Instagram oembed requires authentication and has CORS restrictions');
      
      // Extract video ID for a more specific placeholder
      const videoId = cleanUrl.split('/').pop() || 'unknown';
      
      // Create a more informative placeholder
      const placeholderUrl = `https://via.placeholder.com/400x600/E4405F/white?text=📸+Instagram+Reel+${videoId.substring(0, 8)}`;
      
      console.log('🖼️ Using Instagram placeholder thumbnail:', placeholderUrl);
      return placeholderUrl;
      
    } catch (error) {
      console.error('❌ Error with Instagram thumbnail:', error);
      return `https://via.placeholder.com/400x600/E4405F/white?text=📸+Instagram+Reel`;
    }
  }
  
  /**
   * Parse TikTok URLs
   */
  private static parseTikTokUrl(url: string, urlObj: URL): VideoUrlInfo {
    // TikTok videos: https://www.tiktok.com/@username/video/VIDEO_ID
    // TikTok short URLs: https://vm.tiktok.com/SHORT_ID/
    
    const videoMatch = urlObj.pathname.match(/\/video\/(\d+)/);
    const videoId = videoMatch?.[1];
    
    if (videoId) {
      return {
        originalUrl: url,
        embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
        platform: 'TikTok',
        videoId,
        isSupported: true,
        playbackType: 'embed'
      };
    }
    
    return {
      originalUrl: url,
      platform: 'TikTok',
      isSupported: true, // TikTok can often be embedded even without ID
      playbackType: 'embed'
    };
  }
  
  /**
   * Parse Facebook URLs
   */
  private static parseFacebookUrl(url: string, urlObj: URL): VideoUrlInfo {
    return {
      originalUrl: url,
      platform: 'Facebook',
      isSupported: true,
      playbackType: 'embed'
    };
  }
  
  /**
   * Parse Twitter/X URLs
   */
  private static parseTwitterUrl(url: string, urlObj: URL): VideoUrlInfo {
    return {
      originalUrl: url,
      platform: 'Twitter',
      isSupported: true,
      playbackType: 'embed'
    };
  }
  
  /**
   * Get appropriate video player HTML for different platforms
   */
  static getVideoPlayerHtml(videoInfo: VideoUrlInfo, width = '100%', height = '400px'): string {
    switch (videoInfo.platform) {
      case 'YouTube':
        if (videoInfo.embedUrl) {
          return `
            <iframe 
              width="${width}" 
              height="${height}" 
              src="${videoInfo.embedUrl}?autoplay=0&mute=1" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          `;
        }
        break;
        
      case 'Instagram':
        if (videoInfo.embedUrl) {
          return `
            <iframe 
              width="${width}" 
              height="${height}" 
              src="${videoInfo.embedUrl}" 
              frameborder="0" 
              scrolling="no" 
              allowtransparency="true">
            </iframe>
          `;
        }
        break;
        
      case 'TikTok':
        if (videoInfo.embedUrl) {
          return `
            <iframe 
              width="${width}" 
              height="${height}" 
              src="${videoInfo.embedUrl}" 
              frameborder="0" 
              allow="encrypted-media;" 
              allowfullscreen>
            </iframe>
          `;
        }
        break;
        
      case 'Direct':
        return `
          <video 
            width="${width}" 
            height="${height}" 
            controls 
            preload="metadata"
            style="max-width: 100%; height: auto;">
            <source src="${videoInfo.originalUrl}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        `;
        
      default:
        return `
          <div style="width: ${width}; height: ${height}; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border: 1px solid #ddd;">
            <p>Video preview not available for ${videoInfo.platform}</p>
            <br>
            <a href="${videoInfo.originalUrl}" target="_blank" rel="noopener noreferrer">Open in new tab</a>
          </div>
        `;
    }
    
    return '';
  }
  
  /**
   * Check if URL is a supported video platform
   */
  static isSupportedVideoUrl(url: string): boolean {
    return this.parseVideoUrl(url).isSupported;
  }
  
  /**
   * Get platform name from URL
   */
  static getPlatformFromUrl(url: string): string {
    return this.parseVideoUrl(url).platform;
  }
  
  /**
   * Get thumbnail URL if available
   */
  static getThumbnailUrl(url: string): string | undefined {
    return this.parseVideoUrl(url).thumbnailUrl;
  }
  
  /**
   * Generate embed URL with specific autoplay settings
   */
  static getEmbedUrlWithAutoplay(url: string, autoplay: boolean = true, muted: boolean = true): string | undefined {
    const videoInfo = this.parseVideoUrl(url);
    
    if (!videoInfo.isSupported || !videoInfo.videoId) {
      return videoInfo.embedUrl;
    }
    
    if (videoInfo.platform === 'YouTube') {
      const isShorts = url.includes('/shorts/');
      const autoplayParam = autoplay ? '1' : '0';
      const muteParam = muted ? '1' : '0';
      
      const embedParams = isShorts 
        ? `?autoplay=${autoplayParam}&mute=${muteParam}&controls=1&modestbranding=1&rel=0&showinfo=0&fs=1&cc_load_policy=0&iv_load_policy=3&autohide=0&loop=1&playlist=${videoInfo.videoId}`
        : `?autoplay=${autoplayParam}&mute=${muteParam}&controls=1&modestbranding=1&rel=0&showinfo=0&loop=1&playlist=${videoInfo.videoId}`;
      
      return `https://www.youtube.com/embed/${videoInfo.videoId}${embedParams}`;
    }
    
    if (videoInfo.platform === 'Instagram') {
      // Clean URL - remove trailing slash and query parameters
      const cleanUrl = url.replace(/\/$/, '').split('?')[0];
      
      // Instagram embed URL with autoplay and muted parameters
      const autoplayParam = autoplay ? '1' : '0';
      const mutedParam = muted ? '1' : '0';
      
      // Instagram embed supports limited parameters
      return `${cleanUrl}/embed/?autoplay=${autoplayParam}&muted=${mutedParam}`;
    }
    
    if (videoInfo.platform === 'TikTok') {
      // TikTok embed with autoplay (TikTok has limited autoplay support)
      const autoplayParam = autoplay ? 'true' : 'false';
      return `${videoInfo.embedUrl}&autoplay=${autoplayParam}`;
    }
    
    return videoInfo.embedUrl;
  }
}