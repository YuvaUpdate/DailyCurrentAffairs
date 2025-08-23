import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Share,
  Image,
  RefreshControl,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoView } from 'expo-video';
import AdminPanel from './AdminPanel';
import Sidebar from './Sidebar';
import VideoPlayerComponent from './VideoPlayerComponent';
import { NewsArticle } from './types';
import { firebaseNewsService } from './FirebaseNewsService';
import { notificationService } from './NotificationService';
import { ArticleActions } from './ArticleActions';
import { authService, UserProfile } from './AuthService';
import { LoadingSpinner } from './LoadingSpinner';
import { Toast } from './Toast';
import SwipeIndicator from './SwipeIndicator';
import ErrorBoundary from './ErrorBoundary';
import FloatingActionButton from './FloatingActionButton';
import { ArticleSkeleton } from './ArticleSkeleton';
import NewsFeed from './NewsFeed';

const { height, width } = Dimensions.get('screen');

interface AppProps {
  currentUser?: any;
  onLogout?: () => Promise<void>;
}

export default function App({ currentUser, onLogout }: AppProps) {
  // Theme state - Default to dark mode
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [screenData, setScreenData] = useState(Dimensions.get('screen'));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Debug logging for authentication state (guarded and size-limited)
  if (__DEV__) {
    try {
      console.log('[DEBUG] App - currentUser:', currentUser ? { uid: currentUser.uid, email: currentUser.email } : null);
      console.log('[DEBUG] App - userProfile:', userProfile ? { uid: (userProfile as any)?.uid, displayName: (userProfile as any)?.displayName } : null);
    } catch (e) {
      // Safe guard in case shape is unexpected
      console.log('[DEBUG] App - user info logging failed');
    }
  }
  
  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' | 'warning' });
  
  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Theme colors
  const theme = {
    light: {
      background: '#FFFFFF',
      surface: '#F8F9FA',
      text: '#1A1A1A',
      subText: '#6B7280',
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
      text: '#F8FAFC',
      subText: '#94A3B8',
  // Visible accent for dark mode (was black which made action text invisible)
  accent: '#2563EB',
  border: '#334155',
  headerBg: '#000000',
  buttonBg: '#000000',
  buttonText: '#FFFFFF',
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B'
    }
  };

  const currentTheme = isDarkMode ? theme.dark : theme.light;

  // Initial mock news data
  const [newsData, setNewsData] = useState<NewsArticle[]>([
    {
      id: "1",
      headline: "Breaking: Major Tech Breakthrough Announced",
      description: "Scientists have developed a revolutionary new technology that could change the way we interact with digital devices forever. This breakthrough promises to make technology more accessible and intuitive for users worldwide.",
      image: "https://via.placeholder.com/400x300/667eea/ffffff?text=Tech+News",
      category: "Technology",
      readTime: "2 min read",
      timestamp: "2 hours ago",
      sourceUrl: "https://techcrunch.com/tech-breakthrough"
    },
    {
      id: "2",
      headline: "Sports: Championship Finals This Weekend",
      description: "The most anticipated sporting event of the year is set to take place this weekend. Teams have been preparing for months, and fans are eagerly waiting for what promises to be an unforgettable match.",
      image: "https://via.placeholder.com/400x300/f093fb/ffffff?text=Sports+News",
      category: "Sports",
      readTime: "1 min read",
      timestamp: "4 hours ago",
      sourceUrl: "https://espn.com/championship-finals"
    },
    {
      id: "3",
      headline: "Business: Market Reaches All-Time High",
      description: "Stock markets around the world have reached unprecedented levels today, driven by positive economic indicators and investor confidence. Analysts are optimistic about continued growth in the coming quarters.",
      image: "https://via.placeholder.com/400x300/4ade80/ffffff?text=Business+News",
      category: "Business",
      readTime: "3 min read",
      timestamp: "6 hours ago",
      sourceUrl: "https://bloomberg.com/market-high"
    },
    {
      id: "4",
      headline: "Health: New Medical Discovery Shows Promise",
      description: "Researchers have made a significant breakthrough in medical science that could lead to better treatment options for millions of patients worldwide. Clinical trials are showing very promising results.",
      image: "https://via.placeholder.com/400x300/fb7185/ffffff?text=Health+News",
      category: "Health",
      readTime: "2 min read",
      timestamp: "8 hours ago",
      sourceUrl: "https://medicalnews.com/breakthrough"
    },
    {
      id: "5",
      headline: "Environment: Climate Action Summit Begins",
      description: "World leaders have gathered for the annual climate summit to discuss urgent environmental challenges and potential solutions. New commitments are expected to be announced throughout the week.",
      image: "https://via.placeholder.com/400x300/34d399/ffffff?text=Environment",
      category: "Environment",
      readTime: "4 min read",
      timestamp: "10 hours ago",
      sourceUrl: "https://climatenews.com/summit"
    }
  ]);

  const [bookmarkedItems, setBookmarkedItems] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [adminVisible, setAdminVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [articleModalVisible, setArticleModalVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryBarBottom, setCategoryBarBottom] = useState<number | null>(null);
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>(newsData); // Initialize with newsData
  const [refreshing, setRefreshing] = useState(false);
  const [lastArticleCount, setLastArticleCount] = useState(0);
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Enhanced UI state
  const [swipeIndicator, setSwipeIndicator] = useState({ visible: false, direction: 'up' as 'up' | 'down' });
  const [transitionDirection, setTransitionDirection] = useState<'up' | 'down' | 'none'>('none');
  const [error, setError] = useState<string | null>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [scrollTimer, setScrollTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollStartY, setScrollStartY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Bookmark persistence functions
  const saveBookmarks = async (bookmarks: string[]) => {
    try {
      await AsyncStorage.setItem('bookmarkedArticles', JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  };

  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem('bookmarkedArticles');
      if (saved) {
        const bookmarks = JSON.parse(saved);
        setBookmarkedItems(bookmarks);
  if (__DEV__) console.log('📚 Loaded bookmarks:', bookmarks.length);
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  // Load bookmarks on app start
  useEffect(() => {
    loadBookmarks();
  }, []);

  // Firebase real-time subscription with auto-refresh
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;

    const setupFirebaseSubscription = () => {
      try {
        unsubscribe = firebaseNewsService.subscribeToArticles((articles: NewsArticle[]) => {
          if (__DEV__) console.log('📡 Received articles from Firebase:', articles.length);
          
          // Clear any previous errors
          setError(null);
          
          // Check for new articles (notifications are sent centrally by FirebaseNewsService)
          if (articles.length > lastArticleCount && lastArticleCount > 0) {
            const newArticles = articles.slice(0, articles.length - lastArticleCount);
            if (__DEV__) console.log('🔔 New articles detected (notifications sent by FirebaseNewsService):', newArticles.map(a => a.id));
          }
          
          setNewsData(articles);
          setLastArticleCount(articles.length);
          applyFilter(articles, selectedCategory);
          
          // Hide initial loading after first data load
          if (isInitialLoading) {
            setIsInitialLoading(false);
          }
        });
      } catch (error) {
        console.error('[ERROR] Firebase setup error:', error);
        setError('Failed to connect to news service. Please try again.');
        setIsInitialLoading(false);
      }
    };

    // Auto-refresh function with enhanced error handling
    const autoRefresh = () => {
  if (__DEV__) console.log('🔄 Auto-refresh triggered');
      setAutoRefreshing(true);

      // Re-fetch articles (less frequent on-device to avoid JS work)
      firebaseNewsService.getArticles().then((articles) => {
  if (__DEV__) console.log('🔄 Auto-refresh: Received', articles.length, 'articles');

        // Lightweight change detection: compare lengths and edge ids only
        const hasChanges = articles.length !== newsData.length || (
          articles.length > 0 && newsData.length > 0 && (
            articles[0].id !== newsData[0].id ||
            articles[articles.length - 1].id !== newsData[newsData.length - 1].id
          )
        );

        if (hasChanges) {
          setNewsData(articles);
          applyFilter(articles, selectedCategory);
          if (__DEV__) console.log('📰 Articles updated with new content');
        }

        setAutoRefreshing(false);
        setError(null); // Clear any previous errors
      }).catch((error) => {
        console.error('🔄 Auto-refresh error:', error);
        setAutoRefreshing(false);

        // Show error to user only if it's a network or significant error
        if ((error as any)?.code === 'network-request-failed' || (error as any)?.code === 'unavailable') {
          setError('Connection lost. Trying to reconnect...');
          showToast('Connection issues detected', 'warning');
        } else {
          setError('Unable to refresh articles. Please try again.');
        }
      });
    };

    // Initialize notifications
    notificationService.initialize();
    
    // Setup Firebase subscription
    setupFirebaseSubscription();

  // Setup auto-refresh interval: 60s on-device to reduce JS work
  refreshInterval = setInterval(autoRefresh, 60000);

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (scrollTimer) {
        clearTimeout(scrollTimer);
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
    if (filteredNews.length > 0) {
      if (currentIndex >= filteredNews.length) {
        setCurrentIndex(0);
        // Ensure we scroll to the first article
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 0, animated: false });
          }
        }, 100);
      }
    }
  }, [filteredNews.length, currentIndex]);

  // Initialize filtered news with initial data
  useEffect(() => {
    if (filteredNews.length === 0 && newsData.length > 0) {
      setFilteredNews(newsData);
    }
  }, [newsData]);

  // Load user profile when currentUser changes
  useEffect(() => {
    const loadUserProfile = async () => {
      if (currentUser && currentUser.uid) {
        try {
          const profile = await authService.getUserProfile(currentUser.uid);
          setUserProfile(profile);
            if (__DEV__) console.log('[SUCCESS] User profile loaded:', profile);
        } catch (error) {
          console.error('[ERROR] Error loading user profile:', error);
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

  // Show toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ visible: true, message, type });
  };

  // Hide toast
  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  // Retry function for error boundary
  const handleRetry = () => {
    setError(null);
    setIsInitialLoading(true);
    
    // Retry Firebase connection
    firebaseNewsService.getArticles()
      .then((articles) => {
        setNewsData(articles);
        applyFilter(articles, selectedCategory);
        setIsInitialLoading(false);
        showToast('Successfully reconnected!', 'success');
      })
      .catch((error) => {
        console.error('Retry failed:', error);
        setError('Still unable to connect. Please check your internet and try again.');
        setIsInitialLoading(false);
      });
  };

  // Scroll to top function
  const scrollToTop = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
      setCurrentIndex(0);
      showToast('Scrolled to top!', 'info');
    }
  };

  // Navigate to specific article function with perfect alignment
  const scrollToArticle = (index: number) => {
    if (scrollViewRef.current && index >= 0 && index < filteredNews.length) {
      const articleHeight = screenData.height - 80;
      const targetY = index * articleHeight;
      scrollViewRef.current.scrollTo({ y: targetY, animated: true });
      setCurrentIndex(index);
    }
  };

  // Force snap to current or nearest article (utility function)
  const forceSnapToArticle = () => {
    if (scrollViewRef.current) {
      const articleHeight = screenData.height - 80;
      const targetY = currentIndex * articleHeight;
      scrollViewRef.current.scrollTo({ y: targetY, animated: true });
    }
  };

  // Enhanced snap function to prevent middle stops
  // Handle category selection
  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    applyFilter(newsData, category);
    setCurrentIndex(0);
    // Use the new scroll function for perfect alignment
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
  if (__DEV__) console.log('🔄 Refreshed articles:', articles.length);
      showToast('Articles refreshed successfully!', 'success');
    } catch (error) {
      console.error('Error refreshing articles:', error);
      showToast('Failed to refresh articles', 'error');
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

  const handleMainLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onLogout) {
                await onLogout();
                showToast('Logged out successfully', 'success');
              } else {
                showToast('Logout function not available', 'error');
              }
            } catch (error: any) {
              console.error('[ERROR] Main logout error:', error);
              showToast('Failed to logout', 'error');
            }
          }
        }
      ]
    );
  };

  const handleAdminLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
  if (__DEV__) console.log('[SUCCESS] Admin logout completed');
      } else {
        showToast('Logout function not available', 'error');
      }
    } catch (error: any) {
      console.error('[ERROR] Admin logout error:', error);
      showToast('Failed to logout', 'error');
    }
    setAdminVisible(false);
  };

  const toggleBookmark = (id: string | number) => {
    const key = String(id);
    const updatedBookmarks = bookmarkedItems.includes(key)
      ? bookmarkedItems.filter(item => item !== key)
      : [...bookmarkedItems, key];

    setBookmarkedItems(updatedBookmarks);
    saveBookmarks(updatedBookmarks); // Persist to storage

    const article = newsData.find(item => String(item.id) === key);
    if (article) {
      const isBookmarking = !bookmarkedItems.includes(key);
      showToast(
        isBookmarking
          ? `[SAVED] "${article.headline}" bookmarked!`
          : `[REMOVED] Bookmark removed`,
        isBookmarking ? 'success' : 'info'
      );
    }
  };

  const shareArticle = async (article: NewsArticle) => {
    try {
      await Share.share({
        message: `${article.headline}\n\n${article.description}\n\nShared via YuvaUpdate`,
        title: article.headline,
      });
      showToast('Article shared successfully! 📤', 'success');
    } catch (error) {
      showToast('Could not share article', 'error');
    }
  };

  const playAudio = (article: NewsArticle) => {
    Alert.alert(
      'Audio Mode', 
      `Now playing: "${article.headline}"\n\nText-to-speech functionality would read out the entire article here using expo-speech.\n\nFeatures:\n• Play/Pause controls\n• Adjustable speed\n• Background playback`,
      [
        { text: 'Stop', style: 'cancel' },
        { text: 'Play', style: 'default' }
      ]
    );
  };

  const handleAddNews = (newArticle: Omit<NewsArticle, 'id' | 'timestamp'>) => {
  if (__DEV__) console.log('🔄 Starting to add article:', newArticle);
  if (__DEV__) console.log('🔄 Platform:', Platform.OS);
  if (__DEV__) console.log('User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');
    
    // Return the promise so callers can await and handle errors
    return firebaseNewsService.addArticle(newArticle)
      .then((docId: string) => {
  if (__DEV__) console.log('[SUCCESS] Article added to Firebase with ID:', docId);
        showToast('📰 News article added successfully!', 'success');
        return docId;
      })
      .catch((error: any) => {
        console.error('[ERROR] Detailed Error adding article:', error);
        console.error('[ERROR] Error code:', error.code);
        console.error('[ERROR] Error message:', error.message);
        console.error('[ERROR] Error stack:', error.stack);
        console.error('[ERROR] Platform:', Platform.OS);

        // Re-throw so callers can react
        throw error;
      });
  };

  const handleBulkAddNews = (articles: NewsArticle[]) => {
    // Return the promise so callers can await completion
    return Promise.all(
      articles.map(article => 
        firebaseNewsService.addArticle({
          headline: article.headline,
          description: article.description,
          image: article.image,
          category: article.category,
          readTime: article.readTime,
          sourceUrl: article.sourceUrl
        })
      )
    ).then(() => {
  if (__DEV__) console.log('[SUCCESS] Bulk articles added to Firebase');
      showToast(`📚 ${articles.length} articles added successfully!`, 'success');
    }).catch((error: any) => {
      console.error('[ERROR] Error adding bulk articles:', error);
      showToast('Failed to add some articles', 'error');
      throw error;
    });
  };

  const openArticleModal = (article: NewsArticle) => {
    setSelectedArticle(article);
    setArticleModalVisible(true);
  };

  const closeArticleModal = () => {
    setArticleModalVisible(false);
    setSelectedArticle(null);
  };

  const renderNewsCard = (article: NewsArticle, index: number) => {
  const isBookmarked = bookmarkedItems.includes(String(article.id));
    const cardHeight = screenData.height - 80; // Account for status bar
    const imageHeight = cardHeight * 0.42; // 42% of screen height
    
    return (
      <View key={`${article.id}-${index}`} style={[styles.inshortsCard, { height: cardHeight }]}>
        {/* Main Card Container */}
        <View style={styles.inshortsCardContainer}>
          {/* Top Image Section */}
          <TouchableOpacity 
            style={[styles.inshortsImageContainer, { height: imageHeight }]}
            onPress={() => openArticleModal(article)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: article.image || 'https://via.placeholder.com/400x200?text=News' }}
              style={styles.cardImage}
              resizeMode="cover"
            />
            
            {/* Bookmark overlay removed from front page; saving is available inside article modal */}
          </TouchableOpacity>
          
          {/* Content Section */}
          <TouchableOpacity 
            style={styles.contentSection}
            onPress={() => openArticleModal(article)}
            activeOpacity={0.9}
          >
            {/* Headline */}
            <Text style={styles.inshortsHeadline} numberOfLines={2}>
              {article.headline}
            </Text>
            
            {/* Description */}
            <Text style={styles.inshortsDescription} numberOfLines={4}>
              {article.description || 'No description available.'}
            </Text>
            
            {/* Metadata Row */}
            <View style={styles.metadataRow}>
              <Text style={styles.metadataText}>
                {article.timestamp} • {article.readTime} • {article.category}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Share Icon */}
          <TouchableOpacity
            style={styles.shareIcon}
            onPress={() => shareArticle(article)}
            activeOpacity={0.7}
          >
            <Text style={styles.shareText}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // compute a responsive vertical offset for the floating category indicator
  const indicatorTop = Math.round(screenData.height * 0.13);

  return (
    <ErrorBoundary error={error} onRetry={handleRetry}>
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <StatusBar 
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={currentTheme.headerBg}
          translucent={false}
        />
        
        {/* Swipe Indicator */}
        <SwipeIndicator 
          visible={swipeIndicator.visible} 
          direction={swipeIndicator.direction} 
        />
      {/* Header */}
      <View style={[
        styles.header,
        {
          backgroundColor: currentTheme.headerBg,
          borderBottomColor: currentTheme.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 3,
        }
      ]}>
          <View style={styles.headerLeft}>
          <View style={styles.headerLogoContainer}>
            <Image source={require('./assets/yuvaupdate.png')} style={styles.headerLogo} accessibilityLabel="YuvaUpdate logo" />
          </View>
          <View style={[styles.headerPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}> 
            <Text style={[styles.headerPillText, { color: currentTheme.text }]}>YuvaUpdate</Text>
          </View>
          {/* Auto-refresh indicator - render only when active to avoid an empty blue pill */}
          {autoRefreshing && (
            <View style={styles.autoRefreshIndicator}>
              <LoadingSpinner size="small" color={currentTheme.text} />
            </View>
          )}
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: isDarkMode ? currentTheme.surface : currentTheme.accent, borderRadius: 10, paddingHorizontal: 12 }]}
            onPress={() => setSidebarVisible(true)}
          >
            <Text style={[styles.menuButtonText, { color: isDarkMode ? currentTheme.text : '#FFFFFF' }]}>≡</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.themeButton, { backgroundColor: currentTheme.surface, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: currentTheme.border }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Text style={[styles.themeButtonText, { color: currentTheme.text }]}>{isDarkMode ? '☀' : '☽'}</Text>
          </TouchableOpacity>
          {/* Logout Button - Always visible for authenticated users */}
          {currentUser && (
            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: '#dc2626', borderRadius: 10, paddingHorizontal: 14 }]}
              onPress={handleMainLogout}
            >
              <Text style={[styles.logoutButtonText, { color: '#FFFFFF', fontWeight: '700' }]}>Logout</Text>
            </TouchableOpacity>
          )}
          {/* Admin Button - Only visible for admin users */}
          {userProfile && authService.isAdminUser(userProfile) && (
            <TouchableOpacity 
              style={[styles.adminButton, { backgroundColor: isDarkMode ? currentTheme.surface : currentTheme.accent }]}
              onPress={handleAdminAccess}
            >
              <Text style={[styles.adminButtonText, { color: isDarkMode ? currentTheme.text : '#FFFFFF' }]}> 
                Admin
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Instagram Reels-like Feed - NEW IMPLEMENTATION */}
      <NewsFeed
        articles={filteredNews}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onBookmarkToggle={toggleBookmark}
        bookmarkedArticles={new Set(bookmarkedItems)}
  isDarkMode={isDarkMode}
  immersive={true}
  onCategoryBarLayout={({ y, height }) => {
    // compute bottom position of the bar (y is relative to the feed's root).
    // store it so the App can position the modal/pill directly below it.
    setCategoryBarBottom(y + height);
  }}
      />

  {/* Category indicator removed per user request */}

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
  bookmarkedArticles={newsData.filter(article => bookmarkedItems.includes(String(article.id)))}
        onCategorySelect={handleCategorySelect}
        onArticleSelect={(article) => {
          setSelectedArticle(article);
          setArticleModalVisible(true);
        }}
        selectedCategory={selectedCategory}
        isDarkMode={isDarkMode}
        currentUser={currentUser}
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

      {/* Article Detail Modal */}
      <Modal
        visible={articleModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeArticleModal}
        statusBarTranslucent={false}
        supportedOrientations={['portrait']}
        hardwareAccelerated={true}
        transparent={false}
      >
        <View style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <StatusBar 
              barStyle={isDarkMode ? "light-content" : "dark-content"}
              backgroundColor={currentTheme.headerBg}
              translucent={false}
            />
            {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: currentTheme.headerBg, borderBottomColor: currentTheme.border }]}>
            <TouchableOpacity onPress={closeArticleModal} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: currentTheme.text }]}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>Article Details</Text>
            <View style={{ width: 30 }} />
          </View>

          {/* Scrollable Content */}
          {selectedArticle && (
            <View style={{ flex: 1 }}>
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Article Image/Video */}
                {selectedArticle.mediaType === 'video' ? (
                  <View style={styles.modalVideoContainer}>
                    <VideoPlayerComponent
                      videoUrl={selectedArticle.image}
                      style={styles.modalImage}
                      showControls={true}
                      autoPlay={false}
                    />
                    <View style={styles.modalVideoBadge}>
                      <Text style={styles.modalVideoBadgeText}>Video Content</Text>
                    </View>
                  </View>
                ) : (
                  <Image 
                    source={{ uri: selectedArticle.image }} 
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                )}
                
                {/* Article Category */}
                <View style={[styles.modalCategoryBadge, { backgroundColor: currentTheme.accent }]}>
                  <Text style={styles.modalCategoryText}>{selectedArticle.category}</Text>
                </View>

                {/* Article Content */}
                <View style={styles.modalArticleContent}>
                  <Text style={[styles.modalHeadline, { color: currentTheme.text }]}>
                    {selectedArticle.headline}
                  </Text>
                  
                  <View style={styles.modalMetaContainer}>
                    <Text style={[styles.modalMetaText, { color: currentTheme.subText }]}>
                      {selectedArticle.readTime} • {selectedArticle.timestamp}
                    </Text>
                  </View>

                  <Text style={[styles.modalDescription, { color: currentTheme.text }]}>
                    {selectedArticle.description}
                  </Text>

                  {/* Add extra space at bottom so content doesn't get hidden behind fixed buttons */}
                  <View style={{ height: 100 }} />
                </View>
              </ScrollView>

              {/* Fixed Action Buttons at Bottom */}
              <View style={[styles.fixedActionContainer, { backgroundColor: currentTheme.background, borderTopColor: currentTheme.border }]}>
                <ArticleActions 
                  article={selectedArticle} 
                  isDarkMode={isDarkMode} 
                  currentTheme={currentTheme} 
                  currentUser={userProfile}
                />
              </View>
            </View>
          )}
          </SafeAreaView>
        </View>
      </Modal>
      
      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* Floating Action Button - Scroll to Top */}
      <FloatingActionButton
        onPress={scrollToTop}
        icon="↑"
        visible={showScrollToTop}
        backgroundColor={currentTheme.accent}
        bottom={120}
        right={20}
      />
    </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  backgroundColor: '#f5f5f5', // Light gray background for Inshorts style
    margin: 0,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
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
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain'
  },
  headerLogoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    marginRight: 8,
  },
  headerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'center',
    marginRight: 8,
  },
  headerPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  themeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 12,
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
  logoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  autoRefreshIndicator: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    marginLeft: 6,
    marginTop: 0,
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
    overflow: 'visible',
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
    justifyContent: 'space-between',
    flex: 1,
    minHeight: 240, // Increased for better spacing
  },
  articleContentTouch: {
    flex: 1,
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 34,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 16, // Increased from 15 to 16
    lineHeight: 24, // Increased from 22 to 24
    flex: 1,
    fontWeight: '400',
    opacity: 0.85,
    marginBottom: 12, // Increased from 8 to 12
  },
  readMoreButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 24,
    marginBottom: 8,
  },
  compactDescription: {
    fontSize: 14,
    lineHeight: 20,
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
    paddingBottom: 20, // Add bottom padding for safe area
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
  /* page indicator removed; feed now renders its own progress UI */
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
    width: '100%',
    height: '100%',
    position: 'relative',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  menuButtonText: {
    color: '#ffffff',
    fontSize: 12,
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
    top: 200,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 999,
    elevation: 12, // Android stacking
  },
  categoryIndicatorText: {
    color: '#ffffff',
    fontSize: 14,
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
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -32 }, { translateY: -32 }],
    zIndex: 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  reelsHeaderSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    paddingTop: 20,
  },
  reelsHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 26,
    marginTop: 12,
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
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  reelsCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  reelsVideoBadge: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
    marginBottom: 4,
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  contentTouchArea: {
    marginBottom: 16,
  },
  reelsHeadline: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 30,
    marginBottom: 8,
    // @ts-ignore - React Native Web supports CSS shadow
    textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
  },
  reelsDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
    // @ts-ignore - React Native Web supports CSS shadow
    textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
  },
  reelsMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reelsMetaText: {
    fontSize: 14,
    fontWeight: '500',
    // @ts-ignore - React Native Web supports CSS shadow
    textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
  },
  reelsTapButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  reelsTapText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    // @ts-ignore - React Native Web supports CSS shadow
    textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
  },
  reelsTapIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    // @ts-ignore - React Native Web supports CSS shadow
    textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
  },
  // Tap Overlay Styles
  tapOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -30 }],
    zIndex: 10,
  },
  tapIndicator: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 15,
  },
  tapIndicatorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tapIndicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 12,
    letterSpacing: 0.5,
  },
  tapIndicatorArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },
  tapArrowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Inshorts-style Card Styles
  inshortsCard: {
    paddingHorizontal: 16, // 32px margin total (16px each side)
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  inshortsCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    width: '100%',
    flex: 1,
    maxHeight: '90%',
  },
  
  inshortsImageContainer: {
    position: 'relative',
    width: '100%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  
  
  contentSection: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  
  inshortsHeadline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 26,
    marginBottom: 8,
  },
  
  inshortsDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 22,
    marginBottom: 12,
    flex: 1,
  },
  
  metadataRow: {
    marginTop: 'auto',
  },
  
  metadataText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '400',
  },
  
  shareIcon: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  shareText: {
    fontSize: 18,
  },
});
