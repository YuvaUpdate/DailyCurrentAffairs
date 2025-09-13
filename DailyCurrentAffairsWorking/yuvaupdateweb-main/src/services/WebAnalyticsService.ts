import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
  getDoc,
  increment,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase.config';

export interface UserSession {
  sessionId: string;
  firstVisit: Date;
  lastVisit: Date;
  pageViews: number;
  userAgent: string;
  country?: string;
  city?: string;
}

export interface DailyStats {
  date: string;
  users: number;
  pageViews: number;
  sessions: number;
}

export interface HourlyStats {
  hour: number;
  users: number;
  pageViews: number;
}

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalPageViews: number;
  dailyUsers: number;
  weeklyUsers: number;
  monthlyUsers: number;
  topPages: Array<{ page: string; views: number; title?: string }>;
  userSessions: UserSession[];
  dailyStats: DailyStats[];
  hourlyStats: HourlyStats[];
  averageSessionDuration: number;
  bounceRate: number;
  topReferrers: Array<{ source: string; visitors: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
}

export class WebAnalyticsService {
  private static readonly COLLECTION_NAME = 'web_analytics';
  private static readonly SESSIONS_COLLECTION = 'user_sessions';
  private static readonly PAGE_VIEWS_COLLECTION = 'page_views';
  
  private static sessionId: string | null = null;
  private static hasTrackedSession = false;

  /**
   * Initialize analytics tracking for current user session
   */
  static async initializeTracking(): Promise<void> {
    if (this.hasTrackedSession) return;

    try {
      // Generate unique session ID
      this.sessionId = this.generateSessionId();
      
      // Track the session
      await this.trackUserSession();
      
      // Track page view for current page
      await this.trackPageView(window.location.pathname);
      
      this.hasTrackedSession = true;
      
      console.log('🔗 Analytics tracking initialized for session:', this.sessionId);
    } catch (error) {
      console.error('Failed to initialize analytics tracking:', error);
    }
  }

