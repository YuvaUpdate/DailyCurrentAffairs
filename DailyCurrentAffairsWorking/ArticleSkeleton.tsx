import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const ArticleSkeleton: React.FC = () => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = () => {
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => shimmer());
    };
    shimmer();
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {/* Image Skeleton */}
      <Animated.View style={[styles.imageSkeleton, { opacity }]} />
      
      {/* Content Overlay Skeleton */}
      <View style={styles.contentOverlay}>
        <View style={styles.contentArea}>
          {/* Headline Skeleton */}
          <Animated.View style={[styles.headlineSkeleton, { opacity }]} />
          <Animated.View style={[styles.headlineSkeletonSmall, { opacity }]} />
          
          {/* Description Skeleton */}
          <View style={styles.descriptionContainer}>
            <Animated.View style={[styles.descriptionLine, { opacity }]} />
            <Animated.View style={[styles.descriptionLine, { opacity, width: '80%' }]} />
            <Animated.View style={[styles.descriptionLine, { opacity, width: '60%' }]} />
          </View>
          
          {/* Meta info skeleton */}
          <View style={styles.metaContainer}>
            <Animated.View style={[styles.metaSkeleton, { opacity }]} />
            <Animated.View style={[styles.metaSkeleton, { opacity, width: 80 }]} />
          </View>
          
          {/* Button skeleton */}
          <Animated.View style={[styles.buttonSkeleton, { opacity }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    backgroundColor: '#000000',
    position: 'relative',
  },
  imageSkeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2A2A2A',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    paddingBottom: 30,
  },
  contentArea: {
    marginBottom: 16,
  },
  headlineSkeleton: {
    height: 28,
    backgroundColor: '#404040',
    borderRadius: 4,
    marginBottom: 8,
  },
  headlineSkeletonSmall: {
    height: 28,
    backgroundColor: '#404040',
    borderRadius: 4,
    marginBottom: 12,
    width: '70%',
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionLine: {
    height: 16,
    backgroundColor: '#404040',
    borderRadius: 4,
    marginBottom: 6,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaSkeleton: {
    height: 14,
    width: 60,
    backgroundColor: '#404040',
    borderRadius: 4,
    marginRight: 16,
  },
  buttonSkeleton: {
    height: 40,
    backgroundColor: '#404040',
    borderRadius: 25,
    width: 150,
  },
});
