import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase.config';

export interface AppInstallationData {
  totalInstalls: number;
  dailyInstalls: number;
  weeklyInstalls: number;
  monthlyInstalls: number;
  uninstalls: number;
  activeInstalls: number;
  installSources: Array<{ source: string; count: number }>;
  countries: Array<{ country: string; installs: number }>;
}

export class AppAnalyticsService {
  private static readonly COLLECTION_NAME = 'app_installations';

  /**
   * Track app installation (to be called from your mobile app)
   */
  static async trackAppInstallation(installData: {
    deviceId: string;
    platform: 'android' | 'ios';
    country?: string;
    source?: string; // 'play_store', 'app_store', 'direct', etc.
  }): Promise<void> {
    try {
      const installRecord = {
        ...installData,
        timestamp: serverTimestamp(),
        type: 'install'
      };

      await addDoc(collection(db, this.COLLECTION_NAME), installRecord);
    } catch (error) {
      console.error('Failed to track app installation:', error);
    }
  }

  /**
   * Track app uninstallation (to be called from your mobile app)
   */
  static async trackAppUninstallation(deviceId: string): Promise<void> {
    try {
      const uninstallRecord = {
        deviceId,
        timestamp: serverTimestamp(),
        type: 'uninstall'
      };

      await addDoc(collection(db, this.COLLECTION_NAME), uninstallRecord);
    } catch (error) {
      console.error('Failed to track app uninstallation:', error);
    }
  }

  /**
   * Get app installation analytics
   */
  static async getAppAnalytics(): Promise<AppInstallationData> {
    try {
      // Get installations from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const installations: any[] = [];
      const uninstallations: any[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'install') {
          installations.push({
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          });
        } else if (data.type === 'uninstall') {
          uninstallations.push({
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          });
        }
      });

      // Calculate metrics
      const totalInstalls = installations.length;
      const uninstalls = uninstallations.length;
      const activeInstalls = Math.max(0, totalInstalls - uninstalls);

      // Daily installs (today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyInstalls = installations.filter(install => 
        install.timestamp >= today
      ).length;

      // Weekly installs (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyInstalls = installations.filter(install => 
        install.timestamp >= weekAgo
      ).length;

      // Monthly installs (all installations in the query)
      const monthlyInstalls = totalInstalls;

      // Install sources
      const sourceCounts: { [key: string]: number } = {};
      installations.forEach(install => {
        const source = install.source || 'unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      const installSources = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      // Countries
      const countryCounts: { [key: string]: number } = {};
      installations.forEach(install => {
        const country = install.country || 'Unknown';
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      });

      const countries = Object.entries(countryCounts)
        .map(([country, installs]) => ({ country, installs }))
        .sort((a, b) => b.installs - a.installs)
        .slice(0, 10); // Top 10 countries

      return {
        totalInstalls,
        dailyInstalls,
        weeklyInstalls,
        monthlyInstalls,
        uninstalls,
        activeInstalls,
        installSources,
        countries
      };

    } catch (error) {
      console.error('Failed to get app analytics:', error);
      return {
        totalInstalls: 0,
        dailyInstalls: 0,
        weeklyInstalls: 0,
        monthlyInstalls: 0,
        uninstalls: 0,
        activeInstalls: 0,
        installSources: [],
        countries: []
      };
    }
  }

  /**
   * Integration guide for mobile app
   */
  static getIntegrationGuide(): string {
    return `
To integrate app installation tracking in your React Native app:

1. Install Firebase Analytics in your mobile app
2. Track installations:
   
   // In your App.js or main component
   import { AppAnalyticsService } from './services/AppAnalyticsService';
   import DeviceInfo from 'react-native-device-info';
   
   // Track installation on first app launch
   useEffect(() => {
     const trackInstallation = async () => {
       const isFirstLaunch = await DeviceInfo.isFirstTime();
       if (isFirstLaunch) {
         const deviceId = await DeviceInfo.getUniqueId();
         const country = await DeviceInfo.getDeviceCountry();
         
         await AppAnalyticsService.trackAppInstallation({
           deviceId,
           platform: Platform.OS === 'ios' ? 'ios' : 'android',
           country,
           source: 'play_store' // or detect actual source
         });
       }
     };
     
     trackInstallation();
   }, []);

3. Track uninstallations (harder to track, usually done via push notification failures)
4. View analytics in your web admin panel

Alternative: Use Google Play Console API or Firebase Analytics directly.
    `;
  }
}

// Mock data for demonstration (remove when real data is available)
export const getMockAppData = (): AppInstallationData => {
  return {
    totalInstalls: 1247,
    dailyInstalls: 23,
    weeklyInstalls: 156,
    monthlyInstalls: 1247,
    uninstalls: 89,
    activeInstalls: 1158,
    installSources: [
      { source: 'play_store', count: 1098 },
      { source: 'direct', count: 89 },
      { source: 'referral', count: 60 }
    ],
    countries: [
      { country: 'India', installs: 892 },
      { country: 'United States', installs: 156 },
      { country: 'United Kingdom', installs: 78 },
      { country: 'Canada', installs: 45 },
      { country: 'Australia', installs: 32 }
    ]
  };
};