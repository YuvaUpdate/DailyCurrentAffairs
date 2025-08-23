import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface SwipeIndicatorProps {
  visible: boolean;
  direction: 'up' | 'down';
}

const SwipeIndicator: React.FC<SwipeIndicatorProps> = ({ visible, direction }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset position
      translateY.setValue(direction === 'up' ? 30 : -30);
      opacity.setValue(0.8);

      // Animate swipe indicator
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: direction === 'up' ? -30 : 30,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, direction]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.indicator,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <Text style={styles.arrow}>
          {direction === 'up' ? '↑' : '↓'}
        </Text>
        <Text style={styles.text}>
          {direction === 'up' ? 'Swipe up for next' : 'Swipe down for previous'}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 1000,
  },
  indicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: width * 0.4,
  },
  arrow: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 2,
  },
  text: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default SwipeIndicator;
