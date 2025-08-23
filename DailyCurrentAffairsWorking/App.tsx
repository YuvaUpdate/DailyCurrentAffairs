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
import { VideoView } from 'expo-video';
import AdminPanel from './AdminPanel';
import Sidebar from './Sidebar';
import VideoPlayerComponent from './VideoPlayerComponent';
import { NewsArticle } from './types';
import { firebaseNewsService } from './FirebaseNewsService';
import { notificationService } from './NotificationService';
import { ArticleActions } from './ArticleActions';
import { authService, UserProfile } from './AuthService';

const { height, width } = Dimensions.get('screen');

interface AppProps {
  currentUser?: any;
}

export default function App({ currentUser }: AppProps) {
  // Theme state - Default to dark mode
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [screenData, setScreenData] = useState(Dimensions.get('screen'));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
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
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F8FAFC',
      subText: '#94A3B8',
      accent: '#3B82F6',
      border: '#334155',
      headerBg: '#1E293B',
      buttonBg: '#3B82F6',
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
      id: 1,
      headline: "Breaking: Major Tech Breakthrough Announced",
      description: "Scientists have developed a revolutionary new technology that could change the way we interact with digital devices forever. This breakthrough promises to make technology more accessible and intuitive for users worldwide.",
      image: "https://via.placeholder.com/400x300/667eea/ffffff?text=Tech+News",
      category: "Technology",
      readTime: "2 min read",
      timestamp: "2 hours ago"
    },
    {
      id: 2,
      headline: "Sports: Championship Finals This Weekend",
      description: "The most anticipated sporting event of the year is set to take place this weekend. Teams have been preparing for months, and fans are eagerly waiting for what promises to be an unforgettable match.",
      image: "https://via.placeholder.com/400x300/f093fb/ffffff?text=Sports+News",
      category: "Sports",
      readTime: "1 min read",
      timestamp: "4 hours ago"
    },
    {
      id: 3,
      headline: "Business: Market Reaches All-Time High",
      description: "Stock markets around the world have reached unprecedented levels today, driven by positive economic indicators and investor confidence. Analysts are optimistic about continued growth in the coming quarters.",
      image: "https://via.placeholder.com/400x300/4ade80/ffffff?text=Business+News",
      category: "Business",
      readTime: "3 min read",
      timestamp: "6 hours ago"
    },
    {
      id: 4,
      headline: "Health: New Medical Discovery Shows Promise",
      description: "Researchers have made a significant breakthrough in medical science that could lead to better treatment options for millions of patients worldwide. Clinical trials are showing very promising results.",
      image: "https://via.placeholder.com/400x300/fb7185/ffffff?text=Health+News",
      category: "Health",
      readTime: "2 min read",
      timestamp: "8 hours ago"
    },
    {
      id: 5,
      headline: "Environment: Climate Action Summit Begins",
      description: "World leaders have gathered for the annual climate summit to discuss urgent environmental challenges and potential solutions. New commitments are expected to be announced throughout the week.",
      image: "https://via.placeholder.com/400x300/34d399/ffffff?text=Environment",
      category: "Environment",
      readTime: "4 min read",
      timestamp: "10 hours ago"
    }
  ]);

  const [bookmarkedItems, setBookmarkedItems] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [adminVisible, setAdminVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [articleModalVisible, setArticleModalVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>(newsData); // Initialize with newsData
  const [refreshing, setRefreshing] = useState(false);
  const [lastArticleCount, setLastArticleCount] = useState(0);
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Firebase real-time subscription with auto-refresh
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;

    const setupFirebaseSubscription = () => {
      unsubscribe = firebaseNewsService.subscribeToArticles((articles: NewsArticle[]) => {
        console.log('📡 Received articles from Firebase:', articles.length);
        
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

    // Setup auto-refresh interval (10 seconds)
    refreshInterval = setInterval(autoRefresh, 10000);

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
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
    setBookmarkedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
    
    const article = newsData.find(item => item.id === id);
    if (article) {
      const isBookmarking = !bookmarkedItems.includes(id);
      Alert.alert(
        isBookmarking ? 'Bookmarked!' : 'Removed from bookmarks',
        `"${article.headline}" ${isBookmarking ? 'saved for later reading' : 'removed from your bookmarks'}`
      );
    }
  };

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
    console.log('🔄 Starting to add article:', newArticle);
    console.log('🔄 Platform:', Platform.OS);
    console.log('User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');
    
    // Add to Firebase
    firebaseNewsService.addArticle(newArticle)
      .then((docId: string) => {
        console.log('✅ Article added to Firebase with ID:', docId);
        Alert.alert('Success', 'News article added successfully!');
      })
      .catch((error: any) => {
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
      });
  };

  const handleBulkAddNews = (articles: NewsArticle[]) => {
    // Add multiple articles to Firebase
    Promise.all(
      articles.map(article => 
        firebaseNewsService.addArticle({
          headline: article.headline,
          description: article.description,
          image: article.image,
          category: article.category,
          readTime: article.readTime
        })
      )
    ).then(() => {
      console.log('✅ Bulk articles added to Firebase');
      Alert.alert('Success', `${articles.length} articles added successfully!`);
    }).catch((error: any) => {
      console.error('❌ Error adding bulk articles:', error);
      Alert.alert('Error', 'Failed to add some articles');
    });
  };

  const handleArticlePress = (article: NewsArticle) => {
    setSelectedArticle(article);
    setArticleModalVisible(true);
  };

  const closeArticleModal = () => {
    setArticleModalVisible(false);
    setSelectedArticle(null);
  };

  const renderNewsCard = (article: NewsArticle, index: number) => {
    const isBookmarked = bookmarkedItems.includes(article.id);
    
    return (
      <View key={article.id} style={[
        styles.cardContainer, 
        { 
          backgroundColor: currentTheme.surface,
          height: screenData.height - 80 // Full screen height for reels-style
        }
      ]}>
        {/* Full-screen Reels-style Layout */}
        <View style={styles.reelsCard}>
          {/* Large Background Image */}
          <View style={styles.fullImageContainer}>
            {article.mediaType === 'video' ? (
              <VideoPlayerComponent
                videoUrl={article.image}
                style={styles.fullScreenImage}
                showControls={true}
                autoPlay={false}
              />
            ) : (
              <Image 
                source={{ uri: article.image }} 
                style={styles.fullScreenImage}
                resizeMode="cover"
                onError={(error) => console.log('Image loading error:', error)}
                onLoad={() => console.log('Image loaded successfully:', article.image)}
              />
            )}
            
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

          {/* Content Overlay at Bottom */}
          <View style={styles.contentOverlay}>
            <TouchableOpacity 
              onPress={() => handleArticlePress(article)}
              activeOpacity={0.7}
              style={styles.contentTouchArea}
            >
              {/* Headline */}
              <Text style={[styles.reelsHeadline, { color: '#FFFFFF' }]} numberOfLines={3}>
                {article.headline}
              </Text>
              
              {/* Short summary */}
              <Text style={[styles.reelsDescription, { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>
                {article.description.length > 100 
                  ? article.description.substring(0, 100) + "..."
                  : article.description
                }
              </Text>
              
              {/* Meta Information */}
              <View style={styles.reelsMetaContainer}>
                <Text style={[styles.reelsMetaText, { color: 'rgba(255,255,255,0.8)' }]}>
                  {article.readTime}
                </Text>
              </View>
            </TouchableOpacity>

            {/* "Tap to know more" Section */}
            <TouchableOpacity 
              style={styles.reelsTapButton}
              onPress={() => handleArticlePress(article)}
            >
              <Text style={styles.reelsTapText}>
                Tap to know more
              </Text>
              <Text style={styles.reelsTapIcon}>
                →
              </Text>
            </TouchableOpacity>
          </View>
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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.headerBg, borderBottomColor: currentTheme.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>YuvaUpdate</Text>
          {/* Auto-refresh indicator */}
          <View style={styles.autoRefreshIndicator}>
            <Text style={[styles.autoRefreshText, { color: currentTheme.accent }]}>
              {autoRefreshing ? 'Refreshing...' : 'Auto-refresh'}
            </Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.menuButton, { backgroundColor: currentTheme.accent }]}
            onPress={() => setSidebarVisible(true)}
          >
            <Text style={[styles.menuButtonText, { color: '#FFFFFF' }]}>≡</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.themeButton, { backgroundColor: currentTheme.accent }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Text style={[styles.themeButtonText, { color: '#FFFFFF' }]}>{isDarkMode ? '☀' : '☽'}</Text>
          </TouchableOpacity>
          {/* Admin Button - Only visible for admin users */}
          {userProfile && authService.isAdminUser(userProfile) && (
            <TouchableOpacity 
              style={[styles.adminButton, { backgroundColor: currentTheme.accent }]}
              onPress={handleAdminAccess}
            >
              <Text style={[styles.adminButtonText, { color: '#FFFFFF' }]}>
                Admin
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Instagram-like Vertical Scroll Feed */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        pagingEnabled={true}
        snapToInterval={screenData.height - 80}
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
          const screenHeight = screenData.height - 80;
          const newIndex = Math.round(scrollY / screenHeight);
          
          if (newIndex !== currentIndex && newIndex >= 0 && newIndex < filteredNews.length) {
            console.log(`Scroll: ${scrollY}px, Screen: ${screenHeight}px, Index: ${currentIndex} → ${newIndex}, Total: ${filteredNews.length}`);
            setCurrentIndex(newIndex);
          }
        }}
        onMomentumScrollEnd={(event) => {
          // Final scroll position tracking
          const scrollY = event.nativeEvent.contentOffset.y;
          const screenHeight = screenData.height - 80;
          const newIndex = Math.round(scrollY / screenHeight);
          const finalIndex = Math.max(0, Math.min(newIndex, filteredNews.length - 1));
          console.log(`Scroll End: ${scrollY}px, Screen: ${screenHeight}px, Final Index: ${finalIndex}, Total: ${filteredNews.length}`);
          setCurrentIndex(finalIndex);
        }}
        scrollEventThrottle={16}
      >
        {filteredNews.length === 0 ? (
          <View style={[styles.emptyContainer, { height: screenData.height - 80 }]}>
            <Text style={[styles.emptyText, { color: currentTheme.text }]}>
              {selectedCategory ? `No articles found in "${selectedCategory}" category` : 'No articles available'}
            </Text>
            <Text style={[styles.emptySubtext, { color: currentTheme.subText }]}>
              Pull down to refresh or check your internet connection
            </Text>
          </View>
        ) : (
          filteredNews.map((article, index) => renderNewsCard(article, index))
        )}
      </ScrollView>

      {/* Page Indicator */}
      <View style={[styles.pageIndicator, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
        {filteredNews.map((_, index) => {
          const isActive = index === currentIndex;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                { 
                  backgroundColor: isActive
                    ? currentTheme.accent 
                    : isDarkMode 
                      ? 'rgba(255,255,255,0.4)' 
                      : 'rgba(0,0,0,0.3)',
                  transform: [{ scale: isActive ? 1.2 : 1 }]
                }
              ]}
            />
          );
        })}
      </View>

      {/* Category Filter Indicator */}
      {selectedCategory && (
        <View style={[styles.categoryIndicator, { backgroundColor: currentTheme.accent }]}>
          <Text style={styles.categoryIndicatorText}>📁 {selectedCategory}</Text>
          <TouchableOpacity onPress={() => handleCategorySelect(null)}>
            <Text style={styles.categoryIndicatorClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

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
        bookmarkedArticles={newsData.filter(article => bookmarkedItems.includes(article.id))}
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
        presentationStyle="pageSheet"
        onRequestClose={closeArticleModal}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
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

                  {/* Extended content for a more realistic article view */}
                  <Text style={[styles.modalDescription, { color: currentTheme.text }]}>
                    {'\n'}This story continues to develop as more information becomes available. 
                    Our team of journalists is working around the clock to bring you the most 
                    accurate and up-to-date information on this important topic.
                    {'\n\n'}
                    The implications of this development could be far-reaching, affecting various 
                    sectors and communities. Experts are analyzing the situation and providing 
                    insights into what this means for the future.
                    {'\n\n'}
                    Stay tuned for more updates as this story unfolds. We will continue to monitor 
                    the situation and provide comprehensive coverage of all related developments.
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
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 2,
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
    paddingTop: 8,
    width: '100%',
    overflow: 'hidden',
  },
  cardContainer: {
    marginBottom: 8,
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
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    fontSize: 18,
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
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
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
});
