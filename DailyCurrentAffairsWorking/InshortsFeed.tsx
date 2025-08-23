import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Animated } from 'react-native';
import InshortsCard from './InshortsCard';
import { NewsArticle } from './types';

interface InshortsFeedProps {
  articles: NewsArticle[];
  onRefresh?: () => void;
  refreshing?: boolean;
  onBookmarkToggle?: (id: string | number) => void;
  bookmarkedArticles?: Set<string | number>;
  onArticlePress?: (article: NewsArticle) => void;
}

// Animated wrapper for FlatList to safely support native driver onScroll when used elsewhere
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);

export default function InshortsFeed({ articles, onRefresh, refreshing = false, onBookmarkToggle, bookmarkedArticles = new Set(), onArticlePress }: InshortsFeedProps) {
  return (
    <View style={styles.container}>
  {/* Animated wrapper avoids VirtualizedList invariant when Animated.event/useNativeDriver is used */}
  {/** AnimatedFlatList used to avoid VirtualizedList invariant when native driver used */}
      <AnimatedFlatList
        data={articles}
        keyExtractor={(item: NewsArticle) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: NewsArticle }) => (
          <InshortsCard
            article={item}
            onPress={onArticlePress}
            onBookmark={(id) => onBookmarkToggle && onBookmarkToggle(id)}
            isBookmarked={bookmarkedArticles.has(String(item.id))}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
  // Performance tuning for mobile
  initialNumToRender={4}
  maxToRenderPerBatch={4}
  windowSize={7}
  removeClippedSubviews={true}
  // If InshortsCard has fixed height, uncomment getItemLayout for best perf
  // getItemLayout={(data, index) => ({ length: CARD_HEIGHT, offset: CARD_HEIGHT * index, index })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: '#000',
  },
  list: {
    paddingTop: 12,
    paddingBottom: 24,
  },
});
