import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Base guideline width is iPhone 8 / 375
const BASE_WIDTH = 375;

export function scaleFont(size: number) {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  // Round to nearest pixel for crisp text
  const rounded = Math.round(PixelRatio.roundToNearestPixel(newSize));
  // Android fonts render slightly larger; keep a small platform tweak
  return Platform.OS === 'android' ? Math.max(12, rounded - 0) : Math.max(12, rounded);
}

export function responsiveLines(height: number | undefined, large = 10, small = 7) {
  if (!height) return small;
  return height >= 900 ? large : small;
}

export const screen = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
