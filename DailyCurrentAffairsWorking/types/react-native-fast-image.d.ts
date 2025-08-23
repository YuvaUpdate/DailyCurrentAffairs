declare module 'react-native-fast-image' {
  import { ImageProps } from 'react-native';
  import * as React from 'react';
  export default class FastImage extends React.Component<ImageProps> {
    static resizeMode: {
      contain: 'contain';
      cover: 'cover';
      stretch: 'stretch';
      center: 'center';
    };
  }
}
