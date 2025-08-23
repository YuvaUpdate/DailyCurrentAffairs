import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  FlatList,
  Animated,
} from 'react-native';
import { NewsArticle } from './types';
import { firebaseNewsService } from './FirebaseNewsService';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  bookmarkedArticles: NewsArticle[];
  onCategorySelect: (category: string | null) => void;
  onArticleSelect: (article: NewsArticle) => void;
  selectedCategory: string | null;
  isDarkMode: boolean;
  currentUser?: any;
}

export default function Sidebar({
  visible,
  onClose,
  bookmarkedArticles,
  onCategorySelect,
  onArticleSelect,
  selectedCategory,
  isDarkMode,
  currentUser
}: SidebarProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'bookmarks'>('categories');

  const theme = {
  background: isDarkMode ? '#000000' : '#ffffff',
  surface: isDarkMode ? '#000000' : '#f5f5f5',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#cccccc' : '#666666',
  accent: isDarkMode ? '#000000' : '#667eea',
    border: isDarkMode ? '#444444' : '#e0e0e0',
    overlay: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)'
  };

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const cats = await firebaseNewsService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        { 
          backgroundColor: selectedCategory === item ? theme.accent : theme.surface,
          borderColor: theme.border 
        }
      ]}
      onPress={() => {
        onCategorySelect(item);
        onClose();
      }}
    >
      <Text style={[
        styles.categoryText,
        { color: selectedCategory === item ? '#ffffff' : theme.text }
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderBookmarkItem = ({ item }: { item: NewsArticle }) => (
    <TouchableOpacity
      style={[styles.bookmarkItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => {
        onArticleSelect(item);
        onClose();
      }}
    >
      <View style={styles.bookmarkContent}>
        <Text style={[styles.bookmarkTitle, { color: theme.text }]} numberOfLines={2}>
          {item.headline}
        </Text>
        <Text style={[styles.bookmarkMeta, { color: theme.subText }]}>
          {item.category} • {item.timestamp}
        </Text>
      </View>
      <Text style={[styles.bookmarkIcon, { color: theme.accent }]}>♥</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <SafeAreaView style={[styles.sidebar, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={[styles.headerPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}> 
              <Text style={[styles.headerTitle, { color: theme.text }]}>Menu</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.text }]}>×</Text>
            </TouchableOpacity>
          </View>

          {/* User Section */}
          <View style={[styles.userSection, { borderBottomColor: theme.border }]}>
            {currentUser ? (
              <View style={styles.userInfo}>
                <View style={[styles.userAvatar, { backgroundColor: theme.accent }]}>
                  <Text style={styles.userAvatarText}>
                    {currentUser.displayName?.charAt(0).toUpperCase() || currentUser.email?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {currentUser.displayName || 'User'}
                  </Text>
                  <Text style={[styles.userEmail, { color: theme.subText }]} numberOfLines={1}>
                    {currentUser.email}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.guestInfo}>
                <Text style={[styles.guestText, { color: theme.text }]}>Welcome, Guest!</Text>
                <Text style={[styles.guestSubtext, { color: theme.subText }]}>Login to access more features</Text>
              </View>
            )}
          </View>

          {/* Tab Navigation */}
          <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: activeTab === 'categories' ? theme.accent : 'transparent' }
              ]}
              onPress={() => setActiveTab('categories')}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'categories' ? '#ffffff' : theme.text }
              ]}>
                Categories
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: activeTab === 'bookmarks' ? theme.accent : 'transparent' }
              ]}
              onPress={() => setActiveTab('bookmarks')}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'bookmarks' ? '#ffffff' : theme.text }
              ]}>
                Saved ({bookmarkedArticles.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {activeTab === 'categories' ? (
              <View style={styles.categoriesContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    { 
                      backgroundColor: selectedCategory === null ? theme.accent : theme.surface,
                      borderColor: theme.border 
                    }
                  ]}
                  onPress={() => {
                    onCategorySelect(null);
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.categoryText,
                    { color: selectedCategory === null ? '#ffffff' : theme.text }
                  ]}>
                    All Articles
                  </Text>
                </TouchableOpacity>
                
                <AnimatedFlatList
                  data={categories}
                  renderItem={renderCategoryItem}
                  keyExtractor={(item: string) => item}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.categoryList}
                />
              </View>
            ) : (
              <View style={styles.bookmarksContainer}>
                {bookmarkedArticles.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyIcon, { color: theme.subText }]}>[ ]</Text>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No Saved Articles</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.subText }]}>
                      Articles you save will appear here
                    </Text>
                  </View>
                ) : (
                  <AnimatedFlatList
                    data={bookmarkedArticles}
                    renderItem={renderBookmarkItem}
                    keyExtractor={(item: NewsArticle) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.bookmarkList}
                  />
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
        
        {/* Background overlay to close */}
        <TouchableOpacity 
          style={styles.backgroundOverlay} 
          onPress={onClose}
          activeOpacity={1}
        />
      </View>
    </Modal>
  );
}

// Animated wrapper for FlatList to safely support native driver onScroll when used elsewhere
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: '80%',
    maxWidth: 320,
    height: '100%',
    boxShadow: '2px 0 10px rgba(0, 0, 0, 0.25)',
    elevation: 10,
  },
  backgroundOverlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginRight: 8,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  categoriesContainer: {
    flex: 1,
    paddingTop: 10,
  },
  categoryList: {
    paddingHorizontal: 15,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 15,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryIcon: {
    fontSize: 18,
  },
  bookmarksContainer: {
    flex: 1,
    paddingTop: 10,
  },
  bookmarkList: {
    paddingHorizontal: 15,
  },
  bookmarkItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 15,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  bookmarkContent: {
    flex: 1,
    marginRight: 10,
  },
  bookmarkTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookmarkMeta: {
    fontSize: 12,
  },
  bookmarkIcon: {
    fontSize: 20,
    alignSelf: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  userSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
  },
  guestInfo: {
    alignItems: 'center',
  },
  guestText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  guestSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
});
