import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform } from 'react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: string;
  color?: string;
  backgroundColor?: string;
  size?: number;
  bottom?: number;
  right?: number;
  visible?: boolean;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = '↑',
  color = '#fff',
  backgroundColor = '#111111',
  size = 56,
  bottom = 100,
  right = 20,
  visible = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Scale in animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom,
          right,
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.icon, { color, fontSize: size * 0.4 }]}>
          {icon}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    elevation: 8,
  ...Platform.select({ web: { boxShadow: '0 6px 18px rgba(0,0,0,0.18)' } }),
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(0,0,0,0.14)' } }),
  },
  icon: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default FloatingActionButton;
