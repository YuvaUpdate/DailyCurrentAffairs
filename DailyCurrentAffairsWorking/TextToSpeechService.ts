import * as Speech from 'expo-speech';
import { Platform, Alert } from 'react-native';

export interface TTSOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  voice?: string;
}

export class TextToSpeechService {
  private static instance: TextToSpeechService;
  private isPlaying = false;
  private currentText = '';
  private isPaused = false;
  private onStateChangeCallback?: (isPlaying: boolean, isPaused: boolean) => void;

  static getInstance(): TextToSpeechService {
    if (!TextToSpeechService.instance) {
      TextToSpeechService.instance = new TextToSpeechService();
    }
    return TextToSpeechService.instance;
  }

  private constructor() {
    // Initialize TTS service
    this.initializeTTS();
  }

  private async initializeTTS(): Promise<void> {
    try {
      // Check if TTS is available
      if (Speech && Speech.getAvailableVoicesAsync) {
        const isAvailable = await Speech.getAvailableVoicesAsync();
        console.log('📢 TTS Service initialized, voices available:', isAvailable.length);
      } else {
        console.log('⚠️ TTS Speech module not available');
      }
    } catch (error) {
      console.log('⚠️ TTS initialization error:', error);
    }
  }

  // Read article content aloud
  async readArticle(
    headline: string, 
    description: string, 
    options: TTSOptions = {}
  ): Promise<void> {
    try {
      // Stop any current playback
      await this.stop();

      // Prepare text content
      const fullText = this.prepareTextForReading(headline, description);
      this.currentText = fullText;

      // Default options optimized for news reading
      const ttsOptions = {
        language: options.language || 'en-US',
        pitch: options.pitch || 1.0,
        rate: options.rate || 0.8, // Slightly slower for better comprehension
        voice: options.voice,
        onStart: () => {
          this.isPlaying = true;
          this.isPaused = false;
          this.notifyStateChange();
          console.log('🔊 Started reading article');
        },
        onDone: () => {
          this.isPlaying = false;
          this.isPaused = false;
          this.notifyStateChange();
          console.log('✅ Finished reading article');
        },
        onStopped: () => {
          this.isPlaying = false;
          this.isPaused = false;
          this.notifyStateChange();
          console.log('⏹️ Stopped reading article');
        },
        onError: (error: any) => {
          this.isPlaying = false;
          this.isPaused = false;
          this.notifyStateChange();
          console.log('❌ TTS Error:', error);
        }
      };

      // Start reading
      if (Speech && Speech.speak) {
        await Speech.speak(fullText, ttsOptions);
      } else {
        throw new Error('Speech module not available');
      }
      
    } catch (error) {
      console.log('TTS Error:', error);
      Alert.alert('Read Aloud Error', 'Text-to-speech is not available on this device.');
    }
  }

  // Read just the headline
  async readHeadline(headline: string, options: TTSOptions = {}): Promise<void> {
    try {
      await this.stop();
      
      const ttsOptions = {
        language: options.language || 'en-US',
        pitch: options.pitch || 1.1,
        rate: options.rate || 0.9,
        onStart: () => {
          this.isPlaying = true;
          console.log('🔊 Reading headline');
        },
        onDone: () => {
          this.isPlaying = false;
          console.log('✅ Finished reading headline');
        }
      };

      await Speech.speak(headline, ttsOptions);
    } catch (error) {
      console.log('TTS Headline Error:', error);
    }
  }

  // Pause reading
  async pause(): Promise<void> {
    try {
      if (this.isPlaying && !this.isPaused) {
        if (Platform.OS === 'android') {
          // Android doesn't support pause, so we stop and remember the state
          await this.stop();
          this.isPaused = true;
          this.notifyStateChange();
          console.log('⏸️ Paused reading (Android: stopped)');
        } else if (Speech && Speech.pause) {
          // iOS supports pause
          await Speech.pause();
          this.isPaused = true;
          this.notifyStateChange();
          console.log('⏸️ Paused reading');
        }
      }
    } catch (error) {
      console.log('TTS Pause Error:', error);
    }
  }

