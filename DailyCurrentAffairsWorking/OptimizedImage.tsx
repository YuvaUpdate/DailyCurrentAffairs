import React, { memo, useState, useEffect, useRef } from 'react';
import { Image, View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import ImagePrefetchService from './ImagePrefetchService';
import ImageAlignmentHelper from './ImageAlignmentHelper';

interface OptimizedImageProps {
  source: { uri: string };
  style: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onError?: (error: any) => void;
  onLoad?: () => void;
  fadeDuration?: number;
  progressiveRenderingEnabled?: boolean;
  loadingIndicatorSource?: any;
  showLoadingIndicator?: boolean;
  placeholder?: string;
}

const OptimizedImage = memo(({ 
  source, 
  style, 
  resizeMode = 'cover',
  onError,
  onLoad,
  fadeDuration = 100,
  progressiveRenderingEnabled = true,
  loadingIndicatorSource,
  showLoadingIndicator = false,
  placeholder = 'https://picsum.photos/400/300?random=1'
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSource, setImageSource] = useState(source);
  const appState = useRef(AppState.currentState);
  const [showImage, setShowImage] = useState(false);
  const prefetchService = ImagePrefetchService.getInstance();

  useEffect(() => {
    // Ensure local imageSource follows the latest prop when articles change
    setImageSource(source);
    const imageUrl = source.uri;
    if (!imageUrl) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Check if image is already cached
    const isCached = prefetchService.isImageCached(imageUrl);
    if (isCached) {
      setIsLoading(false);
      setShowImage(true); // Show immediately if cached
    } else {
      // Start prefetching if not cached
      prefetchService.prefetchImage(imageUrl).then(() => {
        setIsLoading(false);
        setShowImage(true); // Show after prefetch completes
      }).catch(() => {
        setHasError(true);
        setIsLoading(false);
      });
    }
  }, [source.uri]);

  // When the app comes back to the foreground, some platforms may return a cached image
  // for the same URL. Append a short-lived cache-busting query param to force reload
  // only when the app transitions to 'active'. This avoids touching server or web code.
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        try {
          const url = source?.uri;
          if (url) {
            // Preserve existing query params
            const separator = url.includes('?') ? '&' : '?';
            const busted = `${url}${separator}_r=${Date.now()}`;
            // Only update if the busted URL is different to avoid re-render loops
            if (busted !== imageSource.uri) {
              setImageSource({ uri: busted });
              // Allow prefetch service to register the new URL as cached after load
              // and then remove the param so other parts of the app still use canonical URL
            }
          }
        } catch (e) {
          // ignore
        }
      }
      appState.current = nextAppState;
    };

    // Register listener in a way that's compatible across RN versions
    let subscription: any = null;
    if (typeof (AppState as any).addEventListener === 'function') {
      // Newer RN: returns subscription with remove()
      subscription = (AppState as any).addEventListener('change', handleAppStateChange);
    } else {
      // Older RN: addEventListener exists but typings may differ; use old API
      try {
        (AppState as any).addEventListener('change', handleAppStateChange);
      } catch (e) {
        // ignore
      }
    }

    return () => {
      try {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        } else if (typeof (AppState as any).removeEventListener === 'function') {
          (AppState as any).removeEventListener('change', handleAppStateChange);
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, [source, imageSource.uri]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    setShowImage(true);
    onLoad?.();
  };

  const handleError = (error: any) => {
    // Silently handle network errors - don't log them
    setHasError(true);
    setIsLoading(false);
    
    // Try placeholder if main image fails and it's a different URL
    if (source.uri !== placeholder && !source.uri?.includes('picsum.photos')) {
      setImageSource({ uri: placeholder });
    }
    
    // Only call onError for non-network errors or if explicitly requested
    if (onError && !error?.nativeEvent?.error?.includes('ERR_NAME_NOT_RESOLVED')) {
      onError(error);
    }
  };

  const getImageStyle = () => {
    const cachedDimensions = prefetchService.getCachedDimensions(source.uri);
    if (cachedDimensions && typeof style === 'object' && !style.height && !style.width) {
      // Use cached dimensions to prevent layout shift
      const aspectRatio = cachedDimensions.width / cachedDimensions.height;
      return [style, { aspectRatio }];
    }
    return style;
  };

  return (
    <View style={[getImageStyle(), ImageAlignmentHelper.getContainerAlignmentStyles()]}>
      {showImage && (
        <Image
          source={imageSource}
          style={[getImageStyle(), hasError && styles.errorImage, ImageAlignmentHelper.getImageAlignmentStyles()]}
          resizeMode={resizeMode}
          onError={handleError}
          onLoad={handleLoad}
          fadeDuration={hasError ? 0 : fadeDuration} // No fade for error images
          progressiveRenderingEnabled={progressiveRenderingEnabled}
          loadingIndicatorSource={loadingIndicatorSource}
        />
      )}
      
      {isLoading && (
        <View style={[styles.loadingContainer, getImageStyle()]}>
          <View style={styles.shimmerContainer}>
            <View style={styles.shimmerPlaceholder} />
            {showLoadingIndicator && (
              <ActivityIndicator size="small" color="#666" style={styles.loadingSpinner} />
            )}
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  shimmerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  shimmerPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
  },
  loadingSpinner: {
    position: 'absolute',
  },
  errorImage: {
    opacity: 0.8,
  },
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
