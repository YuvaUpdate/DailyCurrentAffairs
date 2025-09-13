import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { InteractionManager } from 'react-native';
import { Appearance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHOW_BOOKMARKS, SHOW_SIDEBAR } from './uiConfig';
import InitializationService from './InitializationService';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Alert,
  Share,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
  StatusBar,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import FastTouchable from './FastTouchable';
import AdminPanel from './AdminPanel';
import Sidebar from './Sidebar';
import VideoPlayerComponent from './VideoPlayerComponent';
import YouTubePlayer from './YouTubePlayer';
import { NewsArticle } from './types';
// Lazy-load FirebaseNewsService at runtime to reduce startup parsing/execution
let _firebaseNewsService: any = null;
async function getFirebaseNewsService() {
  if (_firebaseNewsService) return _firebaseNewsService;
  const mod = await import('./FirebaseNewsService');
  _firebaseNewsService = mod.firebaseNewsService;
  return _firebaseNewsService;
}
// Do not import the service singleton at module load time. Instantiate after startup.
let firebaseNotificationService: any = null;
const createFirebaseNotificationService = async () => {
  if (firebaseNotificationService) return firebaseNotificationService;
  const mod = await import('./FirebaseNotificationService');
  const Service = mod.default || mod;
  firebaseNotificationService = new Service();
  return firebaseNotificationService;
};
import { notificationSender } from './NotificationSender';
import './firebaseBackgroundHandler'; // Initialize background handler
import { logger } from './utils/logging';
import TextToSpeechService from './TextToSpeechService';
import { ArticleActions } from './ArticleActions';
import { authService, UserProfile } from './AuthService';
import { INCLUDE_ADMIN_PANEL, ENABLE_ADMIN_AUTO_LOGIN, ADMIN_EMAIL, ADMIN_PASSWORD } from './buildConfig';
import { userService } from './UserService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthScreen } from './AuthScreen';
import { audioService } from './AudioService';
import OnboardingCards from './OnboardingCards';
import { testFirebaseConnection } from './firebase-debug';
import { scaleFont, responsiveLines } from './utils/responsive';
import { LoadingSpinner } from './LoadingSpinner';
import InAppBrowserHost, { showInApp } from './InAppBrowser';
import SkeletonCard from './SkeletonCard';
import OptimizedImage from './OptimizedImage';
import ImageAlignmentHelper from './ImageAlignmentHelper';
import ImagePrefetchService from './ImagePrefetchService';
import ImageCacheWarmer from './ImageCacheWarmer';
import { expoPushService } from './ExpoPushService';
import * as Notifications from 'expo-notifications';

const { height, width } = Dimensions.get('screen');

interface AppProps {
  currentUser?: any;
  // Called once when articles have been loaded (from cache or network)
  onArticlesReady?: () => void;
}

