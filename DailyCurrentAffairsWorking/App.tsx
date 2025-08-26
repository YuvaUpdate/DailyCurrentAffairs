import React, { useState, useRef, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Alert,
  TextInput,
  Share,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SafeAreaView,
  StatusBar,
  Linking,
  Modal,
} from 'react-native';
import FastTouchable from './FastTouchable';
import AdminPanel from './AdminPanel';
import Sidebar from './Sidebar';
import VideoPlayerComponent from './VideoPlayerComponent';
import { NewsArticle } from './types';
import { firebaseNewsService } from './FirebaseNewsService';
import { notificationService } from './NotificationService';
import { ArticleActions } from './ArticleActions';
import { authService, UserProfile } from './AuthService';
import { userService } from './UserService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthScreen } from './AuthScreen';
import { audioService } from './AudioService';
import OnboardingCards from './OnboardingCards';
import { scaleFont, responsiveLines } from './utils/responsive';
import { LoadingSpinner } from './LoadingSpinner';

const { height, width } = Dimensions.get('screen');

interface AppProps {
  currentUser?: any;
  // Called once when articles have been loaded (from cache or network)
  onArticlesReady?: () => void;
}

export default function App(props: AppProps) {
  const { currentUser, onArticlesReady } = props;
  const insets = useSafeAreaInsets();
  // Theme state - Default to dark mode
  const [isDarkMode, setIsDarkMode] = useState(true);
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

  const currentTheme = isDarkMode ? theme.dark : theme.light;

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
  // Show onboarding modal on first install only
  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem('ya_seen_onboarding_v1');
        if (!seen) setShowOnboarding(true);
      } catch (e) {
        // ignore
      }
    })();
  }, []);
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>(newsData); // Initialize with newsData
  const [refreshing, setRefreshing] = useState(false);
  const [lastArticleCount, setLastArticleCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [playbackStateLocal, setPlaybackStateLocal] = useState(audioService.getPlaybackState());
  // Ensure we only call the onArticlesReady callback once
  const articlesReadyCalled = React.useRef(false);

  // Firebase real-time subscription with auto-refresh
  useEffect(() => {
    // On mount: subscribe to Firebase auth state so we rely on the native SDK
    // persistence rather than a separate AsyncStorage flag. This avoids the
    // APK always asking for login after restart if the SDK already has a
    // persisted session.
    let authUnsub: (() => void) | null = null;
    try {
      authUnsub = authService.onAuthStateChanged(async (user) => {
        try {
          console.log('🔐 auth state changed handler called - user:', user ? user.uid : null);
          // Debug persisted AsyncStorage values as a diagnostic when running on device
          try {
            const persistedUid = await AsyncStorage.getItem('ya_user_uid');
            const loggedFlag = await AsyncStorage.getItem('ya_logged_in');
            console.log('🔐 persisted ya_user_uid:', persistedUid, 'ya_logged_in:', loggedFlag);
          } catch (e) {
            console.warn('🔐 Failed to read persisted login keys', e);
          }
          if (user) {
            // Load profile from Firestore and persist uid locally as a fallback
            const profile = await authService.getUserProfile(user.uid);
            setUserProfile(profile);
            setAuthVisible(false);
            try {
              await AsyncStorage.setItem('ya_logged_in', 'true');
              await AsyncStorage.setItem('ya_user_uid', user.uid);
            } catch (e) {
              console.warn('Could not persist login flag to AsyncStorage', e);
            }
          } else {
            // No user signed in - do not force showing auth modal here; app runs in guest mode
            setUserProfile(null);
            setAuthVisible(false);
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
        } catch (err) {
          console.warn('Fallback persisted login check failed', err);
          setAuthVisible(false);
        }
      })();
    }

  let unsubscribe: (() => void) | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;

    // Try to load cached articles immediately so app can render quickly.
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('ya_cached_articles');
        if (raw) {
          const cached = JSON.parse(raw) as NewsArticle[];
          if (Array.isArray(cached) && cached.length > 0) {
            setNewsData(cached);
            setLastArticleCount(cached.length);
            applyFilter(cached, selectedCategory);
              setIsLoadingArticles(false);
              // Notify parent that articles are available (call only if provided)
              try {
                if (!articlesReadyCalled.current && typeof onArticlesReady === 'function') {
                  // Ensure React has finished rendering and interactions are complete
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
            console.log('✅ Loaded cached articles:', cached.length);
          } else {
            // no cache contents
            setIsLoadingArticles(true);
          }
        } else {
          setIsLoadingArticles(true);
        }
      } catch (e) {
        console.warn('Failed to read cached articles', e);
        setIsLoadingArticles(true);
      }
      // Also try to load cached categories for faster sidebar open
      (async () => {
        try {
          const rawCats = await AsyncStorage.getItem('ya_cached_categories');
          if (rawCats) {
            const parsed = JSON.parse(rawCats) as string[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCategories(parsed);
            }
          }
        } catch (err) {
          console.warn('Failed to read cached categories', err);
        }

        // Kick off a background refresh of categories
        try {
          const fresh = await firebaseNewsService.getCategories();
          if (Array.isArray(fresh) && fresh.length > 0) {
            setCategories(fresh);
            try {
              await AsyncStorage.setItem('ya_cached_categories', JSON.stringify(fresh));
            } catch (e) {
              console.warn('Failed to cache fresh categories', e);
            }
          }
        } catch (err) {
          console.warn('Failed to refresh categories in background', err);
        }
      })();
    })();

    const setupFirebaseSubscription = () => {
      // Subscribe to backend and update cache when new articles arrive.
    unsubscribe = firebaseNewsService.subscribeToArticles((articles: NewsArticle[]) => {
        console.log('📡 Received articles from Firebase:', articles.length);
        setIsLoadingArticles(false);

        // Check for new articles and send notifications
        if (articles.length > lastArticleCount && lastArticleCount > 0) {
          const newArticles = articles.slice(0, articles.length - lastArticleCount);
          newArticles.forEach((article: NewsArticle) => {
            notificationService.sendNewArticleNotification(article);
          });
        }

        setNewsData(articles);
        setLastArticleCount(articles.length);
        applyFilter(articles, selectedCategory);
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
        // persist latest articles for faster startup next time
        try {
          AsyncStorage.setItem('ya_cached_articles', JSON.stringify(articles));
        } catch (e) {
          console.warn('Failed to cache articles', e);
        }
      });
    };

    // Auto-refresh function
    const autoRefresh = () => {
      console.log('🔄 Auto-refreshing articles...');
      setAutoRefreshing(true);
      
      // Re-fetch articles every 10 seconds
      firebaseNewsService.getArticles().then((articles) => {
        console.log('🔄 Auto-refresh: Received', articles.length, 'articles');
        setNewsData(articles);
        applyFilter(articles, selectedCategory);
        setAutoRefreshing(false);
        try {
          AsyncStorage.setItem('ya_cached_articles', JSON.stringify(articles));
        } catch (e) {
          console.warn('Failed to cache articles (auto-refresh)', e);
        }
      }).catch((error) => {
        console.error('🔄 Auto-refresh error:', error);
        setAutoRefreshing(false);
        // Show error to user only if it's a network or significant error
        if (error.code === 'network-request-failed' || error.code === 'unavailable') {
          Alert.alert('Connection Error', 'Unable to refresh articles. Please check your internet connection.');
        }
      });
    };

    // Initialize notifications
    notificationService.initialize();
    
    // Setup Firebase subscription
    setupFirebaseSubscription();

  // Setup auto-refresh interval. Increased to 60 seconds to reduce frequent background work
  // which can cause jank on lower-end devices. This keeps content reasonably fresh while
  // improving responsiveness for user interactions.
  refreshInterval = setInterval(autoRefresh, 60000);

    // Cleanup subscription on unmount
    return () => {
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
  }, [lastArticleCount, selectedCategory]);

  // Handle screen dimension changes for responsive design
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ screen }) => {
      setScreenData(screen);
    });

    return () => subscription?.remove();
  }, []);

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

  // Load user profile when currentUser changes
  useEffect(() => {
    const loadUserProfile = async () => {
      if (currentUser && currentUser.uid) {
        try {
          const profile = await authService.getUserProfile(currentUser.uid);
          setUserProfile(profile);
          console.log('✅ User profile loaded:', profile);
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

  // Apply category filter
  const applyFilter = (articles: NewsArticle[], category: string | null) => {
    if (category) {
      const filtered = articles.filter(article => article.category === category);
      setFilteredNews(filtered);
    } else {
      setFilteredNews(articles);
    }
  };

  // Handle category selection
  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    applyFilter(newsData, category);
    setCurrentIndex(0);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const articles = await firebaseNewsService.getArticles();
      setNewsData(articles);
      applyFilter(articles, selectedCategory);
      console.log('🔄 Refreshed articles:', articles.length);
    } catch (error) {
      console.error('Error refreshing articles:', error);
      Alert.alert('Error', 'Failed to refresh articles');
    }
    setRefreshing(false);
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
          // anonymous: persist locally
          try {
            const stored = await AsyncStorage.getItem('ya_bookmarks');
            const arr = stored ? (JSON.parse(stored) as (string | number)[]) : [];
            const exists = arr.some(i => String(i) === String(id));
            const next = exists ? arr.filter(i => String(i) !== String(id)) : [...arr, id];
            await AsyncStorage.setItem('ya_bookmarks', JSON.stringify(next));
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
          console.log('Loading bookmarks for uid:', uidToUse);
          let bookmarks = await userService.getUserBookmarks(uidToUse);
          console.log('Retrieved bookmarks from server:', bookmarks.length);
          // fallback: if no bookmarks in collection, check user profile bookmarks array
          if (bookmarks.length === 0) {
            const profileBookmarks = await userService.getUserProfileBookmarks(uidToUse);
            if (profileBookmarks && profileBookmarks.length > 0) {
              console.log('Fallback to profile bookmarks:', profileBookmarks.length);
              bookmarks = profileBookmarks.map(b => ({ articleId: b } as any));
            }
          }
          const ids = bookmarks.map(b => {
            const aid = b.articleId as any;
            const n = Number(aid);
            return Number.isFinite(n) ? n : aid;
          });
          console.log('Bookmark ids loaded:', ids);
          setBookmarkedItems(ids);

          // Merge local AsyncStorage bookmarks into Firestore (if any)
          try {
            const rawLocal = await AsyncStorage.getItem('ya_bookmarks');
            if (rawLocal) {
              const localIds = JSON.parse(rawLocal) as (string | number)[];
              const serverSet = new Set(ids.map(i => String(i)));
              const toAdd = localIds.filter(li => !serverSet.has(String(li)));
              if (toAdd.length > 0) {
                console.log('Merging local bookmarks into server:', toAdd);
                for (const aid of toAdd) {
                  try {
                    await userService.addBookmark(uidToUse, aid);
                    console.log('Merged local bookmark to server:', aid);
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
          // no uid, fall back to local
          const raw = await AsyncStorage.getItem('ya_bookmarks');
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as (string | number)[];
              setBookmarkedItems(parsed);
              console.log('Loaded local bookmarks:', parsed);
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

  const shareArticle = async (article: NewsArticle) => {
    try {
      await Share.share({
        message: `${article.headline}\n\n${article.description}\n\nShared via YuvaUpdate`,
        title: article.headline,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share article');
    }
  };

  const playAudio = async (article: NewsArticle) => {
    try {
      await audioService.playArticleAudio(article);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Audio Error', 'Unable to play article audio.');
    }
  };

  const toggleReadAloud = async (article: NewsArticle) => {
    try {
      const state = audioService.getPlaybackState();
      const sameArticlePlaying = state.isPlaying && state.currentArticle && state.currentArticle.id === article.id;

      if (sameArticlePlaying) {
        await audioService.stopAudio();
        return;
      }

      // If another article is playing, stop then play the requested one
      if (state.isPlaying || state.isPaused) {
        await audioService.stopAudio();
      }
      await audioService.playArticleAudio(article);
    } catch (error) {
      console.error('Error toggling read aloud:', error);
      const message = (error && (error as any).message) || String(error);
      if (message.includes('Speech functionality is not available')) {
        Alert.alert('Audio Not Available', 'Text-to-speech is not included in this APK. Please install and configure expo-speech and rebuild the app.');
      } else {
        Alert.alert('Audio Error', 'Unable to toggle read aloud.');
      }
    }
  };

  const handleAddNews = async (newArticle: Omit<NewsArticle, 'id' | 'timestamp'>): Promise<string | void> => {
    console.log('🔄 Starting to add article:', newArticle);
    console.log('🔄 Platform:', Platform.OS);
    console.log('User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');

    try {
      const docId = await firebaseNewsService.addArticle(newArticle);
      console.log('✅ Article added to Firebase with ID:', docId);
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
      await Promise.all(
        articles.map(article => 
          firebaseNewsService.addArticle({
            headline: article.headline,
            description: article.description,
            image: article.image,
            category: article.category,
            readTime: article.readTime
          })
        )
      );
      console.log('✅ Bulk articles added to Firebase');
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

    const tryOpen = async (url?: string) => {
      if (!url) return false;
      try {
        // Basic validation
        if (!/^https?:\/\//i.test(url)) return false;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return true;
        }
      } catch (e) {
        console.warn('Failed to open URL', url, e);
      }
      return false;
    };

    // try each candidate until one opens
    (async () => {
      for (const u of urlCandidates) {
        // try to open and stop on first success
        // eslint-disable-next-line no-await-in-loop
        if (await tryOpen(u)) return;
      }

      // fallback: inform user there's no external link
      Alert.alert('No external link', 'This article does not have an external link to open.');
    })();
  };

  // Scroll feed to top and reset index
  const scrollToTop = () => {
    try {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
      setCurrentIndex(0);
    } catch (e) {
      console.warn('scrollToTop failed', e);
    }
  };

  const renderNewsCard = (article: NewsArticle, index: number) => {

  // Responsive limits for description and controls
  const descLines = responsiveLines(screenData.height, 10, 7);
  // Compute a safe max height for the description: use the container ratio
  // but ensure it's at least large enough for descLines * lineHeight (+ padding)
  const descLineHeight = 22; // matches styles.reelsDescription.lineHeight
  const desiredDescHeight = descLines * descLineHeight + 8; // small padding to avoid clipping
  const descMaxHeight = Math.round(Math.max((screenData.height - headerHeight) * 0.38, desiredDescHeight));
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
          <View style={[styles.fullImageContainer, { height: Math.min(Math.round(screenData.height * 0.28), 220), minHeight: 140, flex: 0, backgroundColor: '#eeeeee' }]}>
            {article.mediaType === 'video' ? (
              <VideoPlayerComponent
                videoUrl={article.image}
                style={styles.fullScreenImage}
                showControls={true}
                autoPlay={false}
              />
            ) : (
              <Image 
                source={{ uri: article.image || 'https://via.placeholder.com/400x300?text=No+Image' }} 
                style={[styles.fullScreenImage, { minHeight: 120 }]} 
                resizeMode="cover"
                onError={(error) => console.log('Image loading error:', error)}
                onLoad={() => console.log('Image loaded successfully:', article.image)}
              />
            )}
            
            {/* Emoji action buttons over the image (bottom-right) - single-colored, professional glyphs */}
            <View style={styles.reelsEmojiContainerImage} pointerEvents="box-none">
              <FastTouchable onPress={() => shareArticle(article)} style={[styles.reelsEmojiButton, { backgroundColor: currentTheme.accent }] }>
                <Text style={[styles.reelsEmojiText, { color: '#fff' }]}>↗</Text>
              </FastTouchable>
              <FastTouchable onPress={() => toggleBookmark(article.id as number)} style={[styles.reelsEmojiButton, { backgroundColor: currentTheme.accent }] }>
                <Text style={[styles.reelsEmojiText, { color: '#fff' }]}>{bookmarkedItems.some(i => String(i) === String(article.id)) ? '★' : '☆'}</Text>
              </FastTouchable>
              <FastTouchable onPress={() => toggleReadAloud(article)} style={[styles.reelsEmojiButton, { backgroundColor: currentTheme.accent }] }>
                <Text style={[styles.reelsEmojiText, { color: '#fff' }]}>{(playbackStateLocal.isPlaying && playbackStateLocal.currentArticle && playbackStateLocal.currentArticle.id === article.id) ? 'Ⅱ' : '♪'}</Text>
              </FastTouchable>
            </View>
            {/* Category Badge */}
            <View style={styles.reelsCategoryBadge}>
              <Text style={styles.reelsCategoryText}>{article.category}</Text>
            </View>
            
            {/* Video Badge for videos */}
            {article.mediaType === 'video' && (
              <View style={styles.reelsVideoBadge}>
                <Text style={styles.reelsVideoBadgeText}>VIDEO</Text>
              </View>
            )}
          </View>

          {/* Content section below image */}
          <View style={[styles.contentContainer, { backgroundColor: currentTheme.surface }]}>
            <FastTouchable 
              onPress={() => handleArticlePress(article)}
              style={styles.contentTouchArea}
            >
              {/* Headline */}
              <Text style={[styles.reelsHeadline, darkTextShadow, { color: currentTheme.text }]} numberOfLines={2}>
                {article.headline}
              </Text>
              
              {/* Short summary: boxed, responsive and truncated to reasonable lines */}
              <View style={[styles.reelsDescriptionBox, { maxHeight: descMaxHeight, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.reelsDescription, darkTextShadow, { color: currentTheme.subText, fontSize: scaleFont(15), lineHeight: 22 }]} numberOfLines={descLines}>
                  {article.description}
                </Text>
              </View>
              
              {/* Tap button inline below description so it doesn't push the meta and keeps description visible */}
              <View style={{ width: '100%', marginTop: 6 }}>
                <FastTouchable
                  style={[
                    styles.reelsTapButton,
                    { backgroundColor: 'rgba(37,99,235,0.08)' }
                  ]}
                  onPress={() => handleArticlePress(article)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.reelsTapText, { color: currentTheme.text }]}>Tap to know more</Text>
                  <Text style={[styles.reelsTapIcon, { color: currentTheme.text }]}>→</Text>
                </FastTouchable>
              </View>
            </FastTouchable>

            {/* Action emoji buttons removed from content area - now rendered over the image to avoid overlap */}

              {/* Pinned meta (swapped) - read time left and posted date right */}
              <View style={[styles.reelsMetaPinned]}> 
                <View style={styles.reelsMetaLeft}>
                  {/* Move date to the left and format as dd/mm/yyyy, then show read time next to it */}
                  <Text style={[styles.reelsMetaText, darkTextShadow, { color: currentTheme.subText }]}> 
                    {formatDate(article.timestamp)}{article.readTime ? ` · ${article.readTime}` : ''}
                  </Text>
                </View>
                <View style={styles.reelsMetaRight}>
                  {/* intentionally left blank to avoid overlap with floating Top button */}
                </View>
              </View>
              {/* Tap button intentionally rendered inline above meta (moved into content area) */}
          </View>
        {/* Floating 'Top' button shown on cards at index >= 3 */}
        {index >= 3 && (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              zIndex: 40,
              alignItems: 'center'
            }}
          >
            {/* Small up button only (action buttons exist over the image) */}
            <FastTouchable
              onPress={scrollToTop}
              accessibilityLabel="Scroll to top"
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
              <Text style={{ color: isDarkMode ? currentTheme.accent : '#fff', fontSize: 14, fontWeight: '700' }}>▲</Text>
            </FastTouchable>
          </View>
        )}
        </View>
      </View>

    );
  };

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
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: currentTheme.accent, marginRight: 8 }]}
            onPress={() => setSidebarVisible(true)}
          >
            <Text style={[styles.menuButtonText, { color: '#FFFFFF' }]}>≡</Text>
          </TouchableOpacity>
          <View style={[styles.headerLogoWrap, { backgroundColor: isDarkMode ? '#ffffff' : 'transparent' }]}> 
            <Image source={require('./assets/favicon.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={[styles.headerTitle, { color: currentTheme.text, fontSize: 12 }]}>YuvaUpdate</Text>
        </View>
      {/* Show a small loader while articles are being fetched from Firebase */}
      {isLoadingArticles && (
        <View style={{ padding: 12, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color={currentTheme.accent} />
        </View>
      )}
        <View style={styles.headerButtons}>
          <FastTouchable 
            style={[styles.themeButton, { backgroundColor: currentTheme.accent }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Text style={[styles.themeButtonText, { color: '#FFFFFF' }]}>{isDarkMode ? '☀' : '☽'}</Text>
          </FastTouchable>
          {/* Admin Button - Only visible for admin users */}
          {userProfile && authService.isAdminUser(userProfile) && (
            <FastTouchable 
              style={[styles.adminButton, { backgroundColor: currentTheme.accent }]}
              onPress={handleAdminAccess}
            >
              <Text style={[styles.adminButtonText, { color: '#FFFFFF' }]}> 
                Admin
              </Text>
            </FastTouchable>
          )}
          {/* Logout button removed as requested */}
        </View>
      </View>

      {/* Instagram-like Vertical Scroll Feed */}
      {/* Full-screen initial loading overlay to avoid blank screen when app starts */}
      {isLoadingArticles && filteredNews.length === 0 && (
        <View style={{ position: 'absolute', zIndex: 9999, left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: currentTheme.background }}>
          <LoadingSpinner size="large" color={currentTheme.accent} message="Loading articles..." />
        </View>
      )}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        pagingEnabled={true}
  snapToInterval={screenData.height - headerHeight}
  snapToAlignment="start"
        decelerationRate="fast"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentTheme.accent}
            colors={[currentTheme.accent]}
          />
        }
        onScroll={(event) => {
          // Real-time scroll tracking for smoother dot updates
          const scrollY = event.nativeEvent.contentOffset.y;
          // Use the measured headerHeight so paging math stays consistent when header size changes
          const screenHeight = screenData.height - headerHeight;
          const newIndex = Math.round(scrollY / screenHeight);
          
          if (newIndex !== currentIndex && newIndex >= 0 && newIndex < filteredNews.length) {
            console.log(`Scroll: ${scrollY}px, Screen: ${screenHeight}px, Index: ${currentIndex} → ${newIndex}, Total: ${filteredNews.length}`);
            setCurrentIndex(newIndex);
          }
        }}
        onMomentumScrollEnd={(event) => {
          // Final scroll position tracking
          const scrollY = event.nativeEvent.contentOffset.y;
          // Use measured headerHeight here too so index calculations remain accurate
          const screenHeight = screenData.height - headerHeight;
          const newIndex = Math.round(scrollY / screenHeight);
          const finalIndex = Math.max(0, Math.min(newIndex, filteredNews.length - 1));
          console.log(`Scroll End: ${scrollY}px, Screen: ${screenHeight}px, Final Index: ${finalIndex}, Total: ${filteredNews.length}`);
          setCurrentIndex(finalIndex);
        }}
        scrollEventThrottle={16}
      >
        {filteredNews.length === 0 ? (
          isLoadingArticles ? (
            <View style={[styles.emptyContainer, { height: screenData.height - headerHeight, justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color={currentTheme.accent} />
              <Text style={[styles.emptyText, { color: currentTheme.text, marginTop: 12 }]}>Loading articles…</Text>
            </View>
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
        ) : (
          filteredNews.map((article, index) => renderNewsCard(article, index))
        )}
      </ScrollView>

  {/* Page Indicator removed per request */}

  {/* Category Filter Indicator removed per UX request - selection still filters articles but no overlay stripe is shown */}

      {/* Bottom Navigation Hint - Hidden as requested */}
      {/* 
      <View style={styles.bottomHint}>
        <Text style={styles.hintText}>Swipe up for next story</Text>
      </View>
      */}

      {/* Sidebar */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        bookmarkedArticles={bookmarkedArticlesList}
        onCategorySelect={handleCategorySelect}
        onArticleSelect={(article) => handleArticlePress(article)}
        selectedCategory={selectedCategory}
        isDarkMode={isDarkMode}
        currentUser={currentUser}
  // Provide already-loaded or cached categories for instant display
  preloadedCategories={categories}
      />

      {/* Admin Login Modal */}
      {/* Admin Panel Modal */}
      <AdminPanel
        visible={adminVisible}
        onClose={() => setAdminVisible(false)}
        onAddNews={handleAddNews}
        onBulkAddNews={handleBulkAddNews}
        onLogout={handleAdminLogout}
        currentUser={userProfile}
      />

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
    height: '55%', // Increased to accommodate read more button
    paddingHorizontal: 20,
  paddingVertical: 12,
  // leave extra bottom padding so absolutely positioned buttons
  // don't overlap text or get clipped visually
  paddingBottom: 72,
  justifyContent: 'space-between',
    flex: 1,
    minHeight: 240, // Increased for better spacing
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
    flex: 1,
    fontWeight: '400',
    opacity: 0.85,
    marginBottom: 12, // Increased from 8 to 12
  },
  reelsDescriptionBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
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
    width: '100%',
    height: '100%',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
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
  // leave ample bottom padding so long descriptions don't underlap
  // the pinned "Tap to know more" button which is absolutely positioned
  paddingBottom: 96,
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
    paddingRight: 80, // leave room for floating top button on the right
    zIndex: 22,
    elevation: 6,
  },
  // (reelsTapButton/reelsTapText/reelsTapIcon defined earlier — duplicates removed)
});
