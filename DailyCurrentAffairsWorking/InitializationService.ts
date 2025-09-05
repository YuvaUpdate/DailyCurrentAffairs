/**
 * InitializationService - Tracks and manages app startup services
 * Ensures Firebase and other critical services are ready before showing onboarding
 */

import { InteractionManager } from 'react-native';
import { auth } from './firebase.config';
import ImagePrefetchService from './ImagePrefetchService';

export class InitializationService {
  private static instance: InitializationService;
  private isFirebaseReady = false;
  private isImageServiceReady = false;
  private isInitialized = false;
  private readyCallbacks: Array<() => void> = [];

  static getInstance(): InitializationService {
    if (!InitializationService.instance) {
      InitializationService.instance = new InitializationService();
    }
    return InitializationService.instance;
  }

  private constructor() {
    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    console.log('🚀 InitializationService: Starting service initialization...');
    
    // Wait for React Native to be ready
    await new Promise<void>(resolve => {
      InteractionManager.runAfterInteractions(() => resolve());
    });
    
    // Initialize Firebase Auth
    try {
      // Wait for Firebase Auth to be ready
      await new Promise<void>((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(() => {
          this.isFirebaseReady = true;
          console.log('✅ InitializationService: Firebase Auth ready');
          unsubscribe();
          resolve();
        });
        
        // Fallback timeout - don't wait forever for Firebase
        setTimeout(() => {
          if (!this.isFirebaseReady) {
            this.isFirebaseReady = true;
            console.log('⏰ InitializationService: Firebase Auth timeout, proceeding anyway');
            unsubscribe();
            resolve();
          }
        }, 3000);
      });
    } catch (error) {
      console.log('⚠️ InitializationService: Firebase Auth initialization error:', error);
      this.isFirebaseReady = true; // Proceed anyway
    }

    // Initialize Image Prefetch Service
    try {
      const imagePrefetchService = ImagePrefetchService.getInstance();
      this.isImageServiceReady = true;
      console.log('✅ InitializationService: Image prefetch service ready');
    } catch (error) {
      console.log('⚠️ InitializationService: Image service initialization error:', error);
      this.isImageServiceReady = true; // Proceed anyway
    }

    // Add a minimum delay to ensure smooth UX
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mark as fully initialized
    this.isInitialized = true;
    console.log('🎉 InitializationService: All services initialized successfully');
    
    // Notify all waiting callbacks
    this.readyCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.log('⚠️ InitializationService: Error in ready callback:', error);
      }
    });
    this.readyCallbacks = [];
  }

  /**
   * Check if all services are ready
   */
  isReady(): boolean {
    return this.isInitialized && this.isFirebaseReady && this.isImageServiceReady;
  }

  /**
   * Wait for all services to be ready
   */
  async waitForReady(): Promise<void> {
    if (this.isReady()) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.readyCallbacks.push(resolve);
    });
  }

  /**
   * Get initialization status details
   */
  getStatus(): {
    isReady: boolean;
    firebase: boolean;
    imageService: boolean;
    initialized: boolean;
  } {
    return {
      isReady: this.isReady(),
      firebase: this.isFirebaseReady,
      imageService: this.isImageServiceReady,
      initialized: this.isInitialized,
    };
  }
}

export default InitializationService;
