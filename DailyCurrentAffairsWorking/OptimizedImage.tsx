import React, { memo, useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';
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
  placeholder = 'https://via.placeholder.com/400x300/f0f0f0/999999?text=Loading...'
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSource, setImageSource] = useState(source);
  const prefetchService = ImagePrefetchService.getInstance();

  useEffect(() => {
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
    } else {
      // Start prefetching if not cached
      prefetchService.prefetchImage(imageUrl).then(() => {
        setIsLoading(false);
      }).catch(() => {
        setHasError(true);
        setIsLoading(false);
      });
    }
  }, [source.uri]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = (error: any) => {
    setHasError(true);
    setIsLoading(false);
    
    // Try placeholder if main image fails
    if (source.uri !== placeholder) {
      setImageSource({ uri: placeholder });
    }
    
    onError?.(error);
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
      <Image
        source={imageSource}
        style={[getImageStyle(), hasError && styles.errorImage, ImageAlignmentHelper.getImageAlignmentStyles()]}
        resizeMode={resizeMode}
        onError={handleError}
        onLoad={handleLoad}
        fadeDuration={fadeDuration}
        progressiveRenderingEnabled={progressiveRenderingEnabled}
        loadingIndicatorSource={loadingIndicatorSource}
      />
      
      {isLoading && showLoadingIndicator && (
        <View style={[styles.loadingContainer, getImageStyle()]}>
          <ActivityIndicator size="small" color="#999" />
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorImage: {
    opacity: 0.7,
  },
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
