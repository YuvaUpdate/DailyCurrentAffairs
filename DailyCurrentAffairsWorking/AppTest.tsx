import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { NewsArticle } from './types';
import NewsFeed_Inshorts from './NewsFeed_Inshorts';
import { firebaseNewsService } from './FirebaseNewsService';

// Test App to demonstrate Instagram-style scrolling
export default function AppTest() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Set<string>>(new Set());

  // Load articles on component mount
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      console.log('📰 Loading articles from Firebase...');
      
      const fetchedArticles = await firebaseNewsService.getArticles();
      console.log(`✅ Loaded ${fetchedArticles.length} articles`);
      
      setArticles(fetchedArticles);
    } catch (error) {
      console.error('❌ Error loading articles:', error);
      Alert.alert('Error', 'Failed to load articles. Check your internet connection.');
      
      // Fallback demo data
      const demoArticles: NewsArticle[] = [
        {
          id: '1',
          headline: "Demo Article 1 - Instagram Style Scrolling Test",
          description: "This is a test article to demonstrate the Instagram/Inshorts-style scrolling behavior. Each article should take up the full screen height and scrolling should snap perfectly to each article boundary.",
          image: "https://picsum.photos/400/800?random=1",
          category: "Technology",
          timestamp: new Date().toISOString(),
          readTime: "2 min read",
          mediaType: "image",
          sourceUrl: "https://example.com/article1",
          link: "https://example.com/article1"
        },
        {
          id: '2',
          headline: "Demo Article 2 - Perfect Snap Behavior",
          description: "This second article tests the scroll snapping functionality. When you swipe up or down, the feed should move exactly one article and stop perfectly at the boundaries. No more stopping in the middle!",
          image: "https://picsum.photos/400/800?random=2",
          category: "Sports",
          timestamp: new Date().toISOString(),
          readTime: "3 min read",
          mediaType: "image",
          sourceUrl: "https://example.com/article2",
          link: "https://example.com/article2"
        },
        {
          id: '3',
          headline: "Demo Article 3 - Full Screen Experience",
          description: "This article demonstrates the full-screen immersive experience. The background image covers the entire screen with text overlays and action buttons at the bottom. Perfect for mobile news consumption!",
          image: "https://picsum.photos/400/800?random=3",
          category: "Politics",
          timestamp: new Date().toISOString(),
          readTime: "4 min read",
          mediaType: "image",
          sourceUrl: "https://example.com/article3",
          link: "https://example.com/article3"
        },
        {
          id: '4',
          headline: "Demo Article 4 - Debug Features",
          description: "This article shows the debug features in development mode. You can see the current article number, debug information, and manual navigation buttons for testing purposes.",
          image: "https://picsum.photos/400/800?random=4",
          category: "Technology",
          timestamp: new Date().toISOString(),
          readTime: "2 min read",
          mediaType: "image",
          sourceUrl: "https://example.com/article4",
          link: "https://example.com/article4"
        },
        {
          id: '5',
          headline: "Demo Article 5 - Final Test",
          description: "This is the final test article to ensure the scrolling behavior works correctly with multiple articles. The Instagram Feed component should handle all scroll events and provide smooth navigation between articles.",
          image: "https://picsum.photos/400/800?random=5",
          category: "Entertainment",
          timestamp: new Date().toISOString(),
          readTime: "5 min read",
          mediaType: "image",
          sourceUrl: "https://example.com/article5",
          link: "https://example.com/article5"
        }
      ];
      
      setArticles(demoArticles);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Refreshing articles...');
    loadArticles();
  };

  const handleBookmarkToggle = (articleId: string | number) => {
    const key = String(articleId);
    const newBookmarks = new Set(bookmarkedArticles);
    if (newBookmarks.has(key)) {
      newBookmarks.delete(key);
      console.log(`📝 Removed bookmark for article ${key}`);
    } else {
      newBookmarks.add(key);
      console.log(`📌 Added bookmark for article ${key}`);
    }
    setBookmarkedArticles(newBookmarks);
  };

  const resetToOriginalApp = () => {
    Alert.alert(
      'Reset to Original App',
      'This would normally switch back to the original app implementation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => console.log('Reset requested') }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Text style={styles.loadingText}>Loading Instagram Feed...</Text>
        <Text style={styles.loadingSubtext}>Setting up perfect scroll behavior</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header for Testing */}
      <View style={styles.testHeader}>
        <Text style={styles.testTitle}>Instagram Feed Test</Text>
        <TouchableOpacity style={styles.resetButton} onPress={resetToOriginalApp}>
          <Text style={styles.resetButtonText}>Reset App</Text>
        </TouchableOpacity>
      </View>

      {/* Instagram-style Feed */}
      <NewsFeed_Inshorts
        articles={articles}
        onRefresh={handleRefresh}
        refreshing={loading}
        onBookmarkToggle={handleBookmarkToggle}
        bookmarkedArticles={bookmarkedArticles}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.7,
  },
  testHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
