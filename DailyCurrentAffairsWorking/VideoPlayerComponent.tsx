import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import FastTouchable from './FastTouchable';

// Safe dynamic import for expo-video; web builds may not provide required globals
let VideoView: any = null;
let useVideoPlayer: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ev = require('expo-video');
    VideoView = ev.VideoView;
    useVideoPlayer = ev.useVideoPlayer;
  } catch (e) {
    // module not available - leave null
    VideoView = null;
    useVideoPlayer = null;
  }
}

interface VideoPlayerComponentProps {
  videoUrl: string;
  style?: any;
  showControls?: boolean;
  autoPlay?: boolean;
}

export default function VideoPlayerComponent({ 
  videoUrl, 
  style, 
  showControls = true, 
  autoPlay = false 
}: VideoPlayerComponentProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const player = (useVideoPlayer && Platform.OS !== 'web') ? useVideoPlayer(videoUrl, (player: any) => {
    // keep videos non-looping by default
    player.loop = false;
    // only start playback here if the parent explicitly requested autoplay
    if (autoPlay) {
      try {
        player.play();
        setIsPlaying(true);
      } catch (e) {
        // ignore - some platforms may not allow autoplay until user gesture
      }
    }
  }) : null;

  // Respect changes to the autoPlay prop at runtime and ensure cleanup
  useEffect(() => {
    if (!player) return;

    if (autoPlay) {
      // try to play when autoPlay turns on
      try {
        player.play();
        setIsPlaying(true);
      } catch (e) {
        // ignore
      }
    } else {
      // pause if autoplay is disabled
      try {
        player.pause();
        setIsPlaying(false);
      } catch (e) {
        // ignore
      }
    }

    // pause on unmount to avoid background audio leaking across components
    return () => {
      try {
        player.pause();
      } catch (e) {
        // ignore
      }
    };
  }, [autoPlay, player]);

  return (
    <View style={[styles.container, style]}>
      {Platform.OS === 'web' || !VideoView ? (
        // Simple HTML5 video fallback for web
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        <video src={videoUrl} style={{ width: '100%', height: '100%' }} controls={showControls} />
      ) : (
        <VideoView
          style={styles.video}
          player={player}
          nativeControls={showControls}
          contentFit="cover"
          allowsFullscreen={true}
        />
      )}
      {!showControls && (
        <FastTouchable
          style={styles.playButton}
          onPress={() => {
            if (isPlaying) {
              player.pause();
            } else {
              player.play();
            }
            setIsPlaying(!isPlaying);
          }}
        >
          <Text style={styles.playButtonText}>
            {isPlaying ? '||' : '▶'}
          </Text>
        </FastTouchable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    zIndex: 2,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 3,
  },
});
