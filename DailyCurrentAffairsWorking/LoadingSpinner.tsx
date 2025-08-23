import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  show?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#2563EB', 
  text,
  show = true 
}) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (show) {
      // Fade in
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Continuous rotation
      const spin = () => {
        spinValue.setValue(0);
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => spin());
      };
      spin();
    } else {
      // Fade out
      Animated.timing(fadeValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [show, spinValue, fadeValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizeMap = {
    small: 20,
    medium: 40,
    large: 60,
  };

  const spinnerSize = sizeMap[size];

  if (!show) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeValue }]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            borderColor: `${color}20`,
            borderTopColor: color,
            transform: [{ rotate: spin }],
          },
        ]}
      />
      {text && (
        <Text style={[styles.loadingText, { color }]}>{text}</Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  spinner: {
    borderWidth: 3,
    borderRadius: 50,
    borderStyle: 'solid',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
