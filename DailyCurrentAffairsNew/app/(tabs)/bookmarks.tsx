import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookmarkedArticle } from '../../types';
import { StorageService } from '../../services/storage';

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState<BookmarkedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const savedBookmarks = await StorageService.getBookmarks();
      setBookmarks(savedBookmarks);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      Alert.alert('Error', 'Failed to load bookmarks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookmarks();
  };

  const handleBookmarkRemove = async (articleId: string) => {
    try {
      await StorageService.removeBookmark(articleId);
      setBookmarks(prev => prev.filter(b => b.id !== articleId));
    } catch (error) {
      Alert.alert('Error', 'Failed to remove bookmark');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Bookmarks',
      'Are you sure you want to remove all bookmarks? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const bookmark of bookmarks) {
                await StorageService.removeBookmark(bookmark.id);
              }
              setBookmarks([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear bookmarks');
            }
          }
        }
      ]
    );
  };

  const handleArticlePress = (article: BookmarkedArticle) => {
    Alert.alert(
      article.title,
      article.description,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: 'Read More', 
          onPress: () => {
            console.log('Open article:', article.url);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading bookmarks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Articles</Text>
        {bookmarks.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {bookmarks.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
        >
          <Ionicons name="bookmark-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Saved Articles</Text>
          <Text style={styles.emptySubtitle}>
            Articles you bookmark will appear here
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
        >
          <Text style={styles.countText}>
            {bookmarks.length} saved article{bookmarks.length !== 1 ? 's' : ''}
          </Text>
          
          {bookmarks.map((bookmark) => (
            <View style={styles.bookmarkItem} {...({ key: bookmark.id } as any)}>
              <View style={styles.bookmarkMeta}>
                <Text style={styles.savedDate}>
                  Saved {new Date(bookmark.bookmarkedAt).toLocaleDateString()}
                </Text>
                <TouchableOpacity 
                  onPress={() => handleBookmarkRemove(bookmark.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.articlePreview}
                onPress={() => handleArticlePress(bookmark)}
              >
                <Text style={styles.articleTitle} numberOfLines={2}>
                  {bookmark.title}
                </Text>
                <Text style={styles.articleDescription} numberOfLines={3}>
                  {bookmark.description}
                </Text>
                <View style={styles.articleMeta}>
                  <Text style={styles.articleSource}>{bookmark.source}</Text>
                  <Text style={styles.articleCategory}>
                    {bookmark.category.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  clearButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#ff4444',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  countText: {
    fontSize: 16,
    color: '#666',
    padding: 20,
    paddingBottom: 10,
  },
  bookmarkItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bookmarkMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedDate: {
    fontSize: 12,
    color: '#999',
  },
  removeButton: {
    padding: 4,
  },
  articlePreview: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 24,
  },
  articleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleSource: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  articleCategory: {
    fontSize: 10,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bottomSpacing: {
    height: 100,
  },
});
