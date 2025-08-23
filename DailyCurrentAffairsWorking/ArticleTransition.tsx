import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ArticleTransitionProps {
  isVisible: boolean;
  direction: 'up' | 'down' | 'none';
  children: React.ReactNode;
}

const ArticleTransition: React.FC<ArticleTransitionProps> = ({ 
  isVisible, 
  direction, 
  children 
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (direction === 'none') {
      // Reset to default state
      translateY.setValue(0);
      opacity.setValue(1);
      scale.setValue(1);
      return;
    }

    const startValue = direction === 'up' ? height : -height;
    translateY.setValue(startValue);
    opacity.setValue(0);
    scale.setValue(0.8);

    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, direction]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});

export default ArticleTransition;
