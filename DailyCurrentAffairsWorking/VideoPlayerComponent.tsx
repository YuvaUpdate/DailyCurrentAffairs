import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

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
  
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true; // Enable looping for auto-play videos
    if (autoPlay) {
      player.play();
      setIsPlaying(true);
    }
  });

  // Auto-play when component mounts if autoPlay is true
  React.useEffect(() => {
    if (autoPlay && player) {
      player.play();
      setIsPlaying(true);
    }
  }, [autoPlay, player]);

  return (
    <View style={[styles.container, style]}>
      <VideoView
        style={styles.video}
        player={player}
        nativeControls={showControls}
        contentFit="cover"
        allowsFullscreen={true}
      />
      {!showControls && (
        <TouchableOpacity
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
        </TouchableOpacity>
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
