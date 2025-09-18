import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  showControls = false, // default: hide native controls on mobile; web will use browser controls
  autoPlay = false 
}: VideoPlayerComponentProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  // Controls visibility (native only): shown on deliberate tap, hidden on swipe/idle
  const [controlsVisible, setControlsVisible] = useState(false);
  // Only allow controls to appear after an explicit user interaction (tap/click)
  const [userInteracted, setUserInteracted] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const movedRef = useRef(false);
  const progressIntervalRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

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

  // For web fallback, keep a ref to the HTMLVideoElement so we can poll progress and control playback
  const videoRef = useRef<any | null>(null);

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

  // Clean up timers/intervals on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current as any);
        hideTimerRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current as any);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  // Ensure controls are hidden on mount by default (defensive)
  useEffect(() => {
    setControlsVisible(false);
  }, []);

  // Debug: log mount-time state to help diagnose controls visibility issues
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[VideoPlayerComponent] mount', { platform: Platform.OS, playerExists: !!player, showControlsProp: showControls });
    } catch (e) {
      // ignore
    }
  }, []);

  const hideControlsImmediately = useCallback(() => {
    setControlsVisible(false);
    setProgress(0);
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current as any); hideTimerRef.current = null; }
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current as any); progressIntervalRef.current = null; }
  }, []);

  // If player becomes unavailable, hide custom controls immediately
  useEffect(() => {
    if (!player) {
      hideControlsImmediately();
    }
  }, [player, hideControlsImmediately]);

  // Debug: log when controls visibility changes
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[VideoPlayerComponent] controlsVisible', controlsVisible);
    } catch (e) {
      // ignore
    }
  }, [controlsVisible]);

  // Debug: log when userInteracted changes
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[VideoPlayerComponent] userInteracted', userInteracted);
    } catch (e) {
      // ignore
    }
  }, [userInteracted]);

  // Debug: log overlay render condition each render (helps catch unexpected true values)
  useEffect(() => {
    try {
      const shouldRenderOverlay = (!showControls && controlsVisible && userInteracted && (Platform.OS === 'web' || !!player));
      // eslint-disable-next-line no-console
      console.log('[VideoPlayerComponent] overlayCondition', { showControls, controlsVisible, userInteracted, platform: Platform.OS, playerExists: !!player, shouldRenderOverlay });
    } catch (e) {
      // ignore
    }
  });

  // Show controls helper (starts auto-hide timer and progress polling)
  const showControlsFor = useCallback((ms = 2500) => {
    if (!userInteracted) return; // don't show controls until user explicitly interacted
    setControlsVisible(true);

    // start polling progress: handle native player and web video element separately
  if (Platform.OS === 'web') {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current as any);
      progressIntervalRef.current = setInterval(() => {
        try {
          const v = videoRef.current;
          if (v && typeof v.currentTime === 'number' && typeof v.duration === 'number' && v.duration > 0) {
            setProgress(Math.min(1, v.currentTime / v.duration));
          }
        } catch (err) {
          // ignore
        }
      }, 500) as unknown as number;
    } else {
      if (player && typeof player.getStatusAsync === 'function') {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current as any);
        progressIntervalRef.current = setInterval(async () => {
          try {
            const status = await player.getStatusAsync();
            if (status && typeof status.positionMillis === 'number' && typeof status.durationMillis === 'number' && status.durationMillis > 0) {
              setProgress(Math.min(1, status.positionMillis / status.durationMillis));
            }
          } catch (err) {
            // ignore
          }
        }, 500) as unknown as number;
      }
    }

    // clear previous hide timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current as any);
      hideTimerRef.current = null;
    }
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      setProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current as any);
        progressIntervalRef.current = null;
      }
      hideTimerRef.current = null;
    }, ms) as unknown as number;
  }, [player]);

  

  // For native (mobile) we capture touch responder to detect taps vs swipes.
  const responderProps = (Platform.OS !== 'web' && VideoView) ? {
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: any) => {
      const { pageX, pageY } = e.nativeEvent;
      touchStartRef.current = { x: pageX, y: pageY, t: Date.now() };
      movedRef.current = false;
    },
    onResponderMove: (e: any) => {
      if (!touchStartRef.current) return;
      const { pageX, pageY } = e.nativeEvent;
      const dx = Math.abs(pageX - touchStartRef.current.x);
      const dy = Math.abs(pageY - touchStartRef.current.y);
      const threshold = 8; // pixels
      if (dx > threshold || dy > threshold) {
        movedRef.current = true;
        // if user is swiping, ensure controls are hidden
        if (controlsVisible) hideControlsImmediately();
      }
    },
    onResponderRelease: (e: any) => {
      const ts = touchStartRef.current;
      touchStartRef.current = null;
      if (!ts) return;
      const { pageX, pageY } = e.nativeEvent;
      const dt = Date.now() - ts.t;
      const dx = Math.abs(pageX - ts.x);
      const dy = Math.abs(pageY - ts.y);
      const maxMove = 8;
      const maxTime = 500; // ms
      // Consider it a deliberate tap only if small movement and relatively short time
      if (!movedRef.current && dx <= maxMove && dy <= maxMove && dt <= maxTime) {
        // Mark user interaction and show controls on deliberate tap
        setUserInteracted(true);
        if (!controlsVisible) {
          showControlsFor();
        } else {
          showControlsFor();
        }
      }
      movedRef.current = false;
    }
  } : {};

  return (
    <View style={[styles.container, style]} {...responderProps}>
      {Platform.OS === 'web' ? (
        // Simple HTML5 video fallback for web. We disable native controls and implement our own overlay
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        <video
          ref={videoRef}
          src={videoUrl}
          style={{ width: '100%', height: '100%' }}
          controls={false}
          onClick={() => {
            // Mark that the user explicitly interacted on web and show controls
            setUserInteracted(true);
            showControlsFor();
          }}
        />
      ) : (VideoView ? (
        <VideoView
          style={styles.video}
          player={player}
          // Always disable native controls on mobile so we can show controls only on deliberate taps
          nativeControls={false}
          contentFit="cover"
          allowsFullscreen={true}
        />
      ) : (
        // Native platform but VideoView not available: render a safe placeholder (no controls)
        <View style={[styles.video, { backgroundColor: '#000' }]} />
      ))}
      {/* Controls removed: no overlay rendered */}
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
  // overlay controls removed; no styles for play button / progress
});