export default function App(props: AppProps) {
  const { currentUser, onArticlesReady } = props;
  const insets = useSafeAreaInsets();
  // NOTE: SHOW_BOOKMARKS and SHOW_SIDEBAR are imported from uiConfig.ts
  // Theme state - Default to system or dark mode until persisted value is loaded
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Use system preference as initial guess to reduce flicker while AsyncStorage loads
    const sys = Appearance.getColorScheme();
    return sys === 'light' ? false : true;
  });
  const [isThemeLoaded, setIsThemeLoaded] = useState(true); // Start immediately loaded
  const THEME_KEY = 'ya_theme';
  const [screenData, setScreenData] = useState(Dimensions.get('screen'));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authVisible, setAuthVisible] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Theme colors
  const theme = {
    light: {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#000000',
  subText: '#374151',
      accent: '#2563EB',
      border: '#E5E7EB',
      headerBg: '#FFFFFF',
      buttonBg: '#2563EB',
      buttonText: '#FFFFFF',
      success: '#059669',
      error: '#DC2626',
      warning: '#D97706'
    },
    dark: {
  background: '#000000',
  surface: '#000000',
  text: '#FFFFFF',
  subText: '#B0B0B0',
  accent: '#000000',
  border: '#000000',
  headerBg: '#000000',
  buttonBg: '#000000',
      buttonText: '#FFFFFF',
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B'
    }
  };

  // Memoize theme object to avoid re-creating style-related objects on every render
  // Memoized theme to prevent unnecessary re-renders
  const currentTheme = useMemo(() => (isDarkMode ? theme.dark : theme.light), [isDarkMode]);
  
  // Memoized screen data to prevent layout recalculations
  const memoizedScreenData = useMemo(() => screenData, [screenData.width, screenData.height]);

  // Load persisted theme preference on startup - IMMEDIATE
  useEffect(() => {
    // DISABLED: ExpoPushService conflicts with Firebase Cloud Messaging
    // Using Firebase Cloud Messaging only for APK builds
    // (async () => {
    //   try { 
    //     console.log('🔔 App: Initializing ExpoPushService...');
    //     await expoPushService.init(); 
    //     console.log('🔔 App: ExpoPushService initialized successfully');
    //   } catch(e) { 
    //     console.warn('🔔 App: ExpoPushService init failed:', e);
    //   }
    // })();
    // Set theme loaded immediately for faster startup
    setIsThemeLoaded(true);
    
    // Load theme in background
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (stored === 'light') {
          setIsDarkMode(false);
        } else if (stored === 'dark') {
          setIsDarkMode(true);
        }
      })
      .catch((e) => console.warn('Failed to read persisted theme', e));
  }, []);

  // Expose Firebase test function globally for debugging
  useEffect(() => {
    (global as any).testFirebaseConnection = testFirebaseConnection;
    console.log('🔬 Firebase debug function exposed globally. Use: testFirebaseConnection()');
  }, []);

  // Helper to persist theme changes
  const persistTheme = async (dark: boolean) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch (e) {
      console.warn('Failed to persist theme choice', e);
    }
  };

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    persistTheme(next);
  };

  // Start with empty data so we can show a loading state on startup and then
  // populate from cache or network. This avoids showing sample articles by default.
  const [newsData, setNewsData] = useState<NewsArticle[]>([]);

  const [bookmarkedItems, setBookmarkedItems] = useState<(string | number)[]>([]);
  const [bookmarkedArticlesList, setBookmarkedArticlesList] = useState<NewsArticle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [adminVisible, setAdminVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [articleModalVisible, setArticleModalVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number>(80); // measured header height (fallback 80)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoadingArticles, setIsLoadingArticles] = useState<boolean>(true);
  // Show a short startup spinner only when initial data is still loading.
  // Default to false so the UI can render immediately; if articles are still
  // loading after a short delay we briefly display a spinner (non-blocking).
  const [showStartupSpinner, setShowStartupSpinner] = useState<boolean>(false);

  // Show onboarding modal on first install only - SMART INITIALIZATION CHECK
  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        // Wait for all services to be properly initialized
        const initService = InitializationService.getInstance();
        console.log('🎯 Waiting for services to initialize before onboarding...');
        
        await initService.waitForReady();
        console.log('✅ All services ready, checking onboarding status');
        
        // Now check if we should show onboarding
        const seen = await AsyncStorage.getItem('ya_seen_onboarding_v1');
        if (!seen) {
          console.log('� Showing onboarding - services are ready!');
          setShowOnboarding(true);
        } else {
          console.log('👍 Onboarding already seen, skipping');
        }
      } catch (error) {
        console.log('⚠️ Error during onboarding initialization:', error);
        // Fallback: show onboarding anyway after a delay
        setTimeout(() => {
          AsyncStorage.getItem('ya_seen_onboarding_v1')
            .then((seen) => {
              if (!seen) setShowOnboarding(true);
            })
            .catch(() => setShowOnboarding(true));
        }, 6000);
      }
    };
    
    initializeOnboarding();
  }, []);
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>(newsData); // Initialize with newsData
  const [refreshing, setRefreshing] = useState(false);
  const [lastArticleCount, setLastArticleCount] = useState(0);
  // Startup spinner: show briefly only if articles are still not available
  const _spinnerShownRef = React.useRef(false);
  useEffect(() => {
    // Immediate startup - no delays
    if (isLoadingArticles && (!filteredNews || filteredNews.length === 0)) {
      setShowStartupSpinner(true);
      const h = setTimeout(() => setShowStartupSpinner(false), 200); // Much shorter display
      return () => clearTimeout(h);
    }
  }, [isLoadingArticles, filteredNews]);
  const [categories, setCategories] = useState<string[]>([]);
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const scrollViewRef = useRef<FlatList>(null);
  const [playbackStateLocal, setPlaybackStateLocal] = useState(audioService.getPlaybackState());
  
  // TTS state
  const [readingArticleId, setReadingArticleId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const ttsService = TextToSpeechService.getInstance();
  
  // Ensure we only call the onArticlesReady callback once
  const articlesReadyCalled = React.useRef(false);

  // Hide the startup spinner IMMEDIATELY when any articles are available
  useEffect(() => {
    // Show content immediately if we have any articles at all
    if (filteredNews && filteredNews.length > 0) {
      setShowStartupSpinner(false);
      setIsLoadingArticles(false);
    }
  }, [filteredNews]);

  // Firebase real-time subscription with auto-refresh
  useEffect(() => {
    // Notification response listener (open article on tap later)
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      try {
        const articleId = resp.notification.request.content.data?.articleId as string | undefined;
        if (articleId) {
          console.log('🔔 Notification tapped (Expo) articleId=', articleId);
          // Navigate to the specific article
          navigateToArticle(articleId);
        }
      } catch(err) { console.warn('Notification response error', err); }
    });
    // On mount: subscribe to Firebase auth state so we rely on the native SDK
    // persistence rather than a separate AsyncStorage flag. This avoids the
    // APK always asking for login after restart if the SDK already has a
    // persisted session.
    let authUnsub: (() => void) | null = null;
  try {
      authUnsub = authService.onAuthStateChanged(async (user) => {
        try {
          logger.debug('🔐 auth state changed handler called - user:', user ? user.uid : null);
          // Debug persisted AsyncStorage values as a diagnostic when running on device
            try {
            const persistedUid = await AsyncStorage.getItem('ya_user_uid');
            const loggedFlag = await AsyncStorage.getItem('ya_logged_in');
            logger.debug('🔐 persisted ya_user_uid:', persistedUid, 'ya_logged_in:', loggedFlag);
          } catch (e) {
            console.warn('🔐 Failed to read persisted login keys', e);
          }
          if (user) {
            // Load profile from Firestore and persist uid locally as a fallback
            const profile = await authService.getUserProfile(user.uid);
            setUserProfile(profile);
            // If this is an admin build and the user is admin, show the admin panel
            // Do not open admin panel automatically on auth; require explicit user action.
            if (INCLUDE_ADMIN_PANEL && authService.isAdminUser(profile)) {
              // Keep adminVisible false; show Admin button in header for manual access
            }
            setAuthVisible(false);
            try {
              await AsyncStorage.setItem('ya_logged_in', 'true');
              await AsyncStorage.setItem('ya_user_uid', user.uid);
            } catch (e) {
              console.warn('Could not persist login flag to AsyncStorage', e);
            }
          } else {
            // If admin auto-login is enabled at build time, sign-in automatically
            if (ENABLE_ADMIN_AUTO_LOGIN) {
              try {
                logger.info('🔐 Admin auto-login enabled; signing in...');
                const profile = await authService.login(ADMIN_EMAIL, ADMIN_PASSWORD);
                setUserProfile(profile);
                // If admin panel is included and login succeeded for admin, show panel
                if (INCLUDE_ADMIN_PANEL && authService.isAdminUser(profile)) {
                  // Keep adminVisible false; admin panel should open only when the admin user taps the Admin button
                }
                setAuthVisible(false);
              } catch (e) {
                console.warn('Admin auto-login failed', e);
                setAuthVisible(false);
              }
            } else {
            // No user signed in - do not force showing auth modal here; app runs in guest mode
            setUserProfile(null);
            setAuthVisible(false);
            }
          }
        } catch (e) {
          console.warn('Error handling auth state change', e);
          // Keep guest mode rather than forcing auth modal
          setAuthVisible(false);
        }
      });
    } catch (e) {
      console.warn('Failed to subscribe to auth state; falling back to AsyncStorage check', e);
      // Fallback for environments where the listener fails: use persisted flag
      (async () => {
        try {
          const logged = await authService.isDeviceLoggedIn();
          if (!logged) {
            // guest mode
            setAuthVisible(false);
          } else {
            const uid = await authService.getPersistedUserUid();
            if (uid) {
              const profile = await authService.getUserProfile(uid);
              setUserProfile(profile);
              setAuthVisible(false);
            }
          }
          // If no persisted login but admin auto-login is enabled at build time,
          // attempt to sign in using the build-configured admin credentials.
          if (!logged && ENABLE_ADMIN_AUTO_LOGIN) {
            try {
              logger.info('🔐 Fallback: attempting admin auto-login (fallback path)');
              const profile = await authService.login(ADMIN_EMAIL, ADMIN_PASSWORD);
              setUserProfile(profile);
              if (INCLUDE_ADMIN_PANEL && authService.isAdminUser(profile)) {
                // Do not auto-open admin panel on fallback login; require explicit user action.
                // Small note: we keep the profile in state so the Admin button will appear for admin users.
              }
              setAuthVisible(false);
            } catch (err) {
              console.warn('Fallback admin auto-login failed', err);
            }
          }
        } catch (err) {
          console.warn('Fallback persisted login check failed', err);
          setAuthVisible(false);
        }
      })();
    }

  let unsubscribe: (() => void) | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;

    // FORCE IMMEDIATE FRESH FETCH - Always get latest articles on app startup
    (async () => {
      try {
        console.log('🚀 App startup: FORCING immediate fresh article fetch...');
        
        // First, try to get fresh articles immediately (priority)
        try {
          const svc = await getFirebaseNewsService();
          const freshArticles = await svc.getArticles();
          if (freshArticles && freshArticles.length > 0) {
            console.log('✅ FORCED fresh articles loaded on startup:', freshArticles.length);
            setNewsData(freshArticles);
            setLastArticleCount(freshArticles.length);
            setIsLoadingArticles(false);
            
            // 🚀 ULTRA-FAST IMAGE LOADING - Multi-layer optimization
            const cacheWarmer = ImageCacheWarmer.getInstance();
            
            // Phase 1: Immediate preload of visible images (first 5)
            cacheWarmer.preloadVisibleImages(freshArticles);
            
            // Phase 2: Warm up cache with more images in background
            cacheWarmer.warmUpCache(freshArticles);
            
            // Apply filter immediately
            if (selectedCategory) {
              const filtered = freshArticles.filter((article: NewsArticle) => article.category === selectedCategory);
              setFilteredNews(filtered);
            } else {
              setFilteredNews(freshArticles);
            }
            
            // Cache the fresh articles for next time
            AsyncStorage.setItem('ya_cached_articles', JSON.stringify(freshArticles)).catch(() => {});
            
            // Notify parent that fresh articles are ready
            try {
              if (!articlesReadyCalled.current && typeof onArticlesReady === 'function') {
                onArticlesReady();
                articlesReadyCalled.current = true;
              }
            } catch (er) {
              // ignore
            }
            return; // Success - skip cached loading
          }
        } catch (freshError) {
          console.warn('Failed to fetch fresh articles immediately, falling back to cache:', freshError);
        }

        // Fallback: Load cached articles only if fresh fetch failed
        const [rawArticles, rawCats] = await Promise.all([
          AsyncStorage.getItem('ya_cached_articles'),
          AsyncStorage.getItem('ya_cached_categories')
        ]);

        if (rawArticles) {
          try {
            const cached = JSON.parse(rawArticles) as NewsArticle[];
            if (Array.isArray(cached) && cached.length > 0) {
              console.log('📦 Using cached articles as fallback:', cached.length);
              setNewsData(cached);
              setLastArticleCount(cached.length);
              setIsLoadingArticles(false);
              
              if (selectedCategory) {
                const filtered = cached.filter((article: NewsArticle) => article.category === selectedCategory);
                setFilteredNews(filtered);
              } else {
                setFilteredNews(cached);
              }
              
              try {
                if (!articlesReadyCalled.current && typeof onArticlesReady === 'function') {
                  onArticlesReady();
                  articlesReadyCalled.current = true;
                }
              } catch (er) {
                // ignore
              }
            }
          } catch (e) {
            console.warn('Failed to parse cached articles', e);
            setIsLoadingArticles(true);
          }
        } else {
          setIsLoadingArticles(true);
        }

        if (rawCats) {
          try {
            const parsed = JSON.parse(rawCats) as string[];
            if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
          } catch (e) {
            console.warn('Failed to parse cached categories', e);
          }
        }
      } catch (e) {
        console.warn('Failed to read cached startup data', e);
        setIsLoadingArticles(true);
      }

      // Defer category refresh and other background network work until after initial interactions
      InteractionManager.runAfterInteractions(() => {
        (async () => {
          try {
            const svc = await getFirebaseNewsService();
            const fresh = await svc.getCategories();
            if (Array.isArray(fresh) && fresh.length > 0) {
              setCategories(fresh);
              try { await AsyncStorage.setItem('ya_cached_categories', JSON.stringify(fresh)); } catch (e) { /* non-fatal */ }
            }
          } catch (err) {
            // ignore background failure
          }
        })();
      });
    })();

    const setupFirebaseSubscription = () => {
      // Subscribe to backend for real-time updates (fresh fetch already done above)
    (async () => {
      try {
        const svc = await getFirebaseNewsService();
        console.log('� Setting up real-time subscription for ongoing updates...');
        
        unsubscribe = svc.subscribeToArticles((articles: NewsArticle[]) => {
        console.log('🔄 Real-time subscription received articles:', articles.length);
        setIsLoadingArticles(false);

        // Note: Notifications are now handled by AdminPanel when articles are added
        // No need to send notifications here as they're sent immediately when created
        
        setNewsData(articles);
        setLastArticleCount(articles.length);
        
        // Apply current filter when new articles arrive
        if (selectedCategory) {
          const filtered = articles.filter(article => article.category === selectedCategory);
          setFilteredNews(filtered);
        } else {
          setFilteredNews(articles);
        }
        console.log('✅ Articles updated in state via subscription, filtered applied');
        
        // Notify parent that articles are available. Defer until after UI work completes
        try {
          if (!articlesReadyCalled.current && typeof onArticlesReady === 'function') {
            InteractionManager.runAfterInteractions(() => {
              try {
                if (!articlesReadyCalled.current) {
                  onArticlesReady();
                  articlesReadyCalled.current = true;
                }
              } catch (er) {
                // ignore
              }
            });
          }
        } catch (e) {
          // ignore
        }
        // persist latest articles for faster startup next time (fire-and-forget)
        AsyncStorage.setItem('ya_cached_articles', JSON.stringify(articles)).catch(() => {});
        });
      } catch (e) {
        console.warn('Failed to initialize articles subscription', e);
      }
    })();
    };

    // Auto-refresh function
      const autoRefresh = () => {
        setAutoRefreshing(true);
        // Re-fetch articles (background) using lazy-loaded service
        (async () => {
          try {
            const svc = await getFirebaseNewsService();
            const articles = await svc.getArticles();
            setNewsData(articles);
            applyFilter(articles, selectedCategory);
            setAutoRefreshing(false);
            AsyncStorage.setItem('ya_cached_articles', JSON.stringify(articles)).catch(() => {});
          } catch (error: any) {
            setAutoRefreshing(false);
            if (error && (error.code === 'network-request-failed' || error.code === 'unavailable')) {
              Alert.alert('Connection Error', 'Unable to refresh articles. Please check your internet connection.');
            }
          }
        })();
      };

    // Initialize Firebase notifications (deferred until after initial interactions so startup is snappier)
    InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          const svc = await createFirebaseNotificationService();
          // Clear any existing handlers before initializing to prevent duplicates
          await svc.clearAllNotificationHandlers();
          await svc.initialize();
          console.log('✅ Firebase notification service initialized with cleanup');
        } catch (e) {
          console.warn('Deferred notification initialization failed', e);
        }
      })();
    });

    // Ensure we explicitly request Android notification permission shortly after
    // startup while the app is in foreground. This helps ensure the OS dialog
    // is shown (some devices suppress a prompt if requested too early).
    try {
      if (Platform.OS === 'android') {
        setTimeout(() => {
          (async () => {
              try {
                // Test notification status after initialization
                const svc = await createFirebaseNotificationService();
                await svc.testNotificationStatus();
                logger.debug('Firebase notification status tested');
              } catch (e) {
                console.warn('Firebase notification test failed', e);
              }
          })();
        }, 1200);
      }
    } catch (e) {
      // ignore
    }
  // Dev test notification removed in public build
    
    // Setup Firebase subscription after initial UI work completes to avoid
    // blocking the first frame on subscription initialization.
    InteractionManager.runAfterInteractions(() => {
      try {
        setupFirebaseSubscription();
      } catch (e) {
        console.warn('Failed to setup Firebase subscription after interactions', e);
      }
    });

  // Setup auto-refresh interval after initial interactions so startup is not blocked
  InteractionManager.runAfterInteractions(() => {
    refreshInterval = setInterval(autoRefresh, 60000);
  });

    // Cleanup subscription on unmount
    return () => {
  try { sub.remove(); } catch(_) {}
      if (unsubscribe) {
        unsubscribe();
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      // Unsubscribe from auth state listener if provided
      if (typeof authUnsub === 'function') {
        try {
          authUnsub();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []); // Removed problematic dependencies that were causing subscription resets

  // Handle screen dimension changes for responsive design
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ screen }) => {
      setScreenData(screen);
    });

    return () => subscription?.remove();
  }, []);

  // 🚀 Smart Image Prefetching - Prefetch upcoming articles when user scrolls
  useEffect(() => {
    if (filteredNews.length > 0 && currentIndex >= 0) {
      const cacheWarmer = ImageCacheWarmer.getInstance();
      // Smart prefetch based on current scroll position
      cacheWarmer.smartPrefetch(filteredNews, currentIndex);
    }
  }, [currentIndex, filteredNews]);

  // Reset current index when filtered news changes
  useEffect(() => {
    if (filteredNews.length > 0 && currentIndex >= filteredNews.length) {
      setCurrentIndex(0);
    }
  }, [filteredNews.length, currentIndex]);

  // Initialize filtered news with initial data
  useEffect(() => {
    if (filteredNews.length === 0 && newsData.length > 0) {
      setFilteredNews(newsData);
    }
  }, [newsData]);

  // Subscribe to audio playback state so UI can reflect play/stop per article
  useEffect(() => {
    const unsub = audioService.onPlaybackStateChange((s) => {
      try {
        setPlaybackStateLocal(s);
      } catch (e) {
        console.warn('Playback state listener error', e);
      }
    });
    return () => unsub();
  }, []);

  // TTS cleanup when component unmounts
  useEffect(() => {
    // Set up TTS state change callback
    ttsService.setOnStateChange((isPlaying, isPaused) => {
      if (!isPlaying) {
        // TTS finished or stopped
        setReadingArticleId(null);
        setIsPaused(false);
      }
    });

    return () => {
      ttsService.stop();
      setReadingArticleId(null);
      setIsPaused(false);
    };
  }, []);

  // Load user profile when currentUser changes
  useEffect(() => {
    const loadUserProfile = async () => {
      if (currentUser && currentUser.uid) {
        try {
          const profile = await authService.getUserProfile(currentUser.uid);
          setUserProfile(profile);
          logger.info('✅ User profile loaded:', profile);
        } catch (error) {
          console.error('❌ Error loading user profile:', error);
          setUserProfile(null);
          // Only show alert for critical profile loading errors
          Alert.alert('Profile Error', 'Unable to load your profile. Some features may be limited.');
        }
      } else {
        setUserProfile(null);
      }
    };

    loadUserProfile();
  }, [currentUser]);

  // Apply category filter - memoized for stability
  const applyFilter = React.useCallback((articles: NewsArticle[], category: string | null) => {
    if (category) {
      const filtered = articles.filter(article => article.category === category);
      setFilteredNews(filtered);
    } else {
      setFilteredNews(articles);
    }
  }, []);

  // Handle category selection - memoized
  const handleCategorySelect = React.useCallback((category: string | null) => {
    setSelectedCategory(category);
    applyFilter(newsData, category);
    setCurrentIndex(0);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [newsData, applyFilter]);

  // Pull to refresh - memoized
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    console.log('🔄 Manual refresh: Fetching fresh articles...');
    try {
      const svc = await getFirebaseNewsService();
      const articles = await svc.getArticles();
      console.log('✅ Manual refresh: Fresh articles loaded:', articles.length);
      
      setNewsData(articles);
      setLastArticleCount(articles.length);
      
      // Apply current filter when refreshing
      if (selectedCategory) {
        const filtered = articles.filter((article: NewsArticle) => article.category === selectedCategory);
        setFilteredNews(filtered);
      } else {
        setFilteredNews(articles);
      }
      
      // Cache the refreshed articles
      AsyncStorage.setItem('ya_cached_articles', JSON.stringify(articles)).catch(() => {});
      console.log('✅ Manual refresh: Articles updated in state, filter applied');
      
    } catch (error) {
      console.error('Error refreshing articles:', error);
      Alert.alert('Error', 'Failed to refresh articles');
    }
    setRefreshing(false);
  }, [selectedCategory]); // Removed applyFilter dependency to prevent stale closures

  // Navigate to specific article by ID (used when notification is tapped)
  const navigateToArticle = (articleId: string | number) => {
    try {
      console.log('📍 Attempting to navigate to article ID:', articleId);
      
      // Ensure we have articles loaded
      if (!filteredNews || filteredNews.length === 0) {
        console.warn('⚠️ No articles loaded yet, cannot navigate');
        return;
      }

      // Find the article index in the current filtered news array
      const articleIndex = filteredNews.findIndex(article => article.id.toString() === articleId.toString());
      
      if (articleIndex !== -1) {
        console.log('📍 Found article at index:', articleIndex, 'in filtered list');
        
        // Update the current index
        setCurrentIndex(articleIndex);
        
        // Scroll to the article with a small delay to ensure the state is updated
        setTimeout(() => {
          if (scrollViewRef.current && filteredNews.length > articleIndex) {
            try {
              scrollViewRef.current.scrollToIndex({ 
                index: articleIndex, 
                animated: true,
                viewPosition: 0.5 // Center the article on screen
              });
              console.log('✅ Successfully scrolled to article');
            } catch (scrollError) {
              console.warn('⚠️ ScrollToIndex failed, using offset fallback:', scrollError);
              // Fallback to offset-based scrolling
              const offset = articleIndex * (screenData.height - headerHeight);
              scrollViewRef.current.scrollToOffset({ offset, animated: true });
            }
          }
        }, 150);
        
      } else {
        console.warn('⚠️ Article not found in current filtered list, searching in all articles');
        // If article is not in the current filtered list, reset filter and try again
        setSelectedCategory(null); // Clear category filter
        
        // Wait for filter to reset and try again with all articles
        setTimeout(() => {
          const allArticlesIndex = newsData.findIndex(article => article.id.toString() === articleId.toString());
          if (allArticlesIndex !== -1) {
            console.log('📍 Found article at index:', allArticlesIndex, 'in all articles');
            setCurrentIndex(allArticlesIndex);
            
            setTimeout(() => {
              if (scrollViewRef.current && newsData.length > allArticlesIndex) {
                try {
                  scrollViewRef.current.scrollToIndex({ 
                    index: allArticlesIndex, 
                    animated: true,
                    viewPosition: 0.5
                  });
                  console.log('✅ Successfully scrolled to article in all articles');
                } catch (scrollError) {
                  console.warn('⚠️ ScrollToIndex failed for all articles, using offset:', scrollError);
                  const offset = allArticlesIndex * (screenData.height - headerHeight);
                  scrollViewRef.current.scrollToOffset({ offset, animated: true });
                }
              }
            }, 100);
          } else {
            console.error('❌ Article not found in any list:', articleId);
          }
        }, 400); // Give time for filter to reset
      }
    } catch (error) {
      console.error('❌ Error navigating to article:', error);
    }
  };

  // Admin authentication - Check if current user is admin using Firebase profile
  const checkAdminAccess = (): boolean => {
    return userProfile ? authService.isAdminUser(userProfile) : false;
  };

  const handleAdminAccess = () => {
    if (userProfile && authService.isAdminUser(userProfile)) {
      setAdminVisible(true);
    } else {
      Alert.alert(
        'Admin Access Required',
        'You need admin privileges to access the admin panel. Please contact support if you believe this is an error.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAdminLogout = () => {
    setAdminVisible(false);
  };

  const toggleBookmark = (id: number) => {
    // Optimistic UI update: update state immediately for snappy feedback.
    const article = newsData.find(item => item.id === id);
    const uid = userProfile?.uid ?? null;

    setBookmarkedItems(prev => {
      const exists = prev.some(i => String(i) === String(id));
      if (exists) {
        return prev.filter(i => String(i) !== String(id));
      } else {
        return Array.from(new Set([...prev, id]));
      }
    });

    // Persist change in background.
    (async () => {
      try {
        if (uid) {
          // call server toggle; we don't rely on its return for immediate UI state
          await userService.toggleBookmark(uid, id, article ?? undefined);
        } else {
          // anonymous: persist locally (normalize to strings to avoid type mismatch)
          try {
            const stored = await AsyncStorage.getItem('ya_bookmarks');
            const arr = stored ? (JSON.parse(stored) as (string | number)[]) : [];
            const strArr = arr.map(a => String(a));
            const idStr = String(id);
            const exists = strArr.includes(idStr);
            const next = exists ? strArr.filter(i => i !== idStr) : [...strArr, idStr];
            await AsyncStorage.setItem('ya_bookmarks', JSON.stringify(next));
            logger.debug('\u{1F4BE} Persisted local bookmarks:', next);
          } catch (e) {
            console.warn('Could not persist bookmarks locally', e);
          }
        }
      } catch (error) {
        console.error('Error toggling bookmark persistence (background):', error);
        // rollback optimistic update on failure
        setBookmarkedItems(prev => {
          const exists = prev.some(i => String(i) === String(id));
          if (exists) {
            return prev.filter(i => String(i) !== String(id));
          } else {
            return Array.from(new Set([...prev, id]));
          }
        });
        // Inform user only for persistent failures
        Alert.alert('Error', 'Unable to update bookmark. Please try again.');
      }
    })();
  };

  // Load persisted bookmarks: prefer Firebase for authenticated users, fallback to AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        // Determine best available UID: userProfile -> auth currentUser -> persisted uid
        let uidToUse: string | null = null;
        if (userProfile && userProfile.uid) {
          uidToUse = userProfile.uid;
        } else {
          const current = authService.getCurrentUser();
          if (current && current.uid) {
            uidToUse = current.uid;
            // try to populate userProfile for consistent behavior
            try {
              const prof = await authService.getUserProfile(current.uid);
              setUserProfile(prof);
            } catch (e) {
              // non-fatal
            }
          } else {
            const persisted = await authService.getPersistedUserUid();
            if (persisted) uidToUse = persisted;
          }
        }

        if (uidToUse) {
          logger.debug('Loading bookmarks for uid:', uidToUse);
          let bookmarks = await userService.getUserBookmarks(uidToUse);
          logger.debug('Retrieved bookmarks from server:', bookmarks.length);
          // fallback: if no bookmarks in collection, check user profile bookmarks array
            if (bookmarks.length === 0) {
            const profileBookmarks = await userService.getUserProfileBookmarks(uidToUse);
            if (profileBookmarks && profileBookmarks.length > 0) {
              logger.debug('Fallback to profile bookmarks:', profileBookmarks.length);
              bookmarks = profileBookmarks.map(b => ({ articleId: b } as any));
            }
          }
          const ids = bookmarks.map(b => {
            const aid = b.articleId as any;
            const n = Number(aid);
            return Number.isFinite(n) ? n : aid;
          });
          logger.debug('Bookmark ids loaded:', ids);
          setBookmarkedItems(ids);

          // Merge local AsyncStorage bookmarks into Firestore (if any)
          try {
            const rawLocal = await AsyncStorage.getItem('ya_bookmarks');
            if (rawLocal) {
              const localIds = JSON.parse(rawLocal) as (string | number)[];
              const serverSet = new Set(ids.map(i => String(i)));
              const toAdd = localIds.filter(li => !serverSet.has(String(li)));
        if (toAdd.length > 0) {
        logger.info('Merging local bookmarks into server:', toAdd);
                for (const aid of toAdd) {
                  try {
                    await userService.addBookmark(uidToUse, aid);
          logger.debug('Merged local bookmark to server:', aid);
                  } catch (e) {
                    console.warn('Failed to merge bookmark', aid, e);
                  }
                }
                const refreshed = await userService.getUserBookmarks(uidToUse);
                const refreshedIds = refreshed.map(b => {
                  const a = b.articleId as any;
                  const n = Number(a);
                  return Number.isFinite(n) ? n : a;
                });
                setBookmarkedItems(refreshedIds);
              }
              await AsyncStorage.removeItem('ya_bookmarks');
            }
          } catch (e) {
            console.warn('Error merging local bookmarks into Firestore', e);
          }
        } else {
          // no uid, fall back to local - normalize stored strings to numbers when possible
          const raw = await AsyncStorage.getItem('ya_bookmarks');
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as string[];
              const normalized = parsed.map(p => {
                const n = Number(p);
                return Number.isFinite(n) ? n : p;
              });
              setBookmarkedItems(normalized);
              logger.debug('\u{1F50D} Loaded local bookmarks (normalized):', normalized);
            } catch (e) {
              console.warn('Failed to parse local bookmarks', e);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load persisted bookmarks', error);
      }
    })();
  }, [userProfile]);

  // Derive bookmarked full article objects for Sidebar - handle id type mismatches
  useEffect(() => {
    try {
      if (!newsData || newsData.length === 0 || !bookmarkedItems || bookmarkedItems.length === 0) {
        setBookmarkedArticlesList([]);
        return;
      }

      const idsSet = new Set(bookmarkedItems.map(i => (typeof i === 'string' ? i : i)));

      const matched: NewsArticle[] = newsData.filter(article => {
        const aid = (article.id as any);
        // match flexible: number vs string
        return idsSet.has(aid) || idsSet.has(String(aid)) || idsSet.has(Number(aid));
      });

      setBookmarkedArticlesList(matched);
    } catch (e) {
      console.warn('Error deriving bookmarked articles list', e);
      setBookmarkedArticlesList([]);
    }
  }, [newsData, bookmarkedItems]);

  const shareArticle = useCallback(async (article: NewsArticle) => {
    try {
      await Share.share({
        message: `${article.headline}\n\n${article.description}\n\nShared via YuvaUpdate`,
        title: article.headline,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share article');
    }
  }, []);

  const playAudio = useCallback(async (article: NewsArticle) => {
    try {
      await audioService.playArticleAudio(article);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Audio Error', 'Unable to play article audio.');
    }
  }, []);

  const toggleReadAloud = useCallback(async (article: NewsArticle) => {
    try {
      const articleId = String(article.id);
      
      if (readingArticleId === articleId) {
        // If currently reading this article, stop it
        ttsService.stop();
        setReadingArticleId(null);
        setIsPaused(false);
      } else {
        // Stop any current reading and start new one
        ttsService.stop();
        setReadingArticleId(articleId);
        setIsPaused(false);
        
        await ttsService.readArticle(article.headline, article.description || '');
      }
    } catch (error) {
      console.error('Error with TTS:', error);
      setReadingArticleId(null);
      setIsPaused(false);
      Alert.alert('TTS Error', 'Unable to read article aloud.');
    }
  }, [readingArticleId, ttsService]);

  const handleAddNews = async (newArticle: Omit<NewsArticle, 'id' | 'timestamp'>): Promise<string | void> => {
  logger.info('🔄 Starting to add article:', newArticle);
  logger.debug('🔄 Platform:', Platform.OS);
  logger.debug('User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');

    try {
      const svc = await getFirebaseNewsService();
      const docId = await svc.addArticle(newArticle);
  logger.info('✅ Article added to Firebase with ID:', docId);
      Alert.alert('Success', 'News article added successfully!');
      return docId;
    } catch (error: any) {
      console.error('❌ Detailed Error adding article:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Platform:', Platform.OS);

      let errorMessage = 'Failed to add article';

      // Platform-specific error handling
      if (Platform.OS === 'web') {
        errorMessage += '\n\n🌐 Web Platform Issue:';
        if (error.code === 'permission-denied') {
          errorMessage += '\n• Check Firestore rules';
          errorMessage += '\n• Verify web domain in Firebase settings';
        } else if (error.message?.includes('CORS')) {
          errorMessage += '\n• CORS policy blocking request';
          errorMessage += '\n• Check Firebase domain configuration';
        } else if (error.message?.includes('network')) {
          errorMessage += '\n• Network connectivity issue';
          errorMessage += '\n• Check internet connection';
        }
        errorMessage += '\n\n💡 Try opening browser console (F12) for more details';
      } else {
        errorMessage += '\n\n📱 Mobile Platform Issue:';
        if (error.code) {
          errorMessage += `\nError: ${error.code}`;
        }
      }

      if (error.message) {
        errorMessage += `\nDetails: ${error.message}`;
      }

      Alert.alert('Error', errorMessage);
      throw error;
    }
  };

  const handleBulkAddNews = async (articles: NewsArticle[]): Promise<void> => {
    // Add multiple articles to Firebase
    try {
      const svc = await getFirebaseNewsService();
      await Promise.all(
        articles.map(article => 
          svc.addArticle({
            headline: article.headline,
            description: article.description,
            image: article.image,
            category: article.category,
            readTime: article.readTime
          })
        )
      );
  logger.info('✅ Bulk articles added to Firebase');
      Alert.alert('Success', `${articles.length} articles added successfully!`);
    } catch (error: any) {
      console.error('❌ Error adding bulk articles:', error);
      Alert.alert('Error', 'Failed to add some articles');
      throw error;
    }
  };

  const handleArticlePress = (article: NewsArticle) => {
    const urlCandidates = [
      // common fields used across the app
      (article as any).sourceUrl,
      (article as any).url,
      (article as any).source?.url,
      article.image,
    ].filter(Boolean) as string[];

    const tryOpen = (url?: string) => {
      if (!url) return false;
      try {
        if (!/^https?:\/\//i.test(url)) return false;
        // use the in-app browser
        showInApp(url);
        return true;
      } catch (e) {
        console.warn('Failed to open URL', url, e);
      }
      return false;
    };

    // try each candidate until one opens (synchronously-returning); this avoids
    // awaiting canOpenURL/openURL which can introduce perceptible delay on some devices.
    for (const u of urlCandidates) {
      if (tryOpen(u)) return;
    }

    // fallback: inform user there's no external link
    Alert.alert('No external link', 'This article does not have an external link to open.');
  };

  const getDomainFromUrl = (url?: string) => {
    try {
      if (!url) return '';
      const u = new URL(url);
      return u.hostname.replace('www.', '');
    } catch (e) {
      return '';
    }
  };

  // Scroll feed to top and reset index
  const scrollToTop = () => {
    console.log('🚀 scrollToTop button pressed');
    try {
      if (scrollViewRef.current) {
        console.log('📜 FlatList ref found, scrolling to top...');
        scrollViewRef.current.scrollToOffset({ offset: 0, animated: true });
        console.log('✅ Scroll command sent successfully');
      } else {
        console.warn('❌ scrollViewRef.current is null');
      }
      setCurrentIndex(0);
      console.log('🔄 Current index reset to 0');
    } catch (e) {
      console.error('❌ scrollToTop failed:', e);
    }
  };

  // Ultra-optimized scroll handlers with throttling
  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const screenHeight = memoizedScreenData.height - headerHeight;
    const newIndex = Math.round(scrollY / screenHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < filteredNews.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, filteredNews.length, memoizedScreenData.height, headerHeight]);

  const handleMomentumScrollEnd = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const screenHeight = memoizedScreenData.height - headerHeight;
    const newIndex = Math.round(scrollY / screenHeight);
    const finalIndex = Math.max(0, Math.min(newIndex, filteredNews.length - 1));
    setCurrentIndex(finalIndex);
  }, [filteredNews.length, memoizedScreenData.height, headerHeight]);

  // Ultra-optimized memoized news card component
  const MemoizedNewsCard = memo(({ article, index }: { article: NewsArticle; index: number }) => {
    const descLines = responsiveLines(memoizedScreenData.height, 12, 8);
    const descLineHeight = 22;
    const desiredDescHeight = descLines * descLineHeight + 8;
    const descMaxHeight = Math.round(Math.max((memoizedScreenData.height - headerHeight) * 0.45, desiredDescHeight));
    const isBookmarked = bookmarkedItems.some(i => String(i) === String(article.id));
    
    const formatDate = useCallback((ts: string) => {
      try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return ts;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      } catch (e) {
        return ts;
      }
    }, []);

    const darkTextShadow = useMemo(() => 
      isDarkMode
        ? ({
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 3,
            textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
          } as any)
        : ({} as any),
      [isDarkMode]
    );

    return renderNewsCard(article, index);
  }, (prevProps, nextProps) => {
    return (
      prevProps.article.id === nextProps.article.id &&
      prevProps.index === nextProps.index
    );
  });

  const renderNewsCard = useCallback((article: NewsArticle, index: number) => {

  // Responsive limits for description and controls
  // Allow more lines to accommodate ~100-word summaries on larger screens without breaking layout
  const descLines = responsiveLines(screenData.height, 12, 8);
  // Compute a safe max height for the description: use the container ratio
  // but ensure it's at least large enough for descLines * lineHeight (+ padding)
  const descLineHeight = 22; // matches styles.reelsDescription.lineHeight
  const desiredDescHeight = descLines * descLineHeight + 8; // small padding to avoid clipping
  // Increase the fraction used for description height so summaries have more room
  const descMaxHeight = Math.round(Math.max((screenData.height - headerHeight) * 0.45, desiredDescHeight));
  const isBookmarked = bookmarkedItems.some(i => String(i) === String(article.id));
  // Format timestamp as dd/mm/yyyy where possible
  const formatDate = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch (e) {
      return ts;
    }
  };
    // conditional shadow styles: only apply when in dark mode
    const darkTextShadow = isDarkMode
      ? ({
          textShadowColor: 'rgba(0,0,0,0.8)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 3,
          // include web-friendly CSS shadow as well (cast to any to avoid TS complaints)
          textShadow: '1px 1px 3px rgba(0,0,0,0.8)'
        } as any)
      : ({} as any);
    
    return (
      <View key={article.id} style={[
        styles.cardContainer, 
        { 
          backgroundColor: currentTheme.surface,
          height: screenData.height - headerHeight // Full screen height for reels-style
        }
      ]}>
        {/* Full-screen Reels-style Layout */}
        <View style={styles.reelsCard}>
          {/* Large Background Image */}
          <View style={[
            styles.fullImageContainer, 
            ImageAlignmentHelper.getContainerAlignmentStyles(),
            { 
              height: Math.min(Math.round(screenData.height * 0.28), 220), 
              minHeight: 140, 
              flex: 0, 
              backgroundColor: '#eeeeee' 
            }
          ]}>
            {article.mediaType === 'youtube' && article.youtubeUrl ? (
              <YouTubePlayer
                youtubeUrl={article.youtubeUrl}
                thumbnailImage={article.image}
                style={[
                  styles.fullScreenImage,
                  ImageAlignmentHelper.getImageAlignmentStyles(),
                  { minHeight: 300 }
                ]}
              />
            ) : article.image && (article.image.includes('.mp4') || article.image.includes('.webm')) ? (
              <VideoPlayerComponent
                videoUrl={article.image}
                style={styles.fullScreenImage}
                showControls={true}
                autoPlay={false}
              />
            ) : (
              <OptimizedImage 
                source={{ uri: article.image || 'https://picsum.photos/400/300?random=5' }} 
                style={[
                  styles.fullScreenImage, 
                  ImageAlignmentHelper.getImageAlignmentStyles(),
                  { minHeight: 120 }
                ]} 
                resizeMode="cover"
                onError={(error) => logger.debug('Image loading error:', error)}
                onLoad={() => logger.debug('Image loaded successfully:', article.image)}
                fadeDuration={100}
                progressiveRenderingEnabled={true}
              />
            )}
            
            {/* Emoji action buttons over the image (bottom-right) - single-colored, professional glyphs */}
            <View style={styles.reelsEmojiContainerImage} pointerEvents="box-none">
              <FastTouchable 
                onPress={() => shareArticle(article)} 
                style={[styles.reelsEmojiButton, { backgroundColor: currentTheme.accent }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.reelsEmojiText, { color: '#fff' }]}>↗</Text>
              </FastTouchable>
              {SHOW_BOOKMARKS && (
              <FastTouchable 
                onPress={() => toggleBookmark(article.id as number)} 
                style={[styles.reelsEmojiButton, { backgroundColor: currentTheme.accent }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.reelsEmojiText, { color: '#fff' }]}>{bookmarkedItems.some(i => String(i) === String(article.id)) ? '★' : '☆'}</Text>
              </FastTouchable>
              )}
              {/* TTS Read-aloud button */}
              <FastTouchable 
                onPress={() => toggleReadAloud(article)} 
                style={[styles.reelsEmojiButton, { 
                  backgroundColor: readingArticleId === String(article.id)
                    ? '#FF6B6B' 
                    : currentTheme.accent 
                }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.reelsEmojiText, { color: '#fff' }]}>
                  {readingArticleId === String(article.id) ? '⏹️' : '🔊'}
                </Text>
              </FastTouchable>
            </View>
            {/* Date overlay on image */}
            <View style={styles.reelsDateBadge} pointerEvents="none">
              <Text style={styles.reelsDateText}>{formatDate(article.timestamp)}</Text>
              {article.source ? (
                <Text style={styles.reelsSourceText}>{article.source}</Text>
              ) : (
                <Text style={styles.reelsSourceText}>{getDomainFromUrl(article.sourceUrl)}</Text>
              )}
            </View>
            {/* Category Badge */}
            <View style={styles.reelsCategoryBadge}>
              <Text style={styles.reelsCategoryText}>{article.category}</Text>
            </View>
            
            {/* Video Badge for videos and YouTube */}
            {(article.mediaType === 'video' || article.mediaType === 'youtube') && (
              <View style={styles.reelsVideoBadge}>
                <Text style={styles.reelsVideoBadgeText}>
                  {article.mediaType === 'youtube' ? 'YOUTUBE' : 'VIDEO'}
                </Text>
              </View>
            )}
          </View>

          {/* Content section below image */}
          <View style={[styles.contentContainer, { backgroundColor: currentTheme.surface }]}>
            <FastTouchable 
              onPress={() => handleArticlePress(article)}
              style={styles.contentTouchArea}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {/* Headline */}
              <Text 
                style={[styles.reelsHeadline, darkTextShadow, { color: currentTheme.text }]} 
                numberOfLines={2}
                maxFontSizeMultiplier={1.2}
                allowFontScaling={false}
              >
                {article.headline}
              </Text>
              
              {/* Short summary: boxed, responsive and truncated to reasonable lines */}
              <View style={[styles.reelsDescriptionBox, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)' }]}>
                <Text 
                  style={[styles.reelsDescription, darkTextShadow, { color: currentTheme.subText, fontSize: scaleFont(14), lineHeight: 20 }]}
                  numberOfLines={15}
                  maxFontSizeMultiplier={1.2}
                  allowFontScaling={false}
                >
                  {article.description || 'No description available.'}
                </Text>
              </View>
              
              {/* Meta info - read time and date */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: 10,
                paddingHorizontal: 4
              }}>
                <View>
                  {article.readTime && (
                    <Text 
                      style={[styles.reelsMetaText, { color: currentTheme.subText, fontSize: 12 }]}
                      maxFontSizeMultiplier={1.2}
                      allowFontScaling={false}
                    >
                      {article.readTime}
                    </Text>
                  )}
                </View>
                <View>
                  <Text 
                    style={[styles.reelsMetaText, { color: currentTheme.subText, fontSize: 12 }]}
                    maxFontSizeMultiplier={1.2}
                    allowFontScaling={false}
                  >
                    {formatDate(article.timestamp)}
                  </Text>
                </View>
              </View>
              
              {/* Tap button inline below meta */}
              <View style={{ width: '100%', marginTop: 10 }}>
                <View
                  style={[
                    styles.reelsTapButton,
                    { 
                      backgroundColor: isDarkMode ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.12)',
                      borderColor: isDarkMode ? 'rgba(37,99,235,0.4)' : 'rgba(37,99,235,0.25)',
                      borderWidth: 1,
                      elevation: 3,
                      shadowColor: '#000',
                      shadowOpacity: 0.15,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 3,
                      minHeight: 42,
                      paddingVertical: 10
                    }
                  ]}
                >
                  <Text 
                    style={[styles.reelsTapText, { color: currentTheme.text, fontSize: 14, fontWeight: '600' }]}
                    maxFontSizeMultiplier={1.2}
                    allowFontScaling={false}
                  >
                    Tap to know more
                  </Text>
                  <Text 
                    style={[styles.reelsTapIcon, { color: currentTheme.text, fontSize: 15 }]}
                    maxFontSizeMultiplier={1.2}
                    allowFontScaling={false}
                  >
                    →
                  </Text>
                </View>
              </View>
            </FastTouchable>
          </View>
        {/* Floating 'Top' button shown on cards at index >= 3 */}
        {index >= 3 && (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              // move to bottom-left of the card to avoid the bottom-centered Tap button
              left: 12,
              // position above the bottom tap button area
              bottom: Math.max(12, insets.bottom + 72),
              // ensure it sits above other overlays
              zIndex: 120,
              alignItems: 'center'
            }}
          >
            {/* Small up button only (action buttons exist over the image) */}
            <FastTouchable
              onPress={scrollToTop}
              accessibilityLabel="Scroll to top"
              activeOpacity={0.7}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDarkMode ? '#ffffff' : currentTheme.accent,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isDarkMode ? (currentTheme.accent + '22') : (currentTheme.accent + '00'),
                elevation: 8,
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4
              }}
            >
              <Text 
                style={{ color: isDarkMode ? currentTheme.accent : '#fff', fontSize: 14, fontWeight: '700' }}
                maxFontSizeMultiplier={1.2}
                allowFontScaling={false}
              >
                ▲
              </Text>
            </FastTouchable>
          </View>
        )}
        </View>
      </View>

    );
  }, [currentTheme, isDarkMode, bookmarkedItems, screenData.height, headerHeight, responsiveLines, toggleBookmark, shareArticle, handleArticlePress, getDomainFromUrl]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={currentTheme.headerBg}
        translucent={false}
      />
      {/* Onboarding modal shown once after install */}
      <OnboardingCards visible={showOnboarding} onClose={async () => {
        setShowOnboarding(false);
        try { await AsyncStorage.setItem('ya_seen_onboarding_v1', '1'); } catch (e) { }
      }} />
      {/* Header */}
  {/* Respect the top safe area so header doesn't sit under the system status bar */}
  <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)} style={[styles.header, { backgroundColor: currentTheme.headerBg, borderBottomColor: currentTheme.border, paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          {/* Move menu button to the left of the logo */}
          {SHOW_SIDEBAR && (
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: currentTheme.accent, marginRight: 8 }]}
            onPress={() => setSidebarVisible(true)}
          >
            <Text style={[styles.menuButtonText, { color: '#FFFFFF' }]}>≡</Text>
          </TouchableOpacity>
          )}
          <View style={[styles.headerLogoWrap, { backgroundColor: isDarkMode ? '#ffffff' : 'transparent' }]}> 
            <Image source={require('./assets/favicon.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={[styles.headerTitle, { color: currentTheme.text, fontSize: 12 }]}>YuvaUpdate</Text>
        </View>
      {/* Show a small loader while articles are being fetched from Firebase */}
  {(showStartupSpinner || isLoadingArticles) && (
        <View style={{ padding: 12, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color={currentTheme.accent} />
        </View>
      )}
        <View style={styles.headerButtons}>
          <FastTouchable 
            style={[styles.themeButton, { backgroundColor: currentTheme.accent }]}
            onPress={toggleTheme}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={[styles.themeButtonText, { color: '#FFFFFF' }]}>{isDarkMode ? '☀' : '☽'}</Text>
          </FastTouchable>
          {/* Admin Button - Only visible for admin users and when included in this build */}
          {INCLUDE_ADMIN_PANEL && userProfile && authService.isAdminUser(userProfile) && (
            <FastTouchable 
              style={[styles.adminButton, { backgroundColor: currentTheme.accent }]}
              onPress={handleAdminAccess}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Text style={[styles.adminButtonText, { color: '#FFFFFF' }]}> 
                Admin
              </Text>
            </FastTouchable>
          )}
          {/* Logout button removed as requested */}
        </View>
      </View>

      {/* Ultra-High-Performance FlatList Feed */}
      <FlatList
        ref={scrollViewRef}
        data={filteredNews}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => renderNewsCard(item, index)}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        pagingEnabled={true}
        snapToInterval={screenData.height - headerHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        removeClippedSubviews={true}
        maxToRenderPerBatch={1}
        updateCellsBatchingPeriod={25}
        windowSize={2}
        initialNumToRender={1}
        disableIntervalMomentum={true}
        disableScrollViewPanResponder={false}
        getItemLayout={(data, index) => ({
          length: screenData.height - headerHeight,
          offset: (screenData.height - headerHeight) * index,
          index,
        })}
        scrollEventThrottle={8}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentTheme.accent}
            colors={[currentTheme.accent]}
            progressBackgroundColor={currentTheme.surface}
          />
        }
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollToIndexFailed={(info) => {
          // Handle scroll to index failure gracefully
          console.warn('📱 ScrollToIndex failed:', info);
          // Fallback: scroll to offset instead
          if (scrollViewRef.current) {
            const offset = info.index * (screenData.height - headerHeight);
            scrollViewRef.current.scrollToOffset({ offset, animated: true });
          }
        }}
        ListEmptyComponent={
          isLoadingArticles ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <View style={[styles.emptyContainer, { height: screenData.height - headerHeight }]}> 
              <Text style={[styles.emptyText, { color: currentTheme.text }]}>
                {selectedCategory ? `No articles found in "${selectedCategory}" category` : 'No articles available'}
              </Text>
              <Text style={[styles.emptySubtext, { color: currentTheme.subText }]}>
                Pull down to refresh or check your internet connection
              </Text>
            </View>
          )
        }
      />

  {/* Page Indicator removed per request */}

  {/* Category Filter Indicator removed per UX request - selection still filters articles but no overlay stripe is shown */}

      {/* Bottom Navigation Hint - Hidden as requested */}
      {/* 
      <View style={styles.bottomHint}>
        <Text style={styles.hintText}>Swipe up for next story</Text>
      </View>
      */}

      {/* Sidebar */}
  {SHOW_SIDEBAR && (
  <Sidebar
    visible={sidebarVisible}
    onClose={() => setSidebarVisible(false)}
    isDarkMode={isDarkMode}
  />
  )}

      {/* Admin Login Modal */}
      {/* Admin Panel Modal - only included in admin-enabled builds */}
      {INCLUDE_ADMIN_PANEL && (
        <AdminPanel
          visible={adminVisible}
          onClose={() => setAdminVisible(false)}
          onAddNews={handleAddNews}
          onBulkAddNews={handleBulkAddNews}
          onLogout={handleAdminLogout}
          currentUser={userProfile}
        />
      )}

      {/* Auth Screen Modal for login/register when not authenticated */}
      <Modal
        visible={authVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAuthVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ flex: 1 }}>
            <AuthScreen
              mode={authMode}
              onAuthSuccess={async () => {
                try {
                  const uid = await authService.getPersistedUserUid();
                  if (uid) {
                    const profile = await authService.getUserProfile(uid);
                    setUserProfile(profile);
                  }
                  setAuthVisible(false);
                } catch (e) {
                  console.warn('After auth success, failed to load profile', e);
                }
              }}
              onSwitchMode={(m) => setAuthMode(m)}
            />
          </View>
        </View>
      </Modal>

  {/* Article Detail Modal removed: articles now open external links to preserve simple cards and scrolling behaviour */}
      <InAppBrowserHost />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    margin: 0,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  paddingHorizontal: 12,
  paddingTop: 8,
  paddingBottom: 8,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
  fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerLogo: {
  width: 18,
  height: 18,
  borderRadius: 4,
  },
  headerLogoWrap: {
    padding: 4,
    borderRadius: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtons: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  flex: 0,
  justifyContent: 'flex-end',
  },
  themeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  themeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  adminButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  adminButtonText: {
    color: '#ffffff', // Keep white text for contrast on accent background
    fontSize: 12,
    fontWeight: '600',
  },
  headerLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  },
  autoRefreshIndicator: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    marginTop: 2,
  },
  autoRefreshText: {
    fontSize: 8,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  scrollContainer: {
    flex: 1,
  marginTop: 0,
  paddingTop: 0,
    width: '100%',
    overflow: 'hidden',
  },
  cardContainer: {
  marginBottom: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 0,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  // clip children to the card bounds so per-card controls (Tap / Top)
  // do not bleed into neighboring cards while paging
  overflow: 'hidden',
  },
  imageContainer: {
    height: '40%', // Medium size - reduced from 45% to 40%
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  newsImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  contentContainer: {
    height: '68%', // Increased to accommodate longer description and button
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 12,
    justifyContent: 'flex-start',
    minHeight: 320,
    maxHeight: '68%',
  },
  articleContentTouch: {
    flex: 1,
  },
  headline: {
  fontSize: 20,
  fontWeight: '700',
  marginBottom: 10,
  lineHeight: 28,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    opacity: 0.85,
    marginBottom: 12, // Increased from 8 to 12
  },
  reelsDescriptionBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
  // allow the text to flow naturally; previously this hid overflowing lines
  // which could cause the system to ellipsize text in some layouts
  overflow: 'visible',
  },
  readMoreButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
  paddingVertical: 8,
  paddingBottom: 12, // small buffer so last text line isn't visually clipped
    marginTop: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  // New Compact Professional Layout Styles
  newsCard: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  newsRow: {
    flexDirection: 'row',
    flex: 1,
  },
  smallImageContainer: {
    width: 120,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    position: 'relative',
  },
  smallNewsImage: {
    width: '100%',
    height: '100%',
  },
  smallVideoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  smallVideoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallVideoPlayButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  smallVideoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smallVideoBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  smallCategoryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smallCategoryText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  newsContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  newsContentTouch: {
    flex: 1,
  },
  compactHeadline: {
  fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 24,
    marginBottom: 8,
  },
  compactDescription: {
  fontSize: 13,
  lineHeight: 18,
    marginBottom: 8,
    opacity: 0.8,
  },
  compactMetaContainer: {
    marginTop: 4,
  },
  compactMetaText: {
    fontSize: 12,
    opacity: 0.6,
  },
  tapToKnowMoreContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  tapToKnowMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 25,
    minWidth: 200,
  },
  tapToKnowMoreText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  tapToKnowMoreIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  metaContainer: {
    marginVertical: 10,
  },
  metaText: {
    fontSize: 11, // Reduced from 12 to 11
    opacity: 0.6, // Made more subtle
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fixedActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    minWidth: 100,
    alignItems: 'center',
    minHeight: 48, // Increased touch target for better mobile experience
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  pageIndicator: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -50 }],
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  bottomHint: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionButtonActive: {
    backgroundColor: '#667eea',
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  newBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Emoji buttons anchored to image bottom-right to save space
  reelsEmojiContainer: {
  position: 'absolute',
  right: 8,
  bottom: 8,
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-end',
  zIndex: 30,
  elevation: 8,
  gap: 6,
  },
  reelsEmojiButton: {
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.15,
  shadowRadius: 3,
  elevation: 4,
  marginLeft: 6,
  },
  reelsEmojiText: {
  fontSize: 14,
  lineHeight: 16,
  },
  reelsEmojiContainerImage: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    zIndex: 30,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 6,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.90)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  videoBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  videoContainer: {
    position: 'relative',
  },
  modalVideoContainer: {
    position: 'relative',
  },
  modalVideoBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalVideoBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 5,
    width: 30,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: 300,
    marginBottom: 16,
  },
  modalCategoryBadge: {
    position: 'absolute',
    top: 270,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  modalCategoryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalArticleContent: {
    padding: 20,
  },
  modalHeadline: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 32,
    marginBottom: 10,
  },
  modalMetaContainer: {
    marginBottom: 20,
  },
  modalMetaText: {
    fontSize: 14,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  modalActionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 15,
  },
  modalActionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Floating Action Buttons Styles
  floatingActionsContainer: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -80 }],
    zIndex: 10,
    gap: 15,
  },
  floatingActionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 8,
  },
  // New reels action row
  reelsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    // reduce the top padding so actions sit closer to the content and
    // leave space for the pinned Tap button below
    paddingTop: 12,
  },
  actionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPillText: {
    fontSize: 14,
    fontWeight: '600',
  },

  reelsTapButton: {
  // inline button - placed after description so it doesn't overlap
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 12,
  borderWidth: 1,
  alignSelf: 'stretch',
  width: '100%',
  marginTop: 8,
  // keep elevated look when needed
  },
  reelsTapText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  reelsTapIcon: {
    fontSize: 16,
    fontWeight: '700'
  },
  // Small variants for compact display
  reelsTapButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 140,
  },
  reelsTapTextSmall: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  reelsTapIconSmall: {
    fontSize: 14,
    fontWeight: '700'
  },
  floatingActionIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Admin Login Modal Styles
  adminLoginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  adminLoginContent: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    width: '80%',
    maxWidth: 300,
  },
  adminLoginTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  adminPasswordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  adminLoginButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  adminLoginButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  adminLoginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminCancelButton: {
    backgroundColor: '#666',
  },
  // Menu Button Styles
  menuButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  menuButtonText: {
  color: '#ffffff',
  fontSize: 16,
    fontWeight: 'bold',
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Category Indicator Styles
  categoryIndicator: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  categoryIndicatorText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryIndicatorClose: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    paddingLeft: 10,
  },
  // Video Play Button Styles
  videoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 64,
    height: 64,
    borderRadius: 12,
    transform: [{ translateX: -32 }, { translateY: -32 }],
    zIndex: 2,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  videoPlayButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  // Full-screen Reels Layout Styles
  reelsCard: {
    flex: 1,
    position: 'relative',
  },
  fullImageContainer: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullScreenImage: {
    borderRadius: 12,
    alignSelf: 'center',
  },
  reelsCategoryBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reelsCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  reelsDateBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 35,
    alignItems: 'flex-start',
    maxWidth: '64%',
  },
  reelsDateText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  reelsSourceText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
    maxWidth: '100%',
  },
  reelsVideoBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reelsVideoBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    paddingBottom: 30,
  },
  contentTouchArea: {
  // Compact padding for inline button layout
  paddingBottom: 4,
  flex: 1,
  },
  reelsHeadline: {
  fontSize: 18,
  fontWeight: '700',
  lineHeight: 24,
  marginBottom: 6,
  },
  reelsDescription: {
  fontSize: 15,
  lineHeight: 22,
  marginBottom: 6,
  },
  reelsMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reelsMetaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reelsMetaLeft: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  reelsMetaRight: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  reelsMetaDate: {
    fontSize: 12,
    opacity: 0.85,
  },
  reelsMetaPinned: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  paddingHorizontal: 20,
  // Increase right padding so the floating 'Top' button doesn't overlap the
  // posted date/meta on smaller screens. Keep a comfortable gap for touch.
  paddingRight: 120, // leave more room for floating top button on the right
  zIndex: 60, // raise above floating elements so meta remains visible
  elevation: 12,
  },
  // (reelsTapButton/reelsTapText/reelsTapIcon defined earlier — duplicates removed)
});
