import { Platform, Alert } from 'react-native';
import * as Speech from 'expo-speech';
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
  // Cached runtime speech provider (undefined = not checked yet, null = none)
  private speechProvider: any | undefined = undefined;

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

  // Determine and cache a runtime speech provider. Order: expo-speech, react-native-tts, RN NativeModules
  private getSpeechProvider(): any | null {
    if (this.speechProvider !== undefined) return this.speechProvider;

    // 1) expo-speech (preferred, directly imported)
    if (Speech) {
      this.speechProvider = { type: 'expo', impl: Speech };
      return this.speechProvider;
    }

    // 2) react-native-tts (common alternative). API: speak(text), stop(), voices(), getInitStatus()
    const rnTts = this.safeRequire('react-native-tts');
    if (rnTts) {
      this.speechProvider = { type: 'rntts', impl: rnTts };
      return this.speechProvider;
    }

    // 3) Try to find a TTS-like native module on RN.NativeModules under common names
    try {
      const RN = this.safeRequire('react-native');
      const nm = RN && RN.NativeModules && (
        RN.NativeModules.RNTextToSpeech || RN.NativeModules.TextToSpeech || RN.NativeModules.Tts || RN.NativeModules.SpeechModule
      );
      if (nm) {
        this.speechProvider = { type: 'nativeModule', impl: nm };
        return this.speechProvider;
      }
    } catch (e) {
      // ignore
    }

    // 4) Check for an online TTS provider key in app config (VoiceRSS) via expo-constants
    try {
      const Constants = this.safeRequire('expo-constants');
      const extra = Constants && (Constants.manifest && Constants.manifest.extra) || (Constants && Constants.expoConfig && Constants.expoConfig.extra);
      // Prefer Google Cloud TTS if configured
      const gKey = extra && extra.googleTtsKey;
      if (gKey) {
        this.speechProvider = { type: 'googleTts', impl: { key: gKey } };
        return this.speechProvider;
      }

      const vrKey = extra && extra.voiceRssKey;
      if (vrKey) {
        this.speechProvider = { type: 'voiceRss', impl: { key: vrKey } };
        return this.speechProvider;
      }
    } catch (e) {
      // ignore
    }

    // no provider found
    this.speechProvider = null;
    return null;
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
        // Native platforms: pick a runtime speech provider
  const provider = this.getSpeechProvider();
  if (!provider) {
    console.warn('No speech provider available at runtime (native).');
    this.updatePlaybackState({ isPlaying: false, isLoading: false, isPaused: false });
    throw new Error('Speech functionality is not available in this build. Please install a native TTS provider (expo-speech or react-native-tts) and rebuild the app.');
  }

  // Provider-specific handling
  try {
  if (provider.type === 'expo') {
      const Speech = provider.impl;
      const isSpeaking = Speech && Speech.isSpeakingAsync ? await Speech.isSpeakingAsync() : false;
      if (isSpeaking && Speech.stop) {
        await Speech.stop();
      }
      await Speech.speak(textToSpeak, {
        ...this.speechOptions,
        onStart: () => { this.updatePlaybackState({ isPlaying: true, isLoading: false, isPaused: false }); },
        onDone: () => { this.updatePlaybackState({ isPlaying: false, isPaused: false, progress: 100 }); },
        onStopped: () => { this.updatePlaybackState({ isPlaying: false, isPaused: false }); },
        onError: (error: any) => { console.error('❌ Speech error:', error); this.updatePlaybackState({ isPlaying: false, isLoading: false, isPaused: false }); }
      });
      console.log('✅ Native article audio playback started (expo-speech)');
    } else if (provider.type === 'rntts') {
      // react-native-tts: simpler API
      const Tts = provider.impl;
      try {
        if (Tts.stop) await Tts.stop();
      } catch (e) {
        // ignore
      }
      // Map rate/pitch/volume where available
      if (Tts.setDefaultRate && typeof this.speechOptions.rate === 'number') {
        try { Tts.setDefaultRate(this.speechOptions.rate); } catch (e) {}
      }
      if (Tts.setDefaultPitch && typeof this.speechOptions.pitch === 'number') {
        try { Tts.setDefaultPitch(this.speechOptions.pitch); } catch (e) {}
      }
      // speak(text) returns void; rely on events if the module provides them
      Tts.speak && Tts.speak(textToSpeak);
      // best-effort update
      this.updatePlaybackState({ isPlaying: true, isLoading: false, isPaused: false });
      console.log('✅ Native article audio playback started (react-native-tts)');
    } else if (provider.type === 'nativeModule') {
      const nm = provider.impl;
      // Try common method names
      if (nm.stop) {
        try { await nm.stop(); } catch (e) {}
      }
      if (nm.speak) {
        // some native modules expose speak(text)
        nm.speak(textToSpeak);
        this.updatePlaybackState({ isPlaying: true, isLoading: false, isPaused: false });
        console.log('✅ Native article audio playback started (nativeModule.speak)');
      } else if (nm.start) {
        nm.start(textToSpeak);
        this.updatePlaybackState({ isPlaying: true, isLoading: false, isPaused: false });
        console.log('✅ Native article audio playback started (nativeModule.start)');
      } else {
        throw new Error('Native TTS module found but has no speak/stop API.');
      }
    } else {
      throw new Error('Unknown speech provider type');
    }
  } catch (e) {
    // rethrow so outer catch handles UI
    throw e;
  }
  // VoiceRSS provider handling (outside above block to keep fetch logic separate)
  if (provider.type === 'voiceRss') {
    const key = provider.impl.key;
    // build request (VoiceRSS expects url-encoded text)
    const urlText = encodeURIComponent(textToSpeak);
    const lang = encodeURIComponent(this.speechOptions.language || 'en-us');
    const codec = 'MP3';
    const url = `https://api.voicerss.org/?key=${key}&hl=${lang}&c=${codec}&f=16khz_16bit_mono&src=${urlText}`;

    try {
      // fetch the MP3 and play it via expo-av Audio.Sound if available
      const expoAvName = 'expo' + '-av';
      const expoAv = this.safeRequire(expoAvName);
      if (!expoAv || !expoAv.Audio || !expoAv.Audio.Sound) throw new Error('expo-av required to play remote TTS audio');

      const response = await fetch(url);
      if (!response.ok) throw new Error('VoiceRSS fetch failed: ' + response.status);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      // create a temporary URI for expo-av using data URI
      const dataUri = `data:audio/mpeg;base64,${base64}`;

      // unload previous sound
      if (this.sound && this.sound.unloadAsync) {
        try { await this.sound.unloadAsync(); } catch (e) {}
        this.sound = null;
      }

      const { Sound } = expoAv.Audio;
      const soundObj = new Sound();
      // expo-av's recommended way is Sound.createAsync with a URI, but dynamic import may differ
      const result = await expoAv.Audio.Sound.createAsync({ uri: dataUri }, { shouldPlay: true });
      this.sound = result.sound || null;
      this.updatePlaybackState({ isPlaying: true, isLoading: false, isPaused: false });
      console.log('✅ Online VoiceRSS playback started');
      return;
    } catch (e) {
      console.error('❌ VoiceRSS TTS failed:', e);
      throw e;
    }
  }
  // Google Cloud TTS handling
  if (provider.type === 'googleTts') {
    const key = provider.impl.key;
    try {
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`;
      const body = {
        input: { text: textToSpeak },
        voice: { languageCode: this.speechOptions.language || 'en-US', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: this.speechOptions.rate || 1.0 }
      };

      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!resp.ok) throw new Error('Google TTS failed: ' + resp.status);
      const j = await resp.json();
      if (!j || !j.audioContent) throw new Error('Google TTS returned no audio');
      const base64 = j.audioContent;

      const expoAvName = 'expo' + '-av';
      const expoAv = this.safeRequire(expoAvName);
      if (!expoAv || !expoAv.Audio) throw new Error('expo-av required to play remote TTS audio');

      const dataUri = `data:audio/mpeg;base64,${base64}`;
      if (this.sound && this.sound.unloadAsync) {
        try { await this.sound.unloadAsync(); } catch (e) {}
        this.sound = null;
      }

      const result = await expoAv.Audio.Sound.createAsync({ uri: dataUri }, { shouldPlay: true });
      this.sound = result.sound || null;
      this.updatePlaybackState({ isPlaying: true, isLoading: false, isPaused: false });
      console.log('✅ Google Cloud TTS playback started');
      return;
    } catch (e) {
      console.error('❌ Google TTS failed:', e);
      throw e;
    }
  }
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
      const provider = this.getSpeechProvider();
      if (provider) {
        try {
          if (provider.type === 'expo' && provider.impl.stop) await provider.impl.stop();
          else if (provider.type === 'rntts' && provider.impl.stop) await provider.impl.stop();
          else if (provider.type === 'nativeModule' && provider.impl.stop) await provider.impl.stop();
        } catch (e) {
          console.warn('speech stop() failed', e);
        }
      } else {
        console.warn('pauseAudio: no speech provider available');
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
        const provider = this.getSpeechProvider();
        if (provider) {
          try {
            if (provider.type === 'expo' && provider.impl.stop) await provider.impl.stop();
            else if (provider.type === 'rntts' && provider.impl.stop) await provider.impl.stop();
            else if (provider.type === 'nativeModule' && provider.impl.stop) await provider.impl.stop();
          } catch (e) {
            console.warn('speech stop() failed', e);
          }
        } else {
          console.warn('stopAudio: no speech provider available');
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
      const provider = this.getSpeechProvider();
      if (!provider) return [];
      if (provider.type === 'expo' && provider.impl.getAvailableVoicesAsync) {
        return await provider.impl.getAvailableVoicesAsync();
      }
      if (provider.type === 'rntts' && provider.impl.voices) {
        try { return await provider.impl.voices(); } catch (e) { return []; }
      }
      // native module: try common method names
      if (provider.type === 'nativeModule') {
        const nm = provider.impl;
        if (nm.getVoices) {
          try { return await nm.getVoices(); } catch (e) { return []; }
        }
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
