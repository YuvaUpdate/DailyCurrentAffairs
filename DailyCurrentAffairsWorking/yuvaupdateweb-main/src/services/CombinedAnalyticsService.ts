import { WebAnalyticsService, AnalyticsData } from './WebAnalyticsService';
import { AppAnalyticsService, AppInstallationData } from './AppAnalyticsService';

export interface CombinedAnalyticsData {
  // Website metrics
  websiteUsers: number;
  websiteActiveUsers: number;
  websitePageViews: number;
  
  // Mobile app metrics  
  appUsers: number;
  appActiveUsers: number;
  appInstallations: number;
  
  // Combined metrics
  totalUsers: number;           // website + app users
  totalActiveUsers: number;     // website + app active users
  totalEngagement: number;      // page views + app sessions
}

export class CombinedAnalyticsService {
  
  /**
   * Get combined analytics from both website and mobile app
   */
  static async getCombinedAnalytics(): Promise<CombinedAnalyticsData> {
    try {
      // Get website analytics
      const webData = await WebAnalyticsService.getAnalyticsData();
      
      // Get app analytics (when implemented)
      const appData = await AppAnalyticsService.getAppAnalytics();
      
      // Combine the data
      const combined: CombinedAnalyticsData = {
        // Website metrics
        websiteUsers: webData.totalUsers,
        websiteActiveUsers: webData.activeUsers,
        websitePageViews: webData.totalPageViews,
        
        // Mobile app metrics
        appUsers: appData.activeInstalls,
        appActiveUsers: 0, // Need to implement app session tracking
        appInstallations: appData.totalInstalls,
        
        // Combined totals
        totalUsers: webData.totalUsers + appData.activeInstalls,
        totalActiveUsers: webData.activeUsers + 0, // + app active users when implemented
        totalEngagement: webData.totalPageViews // + app sessions when implemented
      };
      
      return combined;
      
    } catch (error) {
      console.error('Failed to get combined analytics:', error);
      return {
        websiteUsers: 0,
        websiteActiveUsers: 0, 
        websitePageViews: 0,
        appUsers: 0,
        appActiveUsers: 0,
        appInstallations: 0,
        totalUsers: 0,
        totalActiveUsers: 0,
        totalEngagement: 0
      };
    }
  }
  
  /**
   * Track mobile app session (to be called from React Native app)
   */
  static async trackMobileAppSession(sessionData: {
    userId: string;
    sessionId: string;
    platform: 'android' | 'ios';
    appVersion: string;
    deviceInfo?: any;
  }): Promise<void> {
    try {
      // Store app session in same Firebase database
      // This will be counted alongside website sessions
      
      // Implementation would track app usage similar to website
      // Store in 'app_sessions' collection
      
    } catch (error) {
      console.error('Failed to track mobile app session:', error);
    }
  }
}

// Usage in admin panel:
// const analytics = await CombinedAnalyticsService.getCombinedAnalytics();
// console.log('Total users (web + app):', analytics.totalUsers);