  /**
   * Track a page view
   */
  static async trackPageView(pagePath: string): Promise<void> {
    if (!this.sessionId) {
      await this.initializeTracking();
    }

    try {
      const pageViewData = {
        sessionId: this.sessionId,
        pagePath: pagePath,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct'
      };

      // Add page view record
      await addDoc(collection(db, this.PAGE_VIEWS_COLLECTION), pageViewData);

      // Update session's page view count
      if (this.sessionId) {
        const sessionRef = doc(db, this.SESSIONS_COLLECTION, this.sessionId);
        await updateDoc(sessionRef, {
          pageViews: increment(1),
          lastVisit: serverTimestamp()
        });
      }

      // Update daily analytics
      await this.updateDailyAnalytics(pagePath);

    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  /**
   * Track user session
   */
  private static async trackUserSession(): Promise<void> {
    if (!this.sessionId) return;

    try {
      const sessionData: Partial<UserSession> = {
        sessionId: this.sessionId,
        firstVisit: new Date(),
        lastVisit: new Date(),
        pageViews: 0,
        userAgent: navigator.userAgent
      };

      // Try to get location data (optional)
      try {
        const locationData = await this.getLocationData();
        if (locationData) {
          sessionData.country = locationData.country;
          sessionData.city = locationData.city;
        }
      } catch (error) {
        console.log('Location data not available');
      }

      // Save session
      const sessionRef = doc(db, this.SESSIONS_COLLECTION, this.sessionId);
      await setDoc(sessionRef, {
        ...sessionData,
        firstVisit: serverTimestamp(),
        lastVisit: serverTimestamp(),
      });

    } catch (error) {
      console.error('Failed to track user session:', error);
    }
  }

  /**
   * Update daily analytics aggregations
   */
  private static async updateDailyAnalytics(pagePath: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const analyticsRef = doc(db, this.COLLECTION_NAME, today);

      // Get existing data
      const analyticsDoc = await getDoc(analyticsRef);
      const existingData = analyticsDoc.exists() ? analyticsDoc.data() : {};

      // Update page views count
      const currentPageViews = existingData.pageViews || {};
      currentPageViews[pagePath] = (currentPageViews[pagePath] || 0) + 1;

      // Update analytics document
      await setDoc(analyticsRef, {
        date: today,
        totalPageViews: increment(1),
        pageViews: currentPageViews,
        lastUpdated: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error('Failed to update daily analytics:', error);
    }
  }

  /**
   * Get comprehensive analytics data for admin panel
   */
  static async getAnalyticsData(): Promise<AnalyticsData> {
    try {
      // Get recent sessions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sessionsQuery = query(
        collection(db, this.SESSIONS_COLLECTION),
        where('firstVisit', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('firstVisit', 'desc')
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);
      const userSessions: UserSession[] = [];
      
      sessionsSnapshot.forEach(doc => {
        const data = doc.data();
        userSessions.push({
          sessionId: data.sessionId,
          firstVisit: data.firstVisit?.toDate() || new Date(),
          lastVisit: data.lastVisit?.toDate() || new Date(),
          pageViews: data.pageViews || 0,
          userAgent: data.userAgent || '',
          country: data.country,
          city: data.city
        });
      });

      // Calculate metrics
      const totalUsers = userSessions.length;
      const totalPageViews = userSessions.reduce((sum, session) => sum + session.pageViews, 0);
      
      // Active users (visited in last 5 minutes for real-time tracking)
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      const activeUsers = userSessions.filter(session => session.lastVisit > fiveMinutesAgo).length;

      // Daily users (visited today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyUsers = userSessions.filter(session => session.lastVisit >= today).length;

      // Weekly users (visited in last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyUsers = userSessions.filter(session => session.lastVisit >= weekAgo).length;

      // Monthly users
      const monthlyUsers = totalUsers; // Already filtered to 30 days

      // Get top pages
      const topPages = await this.getTopPages();

      // Generate daily stats for the last 30 days
      const dailyStats = await this.generateDailyStats(userSessions);

      // Generate hourly stats for today
      const hourlyStats = this.generateHourlyStats(userSessions);

      // Calculate average session duration
      const avgDuration = this.calculateAverageSessionDuration(userSessions);

      // Calculate bounce rate (sessions with only 1 page view)
      const bounceRate = this.calculateBounceRate(userSessions);

      // Get top referrers
      const topReferrers = this.getTopReferrers(userSessions);

      // Get device breakdown
      const deviceBreakdown = this.getDeviceBreakdown(userSessions);

      return {
        totalUsers,
        activeUsers,
        totalPageViews,
        dailyUsers,
        weeklyUsers,
        monthlyUsers,
        topPages,
        userSessions,
        dailyStats,
        hourlyStats,
        averageSessionDuration: avgDuration,
        bounceRate,
        topReferrers,
        deviceBreakdown
      };

    } catch (error) {
      console.error('Failed to get analytics data:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalPageViews: 0,
        dailyUsers: 0,
        weeklyUsers: 0,
        monthlyUsers: 0,
        topPages: [],
        userSessions: [],
        dailyStats: [],
        hourlyStats: [],
        averageSessionDuration: 0,
        bounceRate: 0,
        topReferrers: [],
        deviceBreakdown: []
      };
    }
  }

  /**
   * Get top pages by view count
   */
  private static async getTopPages(): Promise<Array<{ page: string; views: number }>> {
    try {
      // Get recent page views (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const pageViewsQuery = query(
        collection(db, this.PAGE_VIEWS_COLLECTION),
        where('timestamp', '>=', Timestamp.fromDate(sevenDaysAgo))
      );

      const pageViewsSnapshot = await getDocs(pageViewsQuery);
      const pageCounts: { [key: string]: number } = {};

      pageViewsSnapshot.forEach(doc => {
        const data = doc.data();
        const page = data.pagePath || '/';
        pageCounts[page] = (pageCounts[page] || 0) + 1;
      });

      // Sort and return top 10
      return Object.entries(pageCounts)
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

    } catch (error) {
      console.error('Failed to get top pages:', error);
      return [];
    }
  }

  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 9);
    return `${timestamp}_${randomStr}`;
  }

  /**
   * Get user's location data (optional, using IP geolocation)
   */
  private static async getLocationData(): Promise<{ country: string; city: string } | null> {
    try {
      // Using a free IP geolocation service (you can replace with your preferred service)
      const response = await fetch('https://ipapi.co/json/', { timeout: 3000 } as any);
      if (!response.ok) return null;
      
      const data = await response.json();
      return {
        country: data.country_name || 'Unknown',
        city: data.city || 'Unknown'
      };
    } catch (error) {
      console.log('Could not fetch location data:', error);
      return null;
    }
  }

