import React, { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  placeholder?: string;
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  onLoad,
  onError,
  loading = 'lazy',
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  sizes = '100vw',
  quality = 75
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate optimized image URLs for different sizes
  const generateOptimizedUrl = (originalSrc: string, width?: number, quality: number = 75) => {
    // If it's a Firebase Storage URL, add optimization parameters
    if (originalSrc.includes('firebasestorage.googleapis.com')) {
      const url = new URL(originalSrc);
      if (width) url.searchParams.set('w', width.toString());
      url.searchParams.set('q', quality.toString());
      url.searchParams.set('auto', 'format');
      return url.toString();
    }
    
    // For other URLs, return as-is (could add other CDN optimizations here)
    return originalSrc;
  };

  // Generate srcSet for responsive images
  const generateSrcSet = (originalSrc: string) => {
    const widths = [640, 768, 1024, 1280, 1536];
    return widths
      .map(width => `${generateOptimizedUrl(originalSrc, width)} ${width}w`)
      .join(', ');
  };

  // Preload critical images
  useEffect(() => {
    if (priority && src) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = generateOptimizedUrl(src, 640);
      document.head.appendChild(link);
      
      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [src, priority]);

  // Use Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'lazy' && imgRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px', // Start loading 50px before image enters viewport
          threshold: 0.1
        }
      );

      observer.observe(imgRef.current);

      return () => observer.disconnect();
    } else {
      // For eager loading, set src immediately
      setImageSrc(src);
    }
  }, [src, loading]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate blur placeholder
  const defaultBlurDataURL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIHN0b3AtY29sb3I9IiNmM2Y0ZjYiIG9mZnNldD0iMCUiLz48c3RvcCBzdG9wLWNvbG9yPSIjZTVlN2ViIiBvZmZzZXQ9IjEwMCUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+';

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {!isLoaded && placeholder === 'blur' && (
        <img
          src={blurDataURL || defaultBlurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      )}
      
      {/* Loading shimmer effect */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"></div>
        </div>
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc}
        srcSet={imageSrc ? generateSrcSet(imageSrc) : undefined}
        sizes={sizes}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading={loading}
        decoding="async"
        style={{
          imageRendering: 'auto',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)', // Force hardware acceleration
        }}
      />

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <span className="text-sm">Image unavailable</span>
        </div>
      )}
    </div>
  );
}

// Hook for preloading images
export function useImagePreloader(urls: string[]) {
  useEffect(() => {
    const preloadedImages: HTMLImageElement[] = [];

    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
      preloadedImages.push(img);
    });

    return () => {
      // Cleanup if needed
      preloadedImages.forEach(img => {
        img.src = '';
      });
    };
  }, [urls]);
}

// Service Worker image caching (if supported)
export function initImageCache() {
  if ('serviceWorker' in navigator && 'caches' in window) {
    caches.open('image-cache-v1').then(cache => {
      // Cache common placeholder images
      cache.addAll([
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIHN0b3AtY29sb3I9IiNmM2Y0ZjYiIG9mZnNldD0iMCUiLz48c3RvcCBzdG9wLWNvbG9yPSIjZTVlN2ViIiBvZmZzZXQ9IjEwMCUiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+'
      ]);
    });
  }
}
