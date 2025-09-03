import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.config';

/**
 * ExpoPushService
 * Handles requesting permissions, obtaining Expo push token, persisting it locally
 * and storing it in Firestore for server / function usage.
 */
class ExpoPushService {
  private token: string | null = null;
  private registering = false;
  private listenersSet = false;

  async init(): Promise<string | null> {
    console.log('🔔 ExpoPushService.init() called');
    if (this.token) {
      console.log('🔔 ExpoPushService: already have token:', this.token.substring(0, 20) + '...');
      return this.token;
    }
    if (this.registering) {
      console.log('🔔 ExpoPushService: already registering, skipping');
      return null;
    }
    this.registering = true;
    try {
      const stored = await AsyncStorage.getItem('expo_push_token');
      if (stored) {
        console.log('🔔 ExpoPushService: found stored token:', stored.substring(0, 20) + '...');
        this.token = stored;
      }

      const permission = await Notifications.getPermissionsAsync();
      let finalStatus = permission.status;
      console.log('🔔 ExpoPushService: current permission status:', finalStatus);
      if (finalStatus !== 'granted') {
        console.log('🔔 ExpoPushService: requesting permissions...');
        const req = await Notifications.requestPermissionsAsync();
        finalStatus = req.status;
        console.log('🔔 ExpoPushService: permission request result:', finalStatus);
      }
      if (finalStatus !== 'granted') {
        console.warn('ExpoPushService: permission not granted');
        return null;
      }

      if (!Constants?.expoConfig?.extra?.eas?.projectId && !Constants?.easConfig?.projectId) {
        console.warn('ExpoPushService: Missing EAS projectId (ensure app is built with EAS).');
      }

      console.log('🔔 ExpoPushService: getting Expo push token...');
      const tokenData = await Notifications.getExpoPushTokenAsync();
      this.token = tokenData.data;
      console.log('🔔 ExpoPushService: received token:', this.token?.substring(0, 20) + '...');
      await AsyncStorage.setItem('expo_push_token', this.token || '');

      // Persist in Firestore (id = token)
      try {
        if (this.token) {
          console.log('🔔 ExpoPushService: storing token in Firestore...');
          const colRef = collection(db, 'expoPushTokens');
          const docRef = doc(colRef, this.token);
          await setDoc(docRef, {
          token: this.token,
          platform: Platform.OS,
          updatedAt: serverTimestamp(),
          }, { merge: true });
          console.log('🔔 ExpoPushService: token stored in Firestore successfully');
        }
      } catch (e) {
        console.warn('Failed to store token in Firestore', e);
      }

      this.setupListeners();
      return this.token;
    } finally {
      this.registering = false;
    }
  }

  private setupListeners() {
    if (this.listenersSet) return;
    this.listenersSet = true;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        // Expo SDK 51+ includes additional behavior flags (supply safe defaults)
        shouldShowBanner: true,
        shouldShowList: true,
      }) as any,
    });
  }

  getToken(): string | null {
    return this.token;
  }
}

export const expoPushService = new ExpoPushService();
