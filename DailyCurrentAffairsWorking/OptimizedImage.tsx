import React, { memo } from 'react';
import { Image, StyleSheet } from 'react-native';

interface OptimizedImageProps {
  source: { uri: string };
  style: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onError?: (error: any) => void;
  onLoad?: () => void;
  fadeDuration?: number;
  progressiveRenderingEnabled?: boolean;
  loadingIndicatorSource?: any;
}

const OptimizedImage = memo(({ 
  source, 
  style, 
  resizeMode = 'cover',
  onError,
  onLoad,
  fadeDuration = 200,
  progressiveRenderingEnabled = true,
  loadingIndicatorSource
}: OptimizedImageProps) => {
  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={onError || ((error) => console.log('Image loading error:', error))}
      onLoad={onLoad || (() => console.log('Image loaded successfully:', source.uri))}
      fadeDuration={fadeDuration}
      progressiveRenderingEnabled={progressiveRenderingEnabled}
      loadingIndicatorSource={loadingIndicatorSource}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
