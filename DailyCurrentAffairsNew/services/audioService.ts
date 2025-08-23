import * as Speech from 'expo-speech';
import { NewsArticle } from '../types';

export class AudioService {
  private static isPlaying = false;
  private static currentArticle: NewsArticle | null = null;

  static async playArticle(article: NewsArticle): Promise<void> {
    try {
      // Stop any current speech
      if (this.isPlaying) {
        await this.stopSpeaking();
      }

      const textToSpeak = `${article.title}. ${article.description}`;
      
      this.isPlaying = true;
      this.currentArticle = article;

      await Speech.speak(textToSpeak, {
        language: 'en',
        pitch: 1.0,
        rate: 0.8,
        onDone: () => {
          this.isPlaying = false;
          this.currentArticle = null;
        },
        onStopped: () => {
          this.isPlaying = false;
          this.currentArticle = null;
        },
        onError: (error) => {
          console.error('Speech error:', error);
          this.isPlaying = false;
          this.currentArticle = null;
        },
      });
    } catch (error) {
      console.error('Error playing article:', error);
      this.isPlaying = false;
      this.currentArticle = null;
    }
  }

  static async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
      this.isPlaying = false;
      this.currentArticle = null;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  static async pauseSpeaking(): Promise<void> {
    try {
      // Note: expo-speech doesn't have pause/resume, so we stop
      await this.stopSpeaking();
    } catch (error) {
      console.error('Error pausing speech:', error);
    }
  }

  static isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  static getCurrentArticle(): NewsArticle | null {
    return this.currentArticle;
  }

  static async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      return await Speech.getAvailableVoicesAsync();
    } catch (error) {
      console.error('Error getting available voices:', error);
      return [];
    }
  }

  static isSpeechAvailable(): boolean {
    return Speech.isSpeakingAsync !== undefined;
  }
}
