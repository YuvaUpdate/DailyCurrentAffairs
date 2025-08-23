import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { NewsArticle } from './types';

export interface AudioSettings {
  speed: number;
  pitch: number;
  volume: number;
  voice?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  progress: number;
  duration: number;
  currentArticle: NewsArticle | null;
}

class AudioService {
  private sound: Audio.Sound | null = null;
  // Minimal runtime-safe Speech module surface. We load expo-speech only when available.
  private Speech: any | null = null;
  private speechOptions: any = {
    language: 'en-US',
    pitch: 1.0,
    rate: 0.8,
    volume: 1.0
  };
  
  private playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    progress: 0,
    duration: 0,
    currentArticle: null
  };

  private listeners: ((state: PlaybackState) => void)[] = [];

  constructor() {
    this.initializeAudio();
  }

  // Initialize audio system
  private async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('✅ Audio system initialized');
    } catch (error) {
      console.error('❌ Error initializing audio:', error);
    }
  }

  // Play article as audio (Text-to-Speech)
  async playArticleAudio(article: NewsArticle, settings?: Partial<AudioSettings>): Promise<void> {
    try {
      // Stop current playback if any
      await this.stopAudio();

      this.updatePlaybackState({
        isLoading: true,
        currentArticle: article
      });

      // Update speech options with user settings
      if (settings) {
        this.speechOptions = {
          ...this.speechOptions,
          rate: settings.speed ?? this.speechOptions.rate,
          pitch: settings.pitch ?? this.speechOptions.pitch,
          volume: settings.volume ?? this.speechOptions.volume,
          voice: settings.voice ?? this.speechOptions.voice
        };
      }

      // Prepare text for speech
      const textToSpeak = this.prepareTextForSpeech(article);

      // Try to load expo-speech dynamically. If it's not available, gracefully degrade.
      if (!this.Speech) {
        try {
          // dynamic require prevents bundler from failing when package isn't installed
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          this.Speech = require('expo-speech');
        } catch (e) {
          this.Speech = null;
        }
      }

      if (this.Speech && typeof this.Speech.speak === 'function') {
        try {
          const isAvailable = typeof this.Speech.isSpeakingAsync === 'function'
            ? await this.Speech.isSpeakingAsync()
            : false;
          if (isAvailable && typeof this.Speech.stop === 'function') {
            await this.Speech.stop();
          }

          await this.Speech.speak(textToSpeak, {
            ...this.speechOptions,
            onStart: () => {
              this.updatePlaybackState({ isPlaying: true, isLoading: false, isPaused: false });
            },
            onDone: () => {
              this.updatePlaybackState({ isPlaying: false, isPaused: false, progress: 100 });
            },
            onStopped: () => {
              this.updatePlaybackState({ isPlaying: false, isPaused: false });
            },
            onError: (error: any) => {
              console.error('❌ Speech error:', error);
              this.updatePlaybackState({ isPlaying: false, isLoading: false, isPaused: false });
            }
          });
        } catch (err) {
          console.error('❌ Error using Speech module:', err);
          this.Speech = null;
          // Fallthrough to no-op below
        }
      } else {
        // No native speech available. As a safe fallback, update state as if playback finished.
        console.warn('⚠️ expo-speech not available. Skipping TTS.');
        this.updatePlaybackState({ isPlaying: false, isLoading: false, isPaused: false, progress: 100 });
      }

      console.log('✅ Article audio playback started');
    } catch (error) {
      console.error('❌ Error playing article audio:', error);
      this.updatePlaybackState({
        isPlaying: false,
        isLoading: false,
        isPaused: false
      });
      throw error;
    }
  }

  // Pause audio playback
  async pauseAudio(): Promise<void> {
    try {
      if (this.playbackState.isPlaying) {
        if (!this.Speech) {
          try { this.Speech = require('expo-speech'); } catch { this.Speech = null; }
        }
        if (this.Speech && typeof this.Speech.stop === 'function') {
          await this.Speech.stop();
        }
        this.updatePlaybackState({ isPlaying: false, isPaused: true });
        console.log('✅ Audio paused');
      }
    } catch (error) {
      console.error('❌ Error pausing audio:', error);
    }
  }

  // Resume audio playback
  async resumeAudio(): Promise<void> {
    try {
      if (this.playbackState.isPaused && this.playbackState.currentArticle) {
        await this.playArticleAudio(this.playbackState.currentArticle);
        console.log('✅ Audio resumed');
      }
    } catch (error) {
      console.error('❌ Error resuming audio:', error);
    }
  }

  // Stop audio playback
  async stopAudio(): Promise<void> {
    try {
      if (!this.Speech) {
        try { this.Speech = require('expo-speech'); } catch { this.Speech = null; }
      }
      if (this.Speech && typeof this.Speech.isSpeakingAsync === 'function') {
        const isPlaying = await this.Speech.isSpeakingAsync();
        if (isPlaying && typeof this.Speech.stop === 'function') {
          await this.Speech.stop();
        }
      }

      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      this.updatePlaybackState({
        isPlaying: false,
        isPaused: false,
        isLoading: false,
        progress: 0,
        currentArticle: null
      });

      console.log('✅ Audio stopped');
    } catch (error) {
      console.error('❌ Error stopping audio:', error);
    }
  }

  // Update audio settings
  updateAudioSettings(settings: Partial<AudioSettings>): void {
    this.speechOptions = {
      ...this.speechOptions,
      rate: settings.speed ?? this.speechOptions.rate,
      pitch: settings.pitch ?? this.speechOptions.pitch,
      volume: settings.volume ?? this.speechOptions.volume,
      voice: settings.voice ?? this.speechOptions.voice
    };
    
    console.log('✅ Audio settings updated:', settings);
  }

  // Get available voices
  async getAvailableVoices(): Promise<any[]> {
    try {
      if (!this.Speech) {
        try { this.Speech = require('expo-speech'); } catch { this.Speech = null; }
      }
      if (this.Speech && typeof this.Speech.getAvailableVoicesAsync === 'function') {
        const voices = await this.Speech.getAvailableVoicesAsync();
        return voices;
      }
      return [];
    } catch (error) {
      console.error('❌ Error getting available voices:', error);
      return [];
    }
  }

  // Check if speech is supported
  async isSpeechSupported(): Promise<boolean> {
    try {
      // Try to get available voices as a test
  const voices = await this.getAvailableVoices();
  return voices.length > 0;
    } catch (error) {
      console.error('❌ Speech not supported:', error);
      return false;
    }
  }

  // Prepare text for speech (clean up and format)
  private prepareTextForSpeech(article: NewsArticle): string {
    let text = `${article.headline}. `;
    text += article.description;
    
    // Clean up text for better speech
    text = text
      .replace(/\n/g, '. ') // Replace newlines with periods
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s.,!?;:-]/g, '') // Remove special characters except punctuation
      .trim();

    return text;
  }

  // Update playback state and notify listeners
  private updatePlaybackState(updates: Partial<PlaybackState>): void {
    this.playbackState = {
      ...this.playbackState,
      ...updates
    };

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.playbackState);
      } catch (error) {
        console.error('❌ Error in playback state listener:', error);
      }
    });
  }

  // Subscribe to playback state changes
  onPlaybackStateChange(listener: (state: PlaybackState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get current playback state
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  // Cleanup resources
  async cleanup(): Promise<void> {
    try {
      await this.stopAudio();
      this.listeners = [];
      console.log('✅ Audio service cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up audio service:', error);
    }
  }
}

export const audioService = new AudioService();
