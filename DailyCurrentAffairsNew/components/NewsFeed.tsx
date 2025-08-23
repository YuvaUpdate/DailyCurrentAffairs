import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
} from 'react-native';
import { NewsArticle } from '../types';
import NewsCard from './NewsCard';
import { StorageService } from '../services/storage';

const { height: screenHeight } = Dimensions.get('window');

interface NewsFeedProps {
  articles: NewsArticle[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onArticlePress?: (article: NewsArticle) => void;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({
  articles,
  loading = false,
  refreshing = false,
  onRefresh,
  onLoadMore,
  hasMore = false,
  onArticlePress,
}) => {
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList<NewsArticle>>(null);

  useEffect(() => {
    loadBookmarkedArticles();
  }, []);

  const loadBookmarkedArticles = async () => {
    try {
      const bookmarks = await StorageService.getBookmarks();
      setBookmarkedArticles(new Set(bookmarks.map(b => b.id)));
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const handleBookmarkChange = useCallback((articleId: string, isBookmarked: boolean) => {
    setBookmarkedArticles(prev => {
      const newSet = new Set(prev);
      if (isBookmarked) {
        newSet.add(articleId);
      } else {
        newSet.delete(articleId);
      }
      return newSet;
    });
  }, []);

  const renderItem = ({ item, index }: { item: NewsArticle; index: number }) => (
    <NewsCard
      article={item}
      isBookmarked={bookmarkedArticles.has(item.id)}
      onBookmarkChange={(isBookmarked) => handleBookmarkChange(item.id, isBookmarked)}
      onPress={() => onArticlePress?.(item)}
    />
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading more articles...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading articles...</Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No articles available</Text>
        <Text style={styles.emptySubText}>Pull down to refresh</Text>
      </View>
    );
  };

  const handleEndReached = () => {
    if (hasMore && !loading && !refreshing) {
      onLoadMore?.();
    }
  };

  const getItemLayout = (data: any, index: number) => ({
    length: screenHeight - 100,
    offset: (screenHeight - 100) * index,
    index,
  });

  return (
    <View style={styles.container}>
      <FlatList<NewsArticle>
        {...({ ref: flatListRef } as any)}
        data={articles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        pagingEnabled
        snapToInterval={screenHeight - 100}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
            title="Pull to refresh"
            titleColor="#007AFF"
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        initialNumToRender={2}
        windowSize={5}
        scrollEventThrottle={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: screenHeight - 200,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
});

export default NewsFeed;
