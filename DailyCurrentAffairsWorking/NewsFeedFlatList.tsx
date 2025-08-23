import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Platform,
  Dimensions,
  Linking,
  Share,
  RefreshControl,
} from 'react-native';
import { NewsArticle } from './types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Animated wrapper for FlatList to safely support native driver onScroll when used elsewhere
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);

interface NewsFeedProps {
  articles: NewsArticle[];
  onRefresh?: () => void;
  refreshing?: boolean;
  onBookmarkToggle?: (articleId: string | number) => void;
  bookmarkedArticles?: Set<string | number>;
}

export default function NewsFeed({
  articles,
  onRefresh,
  refreshing = false,
  onBookmarkToggle,
  bookmarkedArticles = new Set<string | number>()
}: NewsFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTab, setSelectedTab] = useState('My Feed');
  
  const flatListRef = useRef<FlatList>(null);

  // safe scroll helper (handles Animated wrappers exposing getNode)
  const scrollTo = (offset: number, animated = true) => {
    const ref: any = flatListRef.current;
    if (!ref) return;
    const target = (typeof ref.getNode === 'function') ? ref.getNode() : ref;
    try {
      if (typeof target.scrollToOffset === 'function') {
        target.scrollToOffset({ offset, animated });
        return;
      }
      if (typeof target.scrollTo === 'function') {
        target.scrollTo({ y: offset, animated });
        return;
      }
    } catch (e) {}
  };
  
  const tabs = ['My Feed', 'Finance', 'Videos', 'Insights'];
  
  // Filter articles based on selected tab
  const getFilteredArticles = () => {
    if (selectedTab === 'My Feed') return articles;
    if (selectedTab === 'Finance') return articles.filter(article => 
      article.category.toLowerCase().includes('business') || 
      article.category.toLowerCase().includes('finance') ||
      article.category.toLowerCase().includes('economy')
    );
    if (selectedTab === 'Videos') return articles.filter(article => 
      article.mediaType === 'video' || 
      article.headline.toLowerCase().includes('video')
    );
    if (selectedTab === 'Insights') return articles.filter(article => 
      article.category.toLowerCase().includes('analysis') ||
      article.category.toLowerCase().includes('insight') ||
      article.category.toLowerCase().includes('opinion')
    );
    return articles;
  };

  const filteredArticles = getFilteredArticles();

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    setCurrentIndex(0);
  // use safe helper in case component is wrapped by Animated
  try { scrollTo(0, false); } catch (e) {}
  };

  // Handle scroll position change
  const handleViewableItemsChanged = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  };

  // Toggle bookmark
  const toggleBookmark = (articleId: string | number) => {
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

  // Format metadata
  const formatMetadata = (article: NewsArticle) => {
    const parts = [];
    if (article.category) parts.push(article.category);
    if (article.readTime) parts.push(article.readTime);
    if (article.timestamp) {
      const date = new Date(article.timestamp);
      parts.push(date.toLocaleDateString());
    }
    return parts.join(' • ');
  };

  // Handle refresh
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  // Render each article as a full-screen page
  const renderArticle = ({ item: article }: { item: NewsArticle }) => (
    <TouchableOpacity
      style={styles.articlePage}
      onPress={() => openArticle(article)}
      activeOpacity={0.98}
    >
      {/* Full Screen Background Image */}
      <Image 
        source={{ 
          uri: article.image || article.imageUrl || 'https://via.placeholder.com/400x600/f0f0f0/cccccc?text=No+Image' 
        }} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      {/* Dark Overlay for Text Readability */}
      <View style={styles.darkOverlay} />
      
      {/* Floating Top Navigation */}
      <View style={styles.floatingTopNav}>
        <FlatList
          data={tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.floatingTabContainer}
          keyExtractor={(item) => item}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[styles.floatingTab, selectedTab === tab && styles.activeFloatingTab]}
              onPress={() => handleTabChange(tab)}
            >
              <Text style={[styles.floatingTabText, selectedTab === tab && styles.activeFloatingTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          )}
        />
        
        {/* Bookmark Icon */}
        <TouchableOpacity
          style={styles.floatingBookmarkButton}
          onPress={() => toggleBookmark(article.id)}
        >
          <View style={[styles.bookmarkIconContainer, bookmarkedArticles.has(String(article.id)) && styles.bookmarkedIcon]}>
            <Text style={[styles.bookmarkIcon, bookmarkedArticles.has(String(article.id)) && { color: '#ffffff' }]}>
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

      {/* Share Button */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => shareArticle(article)}
      >
        <View style={styles.shareIconContainer}>
          <Text style={styles.shareIcon}>↗</Text>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Instagram-Style FlatList */}
  <AnimatedFlatList
        ref={flatListRef}
        data={filteredArticles}
  keyExtractor={(item: NewsArticle) => `${item.id}-${selectedTab}`}
        renderItem={renderArticle}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
  decelerationRate="fast"
  snapToInterval={screenHeight}
  snapToAlignment="start"
  // Performance: limit renders and enable native clipping
  initialNumToRender={2}
  maxToRenderPerBatch={3}
  windowSize={5}
  removeClippedSubviews={true}
  getItemLayout={(data: NewsArticle[] | null, index: number) => ({ length: screenHeight, offset: screenHeight * index, index })}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No articles available</Text>
            <Text style={styles.emptySubText}>Pull down to refresh</Text>
          </View>
        )}
      />

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
    backgroundColor: '#000000',
  },
  
  // Article Page (Full Screen)
  articlePage: {
    height: screenHeight,
    width: screenWidth,
    position: 'relative',
    backgroundColor: '#000000',
  },
  
  backgroundImage: {
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
  // stronger overlay so dark mode appears truly black
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  
  bookmarkIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  bookmarkedIcon: {
    backgroundColor: '#ff4757',
  },
  
  bookmarkIcon: {
    fontSize: 16,
    color: '#ffffff',
  },
  
  // Content Overlay at Bottom — flush to bottom to avoid trailing gap
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
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
  
  // Share Button
  shareButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    zIndex: 10,
  },
  
  shareIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  shareIcon: {
    fontSize: 18,
    color: '#ffffff',
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
  
  countText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
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
  
  navItem: {
    alignItems: 'center',
    opacity: 0.6,
  },
  
  activeNavItem: {
    opacity: 1,
  },
  
  navIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  activeNavIconContainer: {
    backgroundColor: '#007AFF',
  },
  
  navIcon: {
    fontSize: 14,
    color: '#ffffff',
  },
  
  activeNavIcon: {
    color: '#ffffff',
  },
  
  navLabel: {
    fontSize: 10,
    color: '#ffffff',
  },
  
  activeNavLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // Empty State
  emptyContainer: {
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  
  emptyText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 8,
  },
  
  emptySubText: {
    fontSize: 14,
    color: '#cccccc',
  },
});
