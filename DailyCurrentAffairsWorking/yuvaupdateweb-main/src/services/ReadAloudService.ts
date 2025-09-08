/**
 * Read Aloud Service for Web Articles
 * Provides text-to-speech functionality for article content
 */
export class ReadAloudService {
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static isReading: boolean = false;
  private static isPaused: boolean = false;

  /**
   * Check if text-to-speech is supported in the browser
   */
  static isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Get available voices
   */
  static getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    return speechSynthesis.getVoices();
  }

  /**
   * Read article content aloud
   */
  static async readArticle(article: {
    title: string;
    summary: string;
    category?: string;
  }): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Text-to-speech is not supported in this browser');
    }

    // Stop any current reading
    this.stop();

    // Prepare text to read
    const textToRead = this.prepareTextForReading(article);

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // Configure voice settings
    this.configureVoice(utterance);

    // Set up event listeners
    this.setupEventListeners(utterance);

    // Start reading
    this.currentUtterance = utterance;
    this.isReading = true;
    this.isPaused = false;

    speechSynthesis.speak(utterance);

    console.log('🔊 Started reading article:', article.title);
  }

  /**
   * Prepare text for optimal reading experience
   */
  private static prepareTextForReading(article: {
    title: string;
    summary: string;
    category?: string;
  }): string {
    let text = '';

    // Add category if available
    if (article.category) {
      text += `${article.category} news. `;
    }

    // Add title
    text += `${article.title}. `;

    // Add summary with some cleaning
    let summary = article.summary
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure proper spacing after sentences
      .trim();

    text += summary;

    // Ensure text ends with proper punctuation
    if (!/[.!?]$/.test(text)) {
      text += '.';
    }

    return text;
  }

  /**
   * Configure voice settings for optimal reading
   */
  private static configureVoice(utterance: SpeechSynthesisUtterance): void {
    // Set reading parameters
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 0.8; // Slightly lower volume

    // Try to use a preferred voice (English)
    const voices = this.getVoices();
    const englishVoice = voices.find(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.default)
    );

    if (englishVoice) {
      utterance.voice = englishVoice;
    }
  }

  /**
   * Set up event listeners for speech synthesis
   */
  private static setupEventListeners(utterance: SpeechSynthesisUtterance): void {
    utterance.onstart = () => {
      console.log('🔊 Reading started');
      this.isReading = true;
      this.isPaused = false;
    };

    utterance.onend = () => {
      console.log('🔊 Reading completed');
      this.isReading = false;
      this.isPaused = false;
      this.currentUtterance = null;
    };

    utterance.onerror = (event) => {
      console.error('🔊 Reading error:', event.error);
      this.isReading = false;
      this.isPaused = false;
      this.currentUtterance = null;
    };

    utterance.onpause = () => {
      console.log('🔊 Reading paused');
      this.isPaused = true;
    };

    utterance.onresume = () => {
      console.log('🔊 Reading resumed');
      this.isPaused = false;
    };
  }

  /**
   * Pause reading
   */
  static pause(): void {
    if (this.isReading && !this.isPaused) {
      speechSynthesis.pause();
    }
  }

  /**
   * Resume reading
   */
  static resume(): void {
    if (this.isReading && this.isPaused) {
      speechSynthesis.resume();
    }
  }

  /**
   * Stop reading
   */
  static stop(): void {
    if (this.isReading) {
      speechSynthesis.cancel();
      this.isReading = false;
      this.isPaused = false;
      this.currentUtterance = null;
    }
  }

  /**
   * Toggle between play/pause
   */
  static toggle(): void {
    if (!this.isReading) return;

    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Get current reading status
   */
  static getStatus(): {
    isReading: boolean;
    isPaused: boolean;
    isSupported: boolean;
  } {
    return {
      isReading: this.isReading,
      isPaused: this.isPaused,
      isSupported: this.isSupported(),
    };
  }

  /**
   * Set reading speed (0.1 to 10)
   */
  static setSpeed(rate: number): void {
    if (this.currentUtterance) {
      // Note: Changing rate during speech requires stopping and restarting
      // This is a browser limitation
      this.currentUtterance.rate = Math.max(0.1, Math.min(10, rate));
    }
  }

  /**
   * Set reading volume (0 to 1)
   */
  static setVolume(volume: number): void {
    if (this.currentUtterance) {
      this.currentUtterance.volume = Math.max(0, Math.min(1, volume));
    }
  }
}