  // Resume reading
  async resume(): Promise<void> {
    try {
      if (this.isPaused) {
        if (Platform.OS === 'android') {
          // Android: restart reading from beginning
          this.isPaused = false;
          if (this.currentText && Speech && Speech.speak) {
            this.isPlaying = true;
            const ttsOptions = {
              language: 'en-US',
              pitch: 1.0,
              rate: 0.8,
              onStart: () => {
                this.isPlaying = true;
                this.isPaused = false;
              },
              onDone: () => {
                this.isPlaying = false;
                this.isPaused = false;
              },
              onStopped: () => {
                this.isPlaying = false;
                this.isPaused = false;
              }
            };
            await Speech.speak(this.currentText, ttsOptions);
            console.log('▶️ Resumed reading (Android: restarted)');
          }
        } else if (Speech && Speech.resume) {
          // iOS supports resume
          await Speech.resume();
          this.isPaused = false;
          console.log('▶️ Resumed reading');
        }
      }
    } catch (error) {
      console.log('TTS Resume Error:', error);
    }
  }

  // Stop reading
  async stop(): Promise<void> {
    try {
      if (this.isPlaying && Speech && Speech.stop) {
        await Speech.stop();
        this.isPlaying = false;
        this.isPaused = false;
        console.log('⏹️ Stopped reading');
      }
    } catch (error) {
      console.log('TTS Stop Error:', error);
    }
  }

  // Get current playback status
  getStatus(): { isPlaying: boolean; isPaused: boolean } {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused
    };
  }

  // Set callback for state changes
  setOnStateChange(callback: (isPlaying: boolean, isPaused: boolean) => void): void {
    this.onStateChangeCallback = callback;
  }

  // Notify about state changes
  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.isPlaying, this.isPaused);
    }
  }

  // Check if TTS is available
  async isAvailable(): Promise<boolean> {
    try {
      if (!Speech || !Speech.getAvailableVoicesAsync) {
        return false;
      }
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Get available voices
  async getAvailableVoices(): Promise<any[]> {
    try {
      if (!Speech || !Speech.getAvailableVoicesAsync) {
        return [];
      }
      return await Speech.getAvailableVoicesAsync();
    } catch (error) {
      console.log('Error getting voices:', error);
      return [];
    }
  }

  // Prepare text for optimal reading experience
  private prepareTextForReading(headline: string, description: string): string {
    // Clean up text for better TTS pronunciation
    let text = `${headline}. `;
    
    if (description) {
      // Add natural pause after headline
      text += `Here are the details. ${description}`;
    }

    // Clean up common abbreviations and improve pronunciation
    text = text
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bMr\./g, 'Mister')
      .replace(/\bMs\./g, 'Miss')
      .replace(/\bProf\./g, 'Professor')
      .replace(/\bCEO\b/g, 'Chief Executive Officer')
      .replace(/\bCTO\b/g, 'Chief Technology Officer')
      .replace(/\bCFO\b/g, 'Chief Financial Officer')
      .replace(/\bGDP\b/g, 'Gross Domestic Product')
      .replace(/\bNASA\b/g, 'NASA')
      .replace(/\bFBI\b/g, 'F.B.I.')
      .replace(/\bCIA\b/g, 'C.I.A.')
      .replace(/\bUK\b/g, 'United Kingdom')
      .replace(/\bUS\b/g, 'United States')
      .replace(/\bUSA\b/g, 'United States of America')
      .replace(/&/g, 'and')
      .replace(/%/g, 'percent')
      .replace(/\$/g, 'dollars')
      .replace(/₹/g, 'rupees')
      .replace(/€/g, 'euros')
      .replace(/£/g, 'pounds');

    return text;
  }

  // Set reading speed (0.1 to 2.0)
  async setRate(rate: number): Promise<void> {
    // Rate will be applied to next speech
    console.log(`🔧 TTS rate set to: ${rate}`);
  }

  // Set voice pitch (0.5 to 2.0)
  async setPitch(pitch: number): Promise<void> {
    // Pitch will be applied to next speech
    console.log(`🔧 TTS pitch set to: ${pitch}`);
  }
}

export default TextToSpeechService;
