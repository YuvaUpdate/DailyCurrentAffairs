import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

/**
 * FastTouchable ensures the visual press feedback is applied immediately
 * and defers running the onPress handler to the next animation frame.
 * This avoids long-running JS work blocking the press highlight.
 */
export default function FastTouchable(props: TouchableOpacityProps) {
  const { onPress, ...rest } = props;

  const wrappedPress = React.useCallback((event?: any) => {
    // let the UI update for the press highlight
    try {
      requestAnimationFrame(() => {
        // additionally yield a macrotask to let React Native settle
        setTimeout(() => {
          try {
            // call original without awaiting so UI isn't blocked
            if (typeof onPress === 'function') onPress(event as any);
          } catch (e) {
            // swallow - handler should handle its own errors
            console.warn('FastTouchable handler error', e);
          }
        }, 0);
      });
    } catch (e) {
      // fallback to direct call with event
      if (typeof onPress === 'function') onPress(event as any);
    }
  }, [onPress]);

  return <TouchableOpacity {...rest} onPress={wrappedPress} />;
}
