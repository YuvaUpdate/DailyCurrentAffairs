import { Platform, Alert } from 'react-native';
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
  // use any to avoid static expo-av type dependency on web bundling
  private sound: any | null = null;
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

  // Safely require a module at runtime without creating a static import
  // This uses Function('return require')() so bundlers can't statically analyze the dependency.
  private safeRequire(moduleName: string): any {
    try {
      // eslint-disable-next-line no-new-func
      const req = Function('return require')();
      return req(moduleName);
    } catch (e) {
      return null;
    }
  }

  constructor() {
    this.initializeAudio();
  }
  // Initialize audio system (runtime-safe)
  private async initializeAudio(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
    // dynamically require expo-av on native platforms (runtime only)
  const expoAvName = 'expo' + '-av';
  const expoAv = this.safeRequire(expoAvName);
        if (expoAv && expoAv.Audio && expoAv.Audio.setAudioModeAsync) {
          await expoAv.Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        }
        console.log('✅ Native audio system initialized');
      } else {
        // Web: no native audio mode to set; rely on browser APIs
        console.log('ℹ️ Web audio - no native audio initialization required');
      }
    } catch (error) {
      console.error('❌ Error initializing audio (runtime):', error);
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

      const textToSpeak = this.prepareTextForSpeech(article);

      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Use Web Speech API on web
        const utter = new (window as any).SpeechSynthesisUtterance(textToSpeak);
        utter.rate = this.speechOptions.rate ?? 1.0;
        utter.pitch = this.speechOptions.pitch ?? 1.0;
        utter.volume = this.speechOptions.volume ?? 1.0;

        utter.onstart = () => {
          this.updatePlaybackState({ isPlaying: true, isLoading: false, isPaused: false });
        };
        utter.onend = () => {
          this.updatePlaybackState({ isPlaying: false, isPaused: false, progress: 100 });
        };
        utter.onerror = (e: any) => {
          console.error('❌ Web speech error:', e);
          this.updatePlaybackState({ isPlaying: false, isLoading: false, isPaused: false });
        };

        (window as any).speechSynthesis.speak(utter);
        console.log('✅ Web article audio playback started');
      } else {
        // Native platforms: dynamically import expo-speech
  const speechPkg = 'expo' + '-speech';
  const Speech = this.safeRequire(speechPkg);
  if (!Speech) {
    console.warn('expo-speech module not available at runtime (native).');
    // Update state to reflect that playback could not start
    this.updatePlaybackState({ isPlaying: false, isLoading: false, isPaused: false });
    // Inform the caller with a thrown error so UI can handle it (App.tsx shows Alert)
    throw new Error('Speech functionality is not available in this build. Please add expo-speech and rebuild the app.');
  }

  const isSpeaking = Speech && Speech.isSpeakingAsync ? await Speech.isSpeakingAsync() : false;
  if (isSpeaking && Speech.stop) {
    await Speech.stop();
  }

  await Speech.speak(textToSpeak, {
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

        console.log('✅ Native article audio playback started');
      }
    } catch (error) {
      console.error('❌ Error playing article audio (runtime):', error);
      this.updatePlaybackState({ isPlaying: false, isLoading: false, isPaused: false });
      throw error;
    }
  }

  // Pause audio playback
  async pauseAudio(): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        (window as any).speechSynthesis.cancel();
        this.updatePlaybackState({ isPlaying: false, isPaused: true });
        console.log('✅ Web audio paused');
      } else {
      const speechPkg = 'expo' + '-speech';
  const Speech = this.safeRequire(speechPkg);
  if (Speech && Speech.stop) {
    try { await Speech.stop(); } catch (e) { console.warn('expo-speech stop() failed', e); }
  } else {
    console.warn('pauseAudio: expo-speech not available or stop() not present');
  }
        this.updatePlaybackState({ isPlaying: false, isPaused: true });
        console.log('✅ Native audio paused');
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
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        (window as any).speechSynthesis.cancel();
      } else {
        const speechPkg = 'expo' + '-speech';
        const Speech = this.safeRequire(speechPkg);
        if (Speech && Speech.stop) {
          try { await Speech.stop(); } catch (e) { console.warn('expo-speech stop() failed', e); }
        } else {
          console.warn('stopAudio: expo-speech not available or stop() not present');
        }
        // unload any audio.Sound if used (native)
        try {
          const expoAvName = 'expo' + '-av';
          const expoAv = this.safeRequire(expoAvName);
          if (this.sound && expoAv) {
            // if we used expo-av's Audio.Sound instances, unload them
            if (typeof this.sound.unloadAsync === 'function') {
              await this.sound.unloadAsync();
            }
            this.sound = null;
          }
        } catch (e) {
          // ignore; not critical
        }
      }

      this.updatePlaybackState({ isPlaying: false, isPaused: false, isLoading: false, progress: 0, currentArticle: null });
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
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        return (window as any).speechSynthesis.getVoices() || [];
      }
      const speechPkg = 'expo' + '-speech';
      const Speech = this.safeRequire(speechPkg);
      if (Speech && Speech.getAvailableVoicesAsync) {
        return await Speech.getAvailableVoicesAsync();
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
  return voices && voices.length > 0;
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
