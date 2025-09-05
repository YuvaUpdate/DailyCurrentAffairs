import { Dimensions, PixelRatio } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export class ImageAlignmentHelper {
  // Get pixel ratio for the current device
  static getPixelRatio(): number {
    return PixelRatio.get();
  }

  // Calculate exact image width to prevent alignment issues
  static getAlignedImageWidth(): number {
    const pixelRatio = this.getPixelRatio();
    // Ensure width is divisible by pixel ratio for perfect alignment
    return Math.floor(screenWidth / pixelRatio) * pixelRatio;
  }

  // Get image alignment styles for perfect centering
  static getImageAlignmentStyles() {
    return {
      width: screenWidth,
      alignSelf: 'center' as const,
      transform: [{ translateX: 0 }],
      // Ensure no sub-pixel positioning
      left: 0,
      right: 0,
      marginLeft: 0,
      marginRight: 0,
    };
  }

  // Get container alignment styles
  static getContainerAlignmentStyles() {
    return {
      width: screenWidth,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
      // Force exact positioning
      position: 'relative' as const,
      left: 0,
      right: 0,
    };
  }

  // Debug info for troubleshooting alignment issues
  static getDebugInfo() {
    return {
      screenWidth,
      screenHeight,
      pixelRatio: this.getPixelRatio(),
      alignedWidth: this.getAlignedImageWidth(),
      density: PixelRatio.getFontScale(),
    };
  }
}

export default ImageAlignmentHelper;