  /**
   * Track custom events (article views, clicks, etc.)
   */
  static async trackEvent(eventName: string, eventData: any = {}): Promise<void> {
    if (!this.sessionId) {
      await this.initializeTracking();
    }

    try {
      const eventRecord = {
        sessionId: this.sessionId,
        eventName,
        eventData,
        timestamp: serverTimestamp(),
        pagePath: window.location.pathname
      };

      await addDoc(collection(db, 'events'), eventRecord);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Get real-time analytics (for admin dashboard)
   */
  static subscribeToAnalytics(callback: (data: AnalyticsData) => void): () => void {
    // Set up real-time listener for sessions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessionsQuery = query(
      collection(db, this.SESSIONS_COLLECTION),
      where('firstVisit', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('firstVisit', 'desc')
    );

    const unsubscribe = onSnapshot(sessionsQuery, async () => {
      const analyticsData = await this.getAnalyticsData();
      callback(analyticsData);
    });

    return unsubscribe;
  }

  /**
   * Generate daily statistics for the last 30 days
   */
  private static async generateDailyStats(userSessions: UserSession[]): Promise<DailyStats[]> {
    const stats: DailyStats[] = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const daySessions = userSessions.filter(session => 
        session.firstVisit >= dayStart && session.firstVisit <= dayEnd
      );
      
      const dayPageViews = daySessions.reduce((total, session) => total + session.pageViews, 0);
      
      stats.push({
        date: dateStr,
        users: daySessions.length,
        pageViews: dayPageViews,
        sessions: daySessions.length
      });
    }
    
    return stats;
  }

  /**
   * Generate hourly statistics for today
   */
  private static generateHourlyStats(userSessions: UserSession[]): HourlyStats[] {
    const stats: HourlyStats[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaySessions = userSessions.filter(session => 
      session.firstVisit >= today && session.firstVisit < tomorrow
    );
    
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(today);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(today);
      hourEnd.setHours(hour, 59, 59, 999);
      
      const hourSessions = todaySessions.filter(session =>
        session.firstVisit >= hourStart && session.firstVisit <= hourEnd
      );
      
      const hourPageViews = hourSessions.reduce((total, session) => total + session.pageViews, 0);
      
      stats.push({
        hour,
        users: hourSessions.length,
        pageViews: hourPageViews
      });
    }
    
    return stats;
  }

  /**
   * Calculate average session duration in minutes
   */
  private static calculateAverageSessionDuration(userSessions: UserSession[]): number {
    if (userSessions.length === 0) return 0;
    
    const totalDuration = userSessions.reduce((total, session) => {
      const duration = (session.lastVisit.getTime() - session.firstVisit.getTime()) / 1000 / 60; // minutes
      return total + duration;
    }, 0);
    
    return Math.round(totalDuration / userSessions.length);
  }

  /**
   * Calculate bounce rate (percentage of single-page sessions)
   */
  private static calculateBounceRate(userSessions: UserSession[]): number {
    if (userSessions.length === 0) return 0;
    
    const bounces = userSessions.filter(session => session.pageViews <= 1).length;
    return Math.round((bounces / userSessions.length) * 100);
  }

  /**
   * Get top referrers
   */
  private static getTopReferrers(userSessions: UserSession[]): Array<{ source: string; visitors: number }> {
    const referrers: { [key: string]: number } = {};
    
    userSessions.forEach(session => {
      // Extract domain from user agent or use 'Direct' for direct visits
      const source = this.extractReferrerSource(session.userAgent) || 'Direct';
      referrers[source] = (referrers[source] || 0) + 1;
    });
    
    return Object.entries(referrers)
      .map(([source, visitors]) => ({ source, visitors }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10);
  }

  /**
   * Get device breakdown from user agents
   */
  private static getDeviceBreakdown(userSessions: UserSession[]): Array<{ device: string; count: number }> {
    const devices: { [key: string]: number } = {};
    
    userSessions.forEach(session => {
      const device = this.extractDeviceType(session.userAgent);
      devices[device] = (devices[device] || 0) + 1;
    });
    
    return Object.entries(devices)
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Extract referrer source from user agent
   */
  private static extractReferrerSource(userAgent: string): string {
    if (userAgent.includes('Google')) return 'Google';
    if (userAgent.includes('Facebook')) return 'Facebook';
    if (userAgent.includes('Twitter')) return 'Twitter';
    if (userAgent.includes('LinkedIn')) return 'LinkedIn';
    return 'Direct';
  }

  /**
   * Extract device type from user agent
   */
  private static extractDeviceType(userAgent: string): string {
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) return 'Mobile';
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) return 'Tablet';
    return 'Desktop';
  }
}

// Auto-initialize tracking when the service is loaded
if (typeof window !== 'undefined') {
  // Initialize tracking when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      WebAnalyticsService.initializeTracking();
    });
  } else {
    WebAnalyticsService.initializeTracking();
  }
}