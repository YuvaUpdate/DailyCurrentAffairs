import React, { memo, useState, useEffect } from 'react';
import { Image, View, StyleSheet, Dimensions } from 'react-native';
import ImagePrefetchService from './ImagePrefetchService';

interface FastThumbnailProps {
  source: { uri: string };
  style: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoad?: () => void;
  placeholder?: string;
}

const FastThumbnail = memo(({ 
  source, 
  style, 
  resizeMode = 'cover',
  onLoad,
  placeholder = 'https://picsum.photos/400/300?random=1'
}: FastThumbnailProps) => {
  const [isReady, setIsReady] = useState(false);
  const [imageSource, setImageSource] = useState(source);
  const prefetchService = ImagePrefetchService.getInstance();

  useEffect(() => {
    const imageUrl = source.uri;
    if (!imageUrl) {
      setImageSource({ uri: placeholder });
      setIsReady(true);
      return;
    }

    // Check if image is already cached - if so, show immediately
    const isCached = prefetchService.isImageCached(imageUrl);
    if (isCached) {
      setIsReady(true);
    } else {
      // Show placeholder first, then load actual image
      setImageSource({ uri: placeholder });
      setIsReady(true);
      
      // Load actual image in background
      prefetchService.prefetchImage(imageUrl).then(() => {
        setImageSource(source);
      }).catch(() => {
        // Keep placeholder on error
      });
    }
  }, [source.uri, placeholder]);

  const handleLoad = () => {
    onLoad?.();
  };

  if (!isReady) {
    return (
      <View style={[style, styles.placeholderContainer]}>
        <View style={styles.placeholder} />
      </View>
    );
  }

  return (
    <Image
      source={imageSource}
      style={style}
      resizeMode={resizeMode}
      onLoad={handleLoad}
      fadeDuration={100}
      progressiveRenderingEnabled={true}
    />
  );
});

const styles = StyleSheet.create({
  placeholderContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: '60%',
    height: '60%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});

FastThumbnail.displayName = 'FastThumbnail';

export default FastThumbnail;