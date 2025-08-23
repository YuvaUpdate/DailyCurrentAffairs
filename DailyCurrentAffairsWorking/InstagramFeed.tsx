import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Platform,
  Dimensions,
  Linking,
  Share,
  RefreshControl,
  Alert,
} from 'react-native';
import { NewsArticle } from './types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface InstagramFeedProps {
  articles: NewsArticle[];
  onRefresh?: () => void;
  refreshing?: boolean;
  onBookmarkToggle?: (articleId: string | number) => void;
  bookmarkedArticles?: Set<string | number>;
}

export default function InstagramFeed({
  articles,
  onRefresh,
  refreshing = false,
  onBookmarkToggle,
  bookmarkedArticles = new Set()
}: InstagramFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Debug function
  const debug = (message: string) => {
    console.log(`🔍 InstagramFeed: ${message}`);
    setDebugInfo(message);
  };

  useEffect(() => {
    debug(`Component loaded with ${articles.length} articles`);
  }, [articles.length]);

  // Handle scroll end - CRITICAL: This ensures each scroll stops at exactly one article
  const handleScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const targetIndex = Math.round(offsetY / screenHeight);
    const clampedIndex = Math.max(0, Math.min(targetIndex, articles.length - 1));
    
    debug(`Scroll ended at ${offsetY}px, target article: ${clampedIndex + 1}/${articles.length}`);
    
    // Force exact positioning
    const exactY = clampedIndex * screenHeight;
    if (Math.abs(offsetY - exactY) > 5) { // Only adjust if off by more than 5px
      debug(`Adjusting position from ${offsetY} to ${exactY}`);
      scrollViewRef.current?.scrollTo({
        y: exactY,
        animated: true
      });
    }
    
    setCurrentIndex(clampedIndex);
  };

  // Handle momentum scroll end - backup to ensure perfect positioning
  const handleMomentumScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const targetIndex = Math.round(offsetY / screenHeight);
    const clampedIndex = Math.max(0, Math.min(targetIndex, articles.length - 1));
    const exactY = clampedIndex * screenHeight;
    
    debug(`Momentum ended: forcing position to article ${clampedIndex + 1}`);
    
    scrollViewRef.current?.scrollTo({
      y: exactY,
      animated: true
    });
    
    setCurrentIndex(clampedIndex);
  };

  // Manual navigation for testing
  const goToNext = () => {
    if (currentIndex < articles.length - 1) {
      const nextIndex = currentIndex + 1;
      debug(`Manual next: going to article ${nextIndex + 1}`);
      scrollViewRef.current?.scrollTo({
        y: nextIndex * screenHeight,
        animated: true
      });
      setCurrentIndex(nextIndex);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      debug(`Manual previous: going to article ${prevIndex + 1}`);
      scrollViewRef.current?.scrollTo({
        y: prevIndex * screenHeight,
        animated: true
      });
      setCurrentIndex(prevIndex);
    }
  };

  // Toggle bookmark
  const toggleBookmark = (articleId: string | number) => {
    debug(`Toggling bookmark for article ${articleId}`);
    if (onBookmarkToggle) {
      onBookmarkToggle(articleId);
    }
  };

  // Open article URL
  const openArticle = (article: NewsArticle) => {
    debug(`Opening article: ${article.headline}`);
    const url = article.sourceUrl || article.link;
    if (url) {
      Linking.openURL(url);
    } else {
      Alert.alert('No URL', 'This article doesn\'t have a source URL');
    }
  };

  // Share article
  const shareArticle = async (article: NewsArticle) => {
    try {
      debug(`Sharing article: ${article.headline}`);
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Debug Info Overlay */}
      {__DEV__ && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>
            Article {currentIndex + 1}/{articles.length}
          </Text>
          <Text style={styles.debugText}>
            {debugInfo}
          </Text>
        </View>
      )}

      {/* Manual Navigation for Testing */}
      {__DEV__ && (
        <View style={styles.manualNav}>
          <TouchableOpacity style={styles.navButton} onPress={goToPrevious}>
            <Text style={styles.navButtonText}>↑ Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={goToNext}>
            <Text style={styles.navButtonText}>↓ Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main ScrollView - Instagram/Inshorts Style */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.mainScrollView}
  contentContainerStyle={{ paddingBottom: 0 }}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={false}
        pagingEnabled={false}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {articles.map((article, index) => (
          <TouchableOpacity
            key={`article-${article.id}-${index}`}
            style={styles.articlePage}
            onPress={() => openArticle(article)}
            activeOpacity={0.95}
          >
            {/* Full Screen Background Image */}
            <Image 
              source={{ 
                uri: article.image || article.imageUrl || 'https://via.placeholder.com/400x800/333333/ffffff?text=News+Article' 
              }} 
              style={styles.backgroundImage}
              resizeMode="cover"
            />
            
            {/* Dark Overlay for Text Readability */}
            <View style={styles.darkOverlay} />
            
            {/* Content Overlay */}
            <View style={styles.contentOverlay}>
              {/* Category Badge */}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {article.category || 'NEWS'} #{index + 1}
                </Text>
              </View>
              
              {/* Main Content Area */}
              <View style={styles.mainContent}>
                <Text style={styles.headline} numberOfLines={3}>
                  {article.headline}
                </Text>
                
                <Text style={styles.description} numberOfLines={5}>
                  {article.description}
                </Text>
                
                {/* Metadata */}
                <Text style={styles.metadata}>
                  {formatMetadata(article)}
                </Text>
              </View>
              
              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    bookmarkedArticles.has(String(article.id)) && styles.bookmarkedButton
                  ]}
                  onPress={() => toggleBookmark(article.id)}
                >
                  <Text style={[
                    styles.actionIcon,
                      bookmarkedArticles.has(String(article.id)) && styles.bookmarkedIcon
                  ]}>
                      {bookmarkedArticles.has(String(article.id)) ? '●' : '○'}
                  </Text>
                  <Text style={[
                    styles.actionText,
                    bookmarkedArticles.has(String(article.id)) && styles.bookmarkedText
                  ]}>
                    {bookmarkedArticles.has(String(article.id)) ? 'Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => shareArticle(article)}
                >
                  <Text style={styles.actionIcon}>↗</Text>
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Article Number Indicator */}
            <View style={styles.articleIndicator}>
              <Text style={styles.articleNumberText}>
                {index + 1} / {articles.length}
              </Text>
            </View>
            
            {/* Swipe Hint */}
            {index < articles.length - 1 && (
              <View style={styles.swipeHint}>
                <Text style={styles.swipeHintText}>Swipe up for next story</Text>
                <Text style={styles.swipeArrow}>↑</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  debugOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 2000,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 8,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  manualNav: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    right: 16,
    zIndex: 2000,
    flexDirection: 'column',
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    marginVertical: 4,
    borderRadius: 8,
  },
  navButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainScrollView: {
    flex: 1,
  },
  articlePage: {
    width: screenWidth,
    height: screenHeight,
    position: 'relative',
  marginBottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
  // reduced bottom padding to avoid creating extra scrollable gap
  paddingBottom: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  categoryText: {
    color: '#000000',
  fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  headline: {
  fontSize: 40,
  fontWeight: '900',
  color: '#FFFFFF',
  lineHeight: 48,
  marginBottom: 18,
  },
  description: {
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 20,
    opacity: 0.95,
    fontWeight: '400',
  },
  metadata: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    minWidth: 90,
  },
  bookmarkedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  actionIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  bookmarkedIcon: {
    color: '#000000',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bookmarkedText: {
    color: '#000000',
  },
  articleIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  articleNumberText: {
    color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '800',
  },
  swipeHint: {
  position: 'absolute',
  bottom: 18,
    alignSelf: 'center',
    alignItems: 'center',
  },
  swipeHintText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
    fontWeight: '500',
  },
  swipeArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.8,
  },
});
