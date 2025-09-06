import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  SafeAreaView,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FastTouchable from './FastTouchable';
import { NewsArticle } from './types';
import { firebaseNewsService } from './FirebaseNewsService';
import PrivacyPolicy from './policies/PrivacyPolicy';
import TermsOfService from './policies/TermsOfService';
import Support from './policies/Support';
import About from './policies/About';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function Sidebar({
  visible,
  onClose,
  isDarkMode
}: SidebarProps) {
  const [activePolicyView, setActivePolicyView] = useState<'menu' | 'privacy' | 'terms' | 'support' | 'about'>('menu');

  const theme = {
    background: isDarkMode ? '#1a1a1a' : '#ffffff',
    surface: isDarkMode ? '#2d2d2d' : '#f5f5f5',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#cccccc' : '#666666',
    accent: '#667eea',
    border: isDarkMode ? '#444444' : '#e0e0e0',
    overlay: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)'
  };

  useEffect(() => {
    if (visible) {
      // Try to show cached categories immediately for snappier UI,
      // then refresh from the network in background.
      (async () => {
        try {
          // If the parent passed preloaded categories, use them first
          if (Array.isArray(preloadedCategories) && preloadedCategories.length > 0) {
            setCategories(preloadedCategories);
          } else {
            const cached = await AsyncStorage.getItem('ya_cached_categories');
            if (cached) {
              const parsed: string[] = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setCategories(parsed);
              }
            }
          }
        } catch (err) {
          // ignore cache read errors and continue to load fresh
          console.warn('Failed to read cached categories:', err);
        }

        // Always kick off a background refresh
        loadCategories();
      })();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const cats = await firebaseNewsService.getCategories();
      setCategories(cats);
      // Persist fresh categories for instant display next time
      try {
        await AsyncStorage.setItem('ya_cached_categories', JSON.stringify(cats));
      } catch (err) {
        console.warn('Failed to cache categories:', err);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const renderCategoryItem = ({ item }: { item: string }) => (
    <FastTouchable
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
      <Text style={[
        styles.categoryIcon,
        { color: selectedCategory === item ? '#ffffff' : theme.subText }
      ]}>
        •
      </Text>
    </FastTouchable>
  );

  const renderBookmarkItem = ({ item }: { item: NewsArticle }) => (
    <FastTouchable
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
    </FastTouchable>
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>Menu</Text>
            <FastTouchable onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.text }]}>×</Text>
            </FastTouchable>
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
            ) : null}
          </View>

          {/* Tab Navigation */}
          <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
            <FastTouchable
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
            </FastTouchable>
            <FastTouchable
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
            </FastTouchable>
            <FastTouchable
              style={[
                styles.tab,
                { backgroundColor: activeTab === 'policies' ? theme.accent : 'transparent' }
              ]}
              onPress={() => {
                setActiveTab('policies');
                setActivePolicyView('menu');
              }}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'policies' ? '#ffffff' : theme.text }
              ]}>
                Policies
              </Text>
            </FastTouchable>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {activeTab === 'categories' ? (
              <View style={styles.categoriesContainer}>
                <FastTouchable
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
                  <Text style={[
                    styles.categoryIcon,
                    { color: selectedCategory === null ? '#ffffff' : theme.subText }
                  ]}>
                    •
                  </Text>
                </FastTouchable>
                
                <FlatList
                  data={categories}
                  renderItem={renderCategoryItem}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.categoryList}
                />
              </View>
            ) : activeTab === 'bookmarks' ? (
              <View style={styles.bookmarksContainer}>
                {bookmarkedArticles.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No Saved Articles</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.subText }]}> 
                      Articles you save will appear here
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={bookmarkedArticles}
                    renderItem={renderBookmarkItem}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.bookmarkList}
                  />
                )}
              </View>
            ) : (
              <View style={styles.policiesContainer}>
                {activePolicyView === 'menu' ? (
                  <ScrollView showsVerticalScrollIndicator={false} style={styles.policiesMenu}>
                    <Text style={[styles.policiesSectionTitle, { color: theme.text }]}>
                      Legal & Support
                    </Text>
                    <Text style={[styles.policiesSectionSubtitle, { color: theme.subText }]}>
                      Important information about our app and services
                    </Text>
                    
                    <FastTouchable
                      style={[styles.policyMenuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => setActivePolicyView('privacy')}
                    >
                      <Text style={[styles.policyMenuText, { color: theme.text }]}>🔒 Privacy Policy</Text>
                      <Text style={[styles.policyMenuArrow, { color: theme.subText }]}>→</Text>
                    </FastTouchable>

                    <FastTouchable
                      style={[styles.policyMenuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => setActivePolicyView('terms')}
                    >
                      <Text style={[styles.policyMenuText, { color: theme.text }]}>📜 Terms of Service</Text>
                      <Text style={[styles.policyMenuArrow, { color: theme.subText }]}>→</Text>
                    </FastTouchable>

                    <FastTouchable
                      style={[styles.policyMenuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => setActivePolicyView('about')}
                    >
                      <Text style={[styles.policyMenuText, { color: theme.text }]}>ℹ️ About YuvaUpdate</Text>
                      <Text style={[styles.policyMenuArrow, { color: theme.subText }]}>→</Text>
                    </FastTouchable>

                    <FastTouchable
                      style={[styles.policyMenuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => setActivePolicyView('support')}
                    >
                      <Text style={[styles.policyMenuText, { color: theme.text }]}>💬 Support & Help</Text>
                      <Text style={[styles.policyMenuArrow, { color: theme.subText }]}>→</Text>
                    </FastTouchable>

                    <Text style={[styles.policyDisclaimer, { color: theme.subText }]}>
                      These policies are required for Google Play Store compliance and explain how we handle your data and provide our services.
                    </Text>
                  </ScrollView>
                ) : activePolicyView === 'privacy' ? (
                  <PrivacyPolicy onClose={() => setActivePolicyView('menu')} isDarkMode={isDarkMode} />
                ) : activePolicyView === 'terms' ? (
                  <TermsOfService onClose={() => setActivePolicyView('menu')} isDarkMode={isDarkMode} />
                ) : activePolicyView === 'support' ? (
                  <Support onClose={() => setActivePolicyView('menu')} isDarkMode={isDarkMode} />
                ) : activePolicyView === 'about' ? (
                  <About onClose={() => setActivePolicyView('menu')} isDarkMode={isDarkMode} />
                ) : null}
              </View>
            )}
          </View>
        </SafeAreaView>
        
        {/* Background overlay to close */}
                <FastTouchable 
          style={styles.backgroundOverlay} 
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 9000, // Ensure sidebar appears above other elements
  },
  sidebar: {
    width: '80%',
    maxWidth: 320,
    height: '100%',
    // react-native-web warns about shadow* props; use boxShadow on web
    ...(typeof navigator !== 'undefined' && navigator.product === 'ReactNative' ? {
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    } : {
      boxShadow: '2px 0px 10px rgba(0,0,0,0.25)'
    }),
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
  // Policies section styles
  policiesContainer: {
    flex: 1,
  },
  policiesMenu: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  policiesSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  policiesSectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  policyMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  policyMenuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  policyMenuArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  policyDisclaimer: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // guest styles removed - app supports guest users without prompting in sidebar
});
