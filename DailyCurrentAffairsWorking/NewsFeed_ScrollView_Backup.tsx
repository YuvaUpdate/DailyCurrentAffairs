import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  Linking,
  Share,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NewsArticle } from './types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const { height, width } = Dimensions.get('window');

interface NewsFeedProps {
  articles: NewsArticle[];
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  onBookmarkToggle?: (articleId: number) => void;
  bookmarkedArticles?: Set<number>;
}

export default function NewsFeed({ 
  articles, 
  onRefresh,
  refreshing = false,
  onBookmarkToggle,
  bookmarkedArticles = new Set()
}: NewsFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState('My Feed');
  const [isScrolling, setIsScrolling] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Use screen height directly for Instagram-style full-screen scrolling
  const cardHeight = screenHeight;
  
  const tabs = ['My Feed', 'Finance', 'Videos', 'Insights'];
  
  // Filter articles based on selected tab
  const getFilteredArticles = () => {
    if (selectedTab === 'My Feed') return articles;
    if (selectedTab === 'Finance') return articles.filter(article => 
      article.category.toLowerCase().includes('business') || 
      article.category.toLowerCase().includes('finance')
    );
    if (selectedTab === 'Videos') return articles.filter(article => 
      article.mediaType === 'video'
    );
    if (selectedTab === 'Insights') return articles.filter(article => 
      article.category.toLowerCase().includes('analysis') || 
      article.category.toLowerCase().includes('opinion')
    );
    return articles;
  };

  const filteredArticles = getFilteredArticles();

  // Toggle bookmark
  const toggleBookmark = (articleId: number) => {
    if (onBookmarkToggle) {
      onBookmarkToggle(articleId);
    }
  };

  // Open article URL directly
  const openArticle = (article: NewsArticle) => {
    const url = article.sourceUrl || article.link;
    if (url) {
      Linking.openURL(url);
    }
  };

  // Handle momentum scroll end for Instagram-style snapping
  const handleMomentumScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const targetIndex = Math.round(offsetY / screenHeight);
    const clampedIndex = Math.max(0, Math.min(targetIndex, filteredArticles.length - 1));
    
    // Only update the current index, let native snapping handle the positioning
    setCurrentIndex(clampedIndex);
  };

  // Share article
  const shareArticle = async (article: NewsArticle) => {
    try {
      const shareUrl = article.sourceUrl || article.link || '';
      const message = shareUrl 
        ? `${article.headline}\n\n${article.description}\n\nRead more: ${shareUrl}`
        : `${article.headline}\n\n${article.description}`;
        
      await Share.share({
        message,
        title: article.headline,
      });
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  };

  // Format read time and date
  const formatMetadata = (article: NewsArticle) => {
    return `${article.timestamp} • ${article.readTime} • ${article.category}`;
  };

  // Handle tab change and reset scroll
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    setCurrentIndex(0);
    // Only scroll to top if changing tabs, without animation to avoid auto-scroll
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* News Cards - Full Screen Instagram-Style */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.fullScreenScrollView}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {filteredArticles.length === 0 ? (
          <View style={[styles.fullScreenCard, styles.emptyContainer]}>
            <Text style={styles.emptyText}>No articles available</Text>
            <Text style={styles.emptySubText}>Pull down to refresh</Text>
          </View>
        ) : (
          filteredArticles.map((article, index) => (
            <TouchableOpacity
              key={`${article.id}-${selectedTab}`}
              style={styles.fullScreenCard}
              onPress={() => openArticle(article)}
              activeOpacity={0.98}
            >
              {/* Full Screen Background Image */}
              <Image 
                source={{ uri: article.image || article.imageUrl || 'https://via.placeholder.com/400x300/f0f0f0/cccccc?text=No+Image' }} 
                style={styles.fullScreenImage}
                resizeMode="cover"
              />
              
              {/* Dark Overlay for Text Readability */}
              <View style={styles.darkOverlay} />
              
              {/* Floating Top Navigation */}
              <View style={styles.floatingTopNav}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.floatingTabContainer}
                >
                  {tabs.map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.floatingTab, selectedTab === tab && styles.activeFloatingTab]}
                      onPress={() => handleTabChange(tab)}
                    >
                      <Text style={[styles.floatingTabText, selectedTab === tab && styles.activeFloatingTabText]}>
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Bookmark Icon */}
                <TouchableOpacity
                  style={styles.floatingBookmarkButton}
                  onPress={() => toggleBookmark(article.id)}
                >
                  <View style={[styles.bookmarkIconContainer, bookmarkedArticles.has(article.id) && styles.bookmarkedIcon]}>
                    <Text style={[styles.bookmarkIcon, bookmarkedArticles.has(article.id) && { color: '#ffffff' }]}>
                      ♥
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Content at Bottom */}
              <View style={styles.contentOverlay}>
                <Text style={styles.overlayHeadline} numberOfLines={2}>
                  {article.headline}
                </Text>
                <Text style={styles.overlayDescription} numberOfLines={3}>
                  {article.description}
                </Text>
                <Text style={styles.overlayMetadata}>
                  {formatMetadata(article)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Article Count Indicator */}
      {filteredArticles.length > 0 && (
        <View style={styles.floatingCountIndicator}>
          <Text style={styles.countText}>
            {currentIndex + 1} of {filteredArticles.length}
          </Text>
        </View>
      )}

      {/* Floating Bottom Navigation */}
      <View style={styles.floatingBottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIconContainer}>
            <Text style={styles.navIcon}>⌕</Text>
          </View>
          <Text style={styles.navLabel}>Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <View style={[styles.navIconContainer, styles.activeNavIconContainer]}>
            <Text style={[styles.navIcon, styles.activeNavIcon]}>●</Text>
          </View>
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIconContainer}>
            <Text style={styles.navIcon}>◐</Text>
          </View>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },

  // Full Screen Layout Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  
  fullScreenScrollView: {
    flex: 1,
  },
  
  fullScreenCard: {
    height: screenHeight,
    width: screenWidth,
    position: 'relative',
    backgroundColor: '#000000',
  },
  
  fullScreenImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  
  // Floating Top Navigation
  floatingTopNav: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  
  floatingTabContainer: {
    flex: 1,
    paddingRight: 16,
  },
  
  floatingTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  activeFloatingTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  
  floatingTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  
  activeFloatingTabText: {
    color: '#000000',
  },
  
  floatingBookmarkButton: {
    padding: 8,
  },
  
  // Content Overlay at Bottom
  contentOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    marginHorizontal: 16,
    borderRadius: 12,
  },
  
  overlayHeadline: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 28,
  },
  
  overlayDescription: {
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 8,
    lineHeight: 22,
  },
  
  overlayMetadata: {
    fontSize: 13,
    color: '#cccccc',
    opacity: 0.8,
  },
  
  // Floating Count Indicator
  floatingCountIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    zIndex: 10,
  },
  
  // Floating Bottom Navigation
  floatingBottomNav: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: 20,
    borderRadius: 25,
    zIndex: 10,
  },
  
  // Top Navigation
  topNav: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    marginRight: 24,
    paddingVertical: 8,
    position: 'relative',
  },
  activeTab: {
    // Active tab styling handled by indicator
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabText: {
    color: '#000000',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -12,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#000000',
    borderRadius: 1,
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Empty State
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666666',
  },

  // Card Styles
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  imageContainer: {
    position: 'relative',
    height: '58%',
  },
  articleImage: {
    width: '100%',
    height: '100%',
  },
  bookmarkButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  bookmarkIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkedIcon: {
    backgroundColor: '#FF3040',
    borderRadius: 20,
    padding: 2,
  },
  bookmarkIcon: {
    fontSize: 18,
    color: '#666666',
  },

  // Content Styles
  contentContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  headline: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    lineHeight: 26,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
    marginBottom: 12,
    flex: 1,
  },
  metadataContainer: {
    marginTop: 'auto',
  },
  metadata: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '400',
  },

  // Count Indicator
  countIndicator: {
    position: 'absolute',
    top: height * 0.5,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  activeNavItem: {
    // Active nav item styling
  },
  navIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  activeNavIconContainer: {
    backgroundColor: '#007AFF',
  },
  navIcon: {
    fontSize: 16,
    color: '#666666',
  },
  activeNavIcon: {
    color: '#ffffff',
  },
  navLabel: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
  },
  activeNavLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  modalHeaderActions: {
    flexDirection: 'row',
  },
  modalActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalBookmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  modalBookmarkedContainer: {
    backgroundColor: '#FF3040',
  },
  modalShareContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  modalActionText: {
    fontSize: 16,
    color: '#333333',
  },
  modalContent: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: 250,
  },
  modalTextContainer: {
    padding: 20,
  },
  modalHeadline: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    lineHeight: 32,
    marginBottom: 12,
  },
  modalMetadata: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginBottom: 24,
  },
  fullArticleButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  fullArticleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
