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
    if (this.token) {
      return this.token;
    }
    if (this.registering) {
      return null;
    }
    this.registering = true;
    try {
      const stored = await AsyncStorage.getItem('expo_push_token');
      if (stored) {
        this.token = stored;
      }

      const permission = await Notifications.getPermissionsAsync();
      let finalStatus = permission.status;
      if (finalStatus !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        finalStatus = req.status;
      }
      if (finalStatus !== 'granted') {
        console.warn('ExpoPushService: permission not granted');
        return null;
      }

      if (!Constants?.expoConfig?.extra?.eas?.projectId && !Constants?.easConfig?.projectId) {
        console.warn('ExpoPushService: Missing EAS projectId (ensure app is built with EAS).');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      this.token = tokenData.data;
      await AsyncStorage.setItem('expo_push_token', this.token || '');

      // Persist in Firestore (id = token)
      try {
        if (this.token) {
          const colRef = collection(db, 'expoPushTokens');
          const docRef = doc(colRef, this.token);
          await setDoc(docRef, {
          token: this.token,
          platform: Platform.OS,
          updatedAt: serverTimestamp(),
          }, { merge: true });
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
