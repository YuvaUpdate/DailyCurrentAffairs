import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import FastTouchable from './FastTouchable';
import VideoPlayerComponent from './VideoPlayerComponent';
import { newsService } from './NewsService';
import { firebaseNewsService } from './FirebaseNewsService';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from './firebase.config';
import { fileUploadService, UploadResult } from './FileUploadService';
import { testFirebaseStorage, checkStorageConfig } from './StorageTest';
import FirebaseTest from './FirebaseTest';
import PlatformDebugger from './PlatformDebugger';
import { NewsArticle } from './types';
import { notificationService } from './NotificationService';
import { UserProfile } from './AuthService';

const { width } = Dimensions.get('window');

interface AdminPanelProps {
  visible: boolean;
  onClose: () => void;
  onAddNews: (article: Omit<NewsArticle, 'id' | 'timestamp'>) => Promise<string | void>;
  onBulkAddNews?: (articles: NewsArticle[]) => Promise<void>;
  onLogout?: () => void;
  currentUser?: UserProfile | null;
}

export default function AdminPanel({ visible, onClose, onAddNews, onBulkAddNews, onLogout, currentUser }: AdminPanelProps) {
  // Limits for admin text inputs
  const HEADLINE_MAX = 200;
  const DESCRIPTION_MAX = 1000;
  const READTIME_MAX = 50;
  const SOURCEURL_MAX = 1000;
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [readTime, setReadTime] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'api' | 'manage' | 'categories'>('manual');
  
  // File upload states
  const [uploadedMedia, setUploadedMedia] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaSource, setMediaSource] = useState<'url' | 'upload'>('url');

  // Category management states
  const [categories, setCategories] = useState(['Breaking', 'Business', 'Entertainment', 'General', 'Health', 'Science', 'Sports', 'Technology']);
  const [newCategory, setNewCategory] = useState('');
  
  // News management states
  const [allNews, setAllNews] = useState<NewsArticle[]>([]);
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState(false);

  // Analytics states
  const [analytics, setAnalytics] = useState({
    articles: 0,
    categories: 0,
    users: 0,
    comments: 0,
    uploads: 0,
  });
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);

  const isSmallScreen = width && width < 420;

  useEffect(() => {
    // Load analytics when AdminPanel mounts
    loadAnalytics();
    // Also refresh categories
    loadCategoriesFromFirebase();
  }, []);

  // Load categories from Firebase on component mount
  React.useEffect(() => {
    loadCategoriesFromFirebase();
  }, []);

  const loadCategoriesFromFirebase = async () => {
    try {
      const firebaseCategories = await firebaseNewsService.getCategories();
      setCategories(firebaseCategories);
    } catch (error) {
      console.error('Error loading categories from Firebase:', error);
    }
  };

  // Load analytics counts for admin dashboard
  const loadAnalytics = async () => {
    try {
      setIsRefreshingAnalytics(true);
      // Articles (use doc ids to count exact stored items)
      const articles = await firebaseNewsService.getArticlesWithDocIds();
      const articlesCount = Array.isArray(articles) ? articles.length : 0;

      // Categories
      const cats = await firebaseNewsService.getCategories();
      const categoriesCount = Array.isArray(cats) ? cats.length : 0;

      // Users count (simple collection scan)
      let usersCount = 0;
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        usersCount = usersSnap.size;
      } catch (uErr) {
        console.warn('Could not count users collection:', uErr);
      }

      // Comments count (only non-deleted)
      let commentsCount = 0;
      try {
        const commentsQuery = query(collection(db, 'comments'), where('isDeleted', '==', false));
        const commentsSnap = await getDocs(commentsQuery);
        commentsCount = commentsSnap.size;
      } catch (cErr) {
        console.warn('Could not count comments:', cErr);
      }

      // Uploads count: estimate by counting articles that include uploaded media path
      const uploadsCount = articles.filter((a: any) => !!a.mediaPath || (a.image && (String(a.image).includes('news-images') || String(a.image).includes('news-videos')))).length;

      setAnalytics({
        articles: articlesCount,
        categories: categoriesCount,
        users: usersCount,
        comments: commentsCount,
        uploads: uploadsCount,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsRefreshingAnalytics(false);
    }
  };

  const handleSubmit = async () => {
    if (!headline || !description || !category || !sourceUrl) {
      Alert.alert('Error', 'Please fill in all required fields (Headline, Description, Category, and External Link)');
      return;
    }

    // Validate URL format
    try {
      new URL(sourceUrl);
    } catch (error) {
      Alert.alert('Error', 'Please enter a valid URL for the external link (e.g., https://example.com/article)');
      return;
    }

    // Use uploaded media URL if available, otherwise use provided URL or placeholder
    let mediaUrl = imageUrl;
    if (uploadedMedia) {
      mediaUrl = uploadedMedia.url;
    } else if (!mediaUrl) {
      mediaUrl = `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(category)}`;
    }

    const newArticle = {
      headline: headline.substring(0, HEADLINE_MAX),
      description: description.substring(0, DESCRIPTION_MAX),
      image: mediaUrl,
      category,
      readTime: (readTime || '2 min read').substring(0, READTIME_MAX),
      sourceUrl: sourceUrl.substring(0, SOURCEURL_MAX),
      mediaType: uploadedMedia?.type || 'image', // Add media type info
      mediaPath: uploadedMedia?.path, // Store path for potential deletion
    };

    // Clean undefined fields before sending to Firestore (updateDoc rejects undefined values)
    const articlePayload: any = { ...newArticle };
    Object.keys(articlePayload).forEach((key) => {
      if (articlePayload[key] === undefined) {
        delete articlePayload[key];
      }
    });

    // Optimistic UI: insert a temporary article locally so admin sees it immediately
    const tempId = `temp-${Date.now()}`;
    const tempArticle: NewsArticle = {
      id: tempId as any,
      headline: articlePayload.headline,
      description: articlePayload.description,
      image: articlePayload.image,
      category: articlePayload.category,
      readTime: articlePayload.readTime,
      sourceUrl: articlePayload.sourceUrl,
      mediaType: articlePayload.mediaType || 'image',
      mediaPath: articlePayload.mediaPath,
      timestamp: new Date().toISOString(),
    } as NewsArticle;

    // Show immediate feedback in the admin list
    setAllNews(prev => [tempArticle, ...(prev || [])]);

    setIsLoading(true);
    try {
      let result: any = null;
      if (editingNews) {
        const updateId = (editingNews as any).docId ? (editingNews as any).docId : editingNews.id;
        await firebaseNewsService.updateArticle(updateId, articlePayload);
        result = updateId;
        Alert.alert('Success', 'News article updated successfully!');
        // Refresh admin list quickly
        const refreshed = await firebaseNewsService.getArticlesWithDocIds();
        setAllNews(refreshed);
      } else {
        result = await onAddNews(articlePayload);
        Alert.alert('Success', 'News article added successfully!');
        // Immediately trigger a local/native notification so admin sees it right away
        try {
          notificationService.sendNewArticleNotification({ headline: articlePayload.headline, ...articlePayload });
        } catch (e) {
          console.warn('Failed to trigger immediate notification', e);
        }
        // Refresh admin list so the temporary article is replaced with persisted one
        try {
          const refreshed = await firebaseNewsService.getArticlesWithDocIds();
          setAllNews(refreshed);
        } catch (e) {
          console.warn('Failed to refresh articles after add', e);
        }
      }

      // Reset form only after successful persistence
      setHeadline('');
      setDescription('');
      setImageUrl('');
      setCategory('');
      setReadTime('');
      setSourceUrl('');
      setUploadedMedia(null);
      setMediaSource('url');
      setEditingNews(null); // Clear editing state

      console.log('AdminPanel: Operation result:', result);
    } catch (error) {
      console.error('AdminPanel: Error with article operation:', error);
      Alert.alert('Error', `Failed to ${editingNews ? 'update' : 'add'} article. See console for details.`);
      // rollback optimistic temp article
      setAllNews(prev => (prev || []).filter(a => String(a.id) !== String(tempId)));
    } finally {
      setIsLoading(false);
    }
  };

  // Category Management Functions
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    if (categories.includes(newCategory.trim())) {
      Alert.alert('Error', 'Category already exists');
      return;
    }
    
    try {
      const updatedCategories = [...categories, newCategory.trim()];
      await firebaseNewsService.saveCategories(updatedCategories);
      setCategories(updatedCategories);
      setNewCategory('');
      Alert.alert('Success', `Category "${newCategory.trim()}" added successfully!`);
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category to Firebase');
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the category "${categoryToRemove}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedCategories = categories.filter(cat => cat !== categoryToRemove);
              await firebaseNewsService.saveCategories(updatedCategories);
              setCategories(updatedCategories);
              Alert.alert('Success', `Category "${categoryToRemove}" deleted successfully!`);
            } catch (error) {
              console.error('Error removing category:', error);
              Alert.alert('Error', 'Failed to remove category from Firebase');
            }
          }
        }
      ]
    );
  };

  // News Management Functions
  const loadAllNews = async () => {
    try {
      setIsLoadingNews(true);
      const news = await firebaseNewsService.getArticlesWithDocIds();
      console.log('Loaded news articles:', news.length);
      setAllNews(news);
      
      if (news.length === 0) {
        Alert.alert('Info', 'No news articles found in Firebase');
      } else {
        Alert.alert('Success', `Loaded ${news.length} news articles successfully!`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load news articles');
      console.error('Error loading news:', error);
    } finally {
      setIsLoadingNews(false);
    }
  };

  const handleEditNews = (article: NewsArticle) => {
    setEditingNews(article);
    setHeadline(article.headline);
    setDescription(article.description);
    setImageUrl(article.image);
    setCategory(article.category);
    setReadTime(article.readTime || '');
    setSourceUrl(article.sourceUrl || '');
    setActiveTab('manual');
    Alert.alert('Info', 'Article loaded for editing. You can now modify it in the "Add News" tab.');
  };

  const handleDeleteNews = (article: NewsArticle) => {
    console.log('🗑️ Delete button clicked for article:', article.headline, 'ID:', article.id);
    
    // TEMPORARY: Skip Alert.alert for debugging
    console.log('🗑️ [DEBUG] Bypassing Alert.alert for testing...');
    performDelete(article);
  };

  const performDelete = async (article: NewsArticle) => {
    try {
      console.log('🗑️ Starting delete operation for article ID:', article.id);
      console.log('🗑️ About to call firebaseNewsService.deleteArticle...');
      
  await firebaseNewsService.deleteArticle(article);
      console.log('🗑️ Delete operation completed, reloading articles from Firebase');
      
      // Reload articles from Firebase to ensure sync
      const updatedNews = await firebaseNewsService.getArticlesWithDocIds();
      setAllNews(updatedNews);
      
      Alert.alert('Success', 'News article deleted successfully!');
      console.log('🗑️ Articles reloaded, current count:', updatedNews.length);
    } catch (error: any) {
      console.error('🗑️ Error deleting news:', error);
      console.error('🗑️ Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      Alert.alert('Error', `Failed to delete news article: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleQuickAdd = async (type: string) => {
    let quickArticle;
    
    switch (type) {
      case 'breaking':
        quickArticle = {
          headline: 'Breaking: Major News Update',
          description: 'This is a breaking news story that just happened. More details will be updated as the story develops.',
          category: 'Breaking',
          readTime: '1 min read',
        };
        break;
      case 'tech':
        quickArticle = {
          headline: 'Tech: New Innovation Announced',
          description: 'A major technology company has announced a groundbreaking innovation that could revolutionize the industry.',
          category: 'Technology',
          readTime: '3 min read',
        };
        break;
      case 'sports':
        quickArticle = {
          headline: 'Sports: Championship Update',
          description: 'Latest updates from the ongoing championship with exciting developments in today\'s matches.',
          category: 'Sports',
          readTime: '2 min read',
        };
        break;
      default:
        return;
    }

    const article = {
      ...quickArticle,
      image: `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(quickArticle.category)}`,
      sourceUrl: `https://example.com/news/${quickArticle.headline.replace(/\s+/g, '-').toLowerCase()}`,
    };

    try {
      await onAddNews(article);
      Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} news added!`);
    } catch (error) {
      console.error('AdminPanel: Quick add failed:', error);
      Alert.alert('Error', 'Failed to add quick article');
    }
  };

  // File Upload Functions
  const handleMediaUpload = async () => {
    setIsUploading(true);
    try {
      const mediaUri = await fileUploadService.showMediaPicker('both');
      if (mediaUri) {
        const mediaType = mediaUri.includes('.mp4') || mediaUri.includes('video') ? 'video' : 'image';
        const uploadResult = await fileUploadService.uploadFile(mediaUri, mediaType, category);
        
        if (uploadResult) {
          setUploadedMedia(uploadResult);
          setMediaSource('upload');
          Alert.alert('Success', `${mediaType} uploaded successfully!`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload media');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveUploadedMedia = () => {
    Alert.alert(
      'Remove Media',
      'Are you sure you want to remove the uploaded media?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setUploadedMedia(null);
            setMediaSource('url');
          },
        },
      ]
    );
  };

  // API Integration Functions
  const handleFetchLatestNews = async (category?: string) => {
    setIsLoading(true);
    try {
      const articles = await newsService.fetchLatestNews(category);
      
      if (onBulkAddNews && articles.length > 0) {
        try {
          await onBulkAddNews(articles);
          Alert.alert('Success', `Added ${articles.length} news articles from API!`);
        } catch (error) {
          console.error('AdminPanel: Bulk add failed:', error);
          Alert.alert('Error', 'Failed to add bulk articles. See console for details.');
        }
      } else {
        Alert.alert('Info', 'No new articles found for this category. Try a different category or check your internet connection.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch news from API. Please check your internet connection and API key.');
      console.error('API Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchNews = async (query: string) => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }
    
    setIsLoading(true);
    try {
      const articles = await newsService.searchNews(query);
      
      if (onBulkAddNews && articles.length > 0) {
        onBulkAddNews(articles);
        Alert.alert('Success', `Found and added ${articles.length} articles for "${query}"`);
      } else {
        Alert.alert('Info', `No articles found for "${query}"`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search news. Please check your connection.');
      console.error('Search Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <FastTouchable 
              onPress={() => {
                if (onLogout) {
                  Alert.alert(
                    'Logout',
                    'Are you sure you want to logout from admin panel?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Logout', style: 'destructive', onPress: onLogout }
                    ]
                  );
                }
              }}
              style={styles.logoutButton}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </FastTouchable>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <FastTouchable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </FastTouchable>
        </View>

  {/* Tab Navigation */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'center' }}
            style={styles.tabContainer}
          >
            <FastTouchable
              style={[
                styles.tab,
                activeTab === 'manual' && styles.activeTab,
                isSmallScreen ? styles.tabSmall : undefined,
              ]}
              onPress={() => setActiveTab('manual')}
            >
              <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText, isSmallScreen ? styles.tabSmallText : undefined]}>Add News</Text>
            </FastTouchable>

            <FastTouchable
              style={[
                styles.tab,
                activeTab === 'api' && styles.activeTab,
                isSmallScreen ? styles.tabSmall : undefined,
              ]}
              onPress={() => setActiveTab('api')}
            >
              <Text style={[styles.tabText, activeTab === 'api' && styles.activeTabText, isSmallScreen ? styles.tabSmallText : undefined]}>API Import</Text>
            </FastTouchable>

            <FastTouchable
              style={[
                styles.tab,
                activeTab === 'manage' && styles.activeTab,
                isSmallScreen ? styles.tabSmall : undefined,
              ]}
              onPress={() => {
                setActiveTab('manage');
                loadAllNews();
              }}
            >
              <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText, isSmallScreen ? styles.tabSmallText : undefined]}>Manage News</Text>
            </FastTouchable>

            <FastTouchable
              style={[
                styles.tab,
                activeTab === 'categories' && styles.activeTab,
                isSmallScreen ? styles.tabSmall : undefined,
              ]}
              onPress={() => setActiveTab('categories')}
            >
              <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText, isSmallScreen ? styles.tabSmallText : undefined]}>Categories</Text>
            </FastTouchable>
          </ScrollView>

        <ScrollView style={styles.content}>
          {/* Analytics strip (responsive) */}
          <View style={{ marginBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.articles}</Text>
                <Text style={styles.analyticsLabel}>Articles</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.categories}</Text>
                <Text style={styles.analyticsLabel}>Categories</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.users}</Text>
                <Text style={styles.analyticsLabel}>Users</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.comments}</Text>
                <Text style={styles.analyticsLabel}>Comments</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.uploads}</Text>
                <Text style={styles.analyticsLabel}>Uploads</Text>
              </View>
            </ScrollView>
          </View>
          {activeTab === 'manual' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Add / Edit News</Text>
                <Text style={styles.label}>Headline</Text>
                <TextInput value={headline} onChangeText={setHeadline} style={styles.input} maxLength={HEADLINE_MAX} />
                <Text style={styles.label}>Description</Text>
                <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} multiline maxLength={DESCRIPTION_MAX} />
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal style={styles.categoryScroll}>
                  {categories.map(cat => (
                    <FastTouchable key={cat} style={[styles.categoryButton, { backgroundColor: category === cat ? '#667eea' : 'rgba(255,255,255,0.06)' }]} onPress={() => setCategory(cat)}>
                      <Text style={styles.categoryButtonText}>{cat}</Text>
                    </FastTouchable>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Media</Text>
                <View style={styles.mediaSourceToggle}>
                  <FastTouchable onPress={() => setMediaSource('url')} style={[styles.toggleButton, { backgroundColor: mediaSource === 'url' ? 'rgba(255,255,255,0.04)' : 'transparent' }]}>
                    <Text style={styles.toggleButtonText}>Use URL</Text>
                  </FastTouchable>
                  <FastTouchable onPress={() => setMediaSource('upload')} style={[styles.toggleButton, { backgroundColor: mediaSource === 'upload' ? 'rgba(255,255,255,0.04)' : 'transparent' }]}>
                    <Text style={styles.toggleButtonText}>Upload</Text>
                  </FastTouchable>
                </View>

                {mediaSource === 'url' && <TextInput placeholder="Image URL" value={imageUrl} onChangeText={setImageUrl} style={styles.input} />}
                {mediaSource === 'upload' && (
                  <View>
                    <FastTouchable style={styles.uploadButton} onPress={handleMediaUpload}>
                      <Text style={styles.uploadButtonText}>{isUploading ? 'Uploading...' : 'Pick & Upload Media'}</Text>
                      <Text style={styles.uploadButtonSubtext}>Supports images & videos</Text>
                    </FastTouchable>
                    {uploadedMedia && (
                      <View style={styles.uploadedMediaPreview}>
                        {uploadedMedia.type === 'image' && <Image source={{ uri: uploadedMedia.url }} style={styles.uploadedImage} />}
                        {uploadedMedia.type === 'video' && (
                          <View style={styles.videoContainer}>
                            <VideoPlayerComponent videoUrl={uploadedMedia.url} style={styles.uploadedVideo} />
                            <Text style={styles.videoLabel}>Uploaded Video</Text>
                          </View>
                        )}
                        <FastTouchable style={styles.removeMediaButton} onPress={handleRemoveUploadedMedia}>
                          <Text style={styles.removeMediaText}>Remove Media</Text>
                        </FastTouchable>
                      </View>
                    )}
                  </View>
                )}

                <Text style={styles.label}>Read Time (e.g. "2 min read")</Text>
                <TextInput placeholder="Read time" value={readTime} onChangeText={setReadTime} style={styles.input} maxLength={READTIME_MAX} />

                <Text style={styles.label}>External Link (Required)</Text>
                <TextInput placeholder="https://example.com/article" value={sourceUrl} onChangeText={setSourceUrl} style={styles.input} keyboardType="url" autoCapitalize="none" maxLength={SOURCEURL_MAX} />

                <FastTouchable style={[styles.submitButton, isLoading && { opacity: 0.7 }]} onPress={() => { if (!isLoading) handleSubmit(); }}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>{editingNews ? 'Update Article' : 'Add Article'}</Text>
                  )}
                </FastTouchable>
                {/* Small preview box shown before posting */}
                {(headline || description) && (
                  <View style={styles.previewSection}>
                    <Text style={styles.previewTitle}>Preview</Text>
                    <View style={styles.previewCard}>
                      {/** Preview image */}
                      <Image source={{ uri: uploadedMedia?.url || imageUrl || `https://via.placeholder.com/400x200/667eea/ffffff?text=${encodeURIComponent(category || 'Preview')}` }} style={styles.previewImage} />
                      <View style={styles.previewContent}>
                        <Text style={styles.previewHeadline}>{headline || 'Headline preview'}</Text>
                        <Text style={styles.previewDescription} numberOfLines={3}>{description || 'Description preview will appear here.'}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                          <Text style={styles.previewMetaText}>{category || 'Uncategorized'}</Text>
                          <Text style={styles.previewMetaText}>{readTime || '—'}</Text>
                        </View>
                        {sourceUrl ? (
                          <Text style={[styles.previewMetaText, { marginTop: 8 }]} numberOfLines={1}>{sourceUrl}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                )}
              </View>
          )}

          {activeTab === 'api' && (
            <View>
              <View style={styles.apiSection}>
                <Text style={styles.sectionTitle}>API Integration</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <FastTouchable style={styles.apiButton} onPress={() => handleFetchLatestNews() }>
                    <Text style={styles.apiButtonText}>Fetch Latest</Text>
                  </FastTouchable>
                  <FastTouchable style={styles.apiButton} onPress={() => handleFetchLatestNews('technology') }>
                    <Text style={styles.apiButtonText}>Fetch Tech</Text>
                  </FastTouchable>
                  <FastTouchable style={styles.apiButton} onPress={() => handleFetchLatestNews('sports') }>
                    <Text style={styles.apiButtonText}>Fetch Sports</Text>
                  </FastTouchable>
                </View>
                <TextInput placeholder="Search query" onSubmitEditing={(e: any) => handleSearchNews(e.nativeEvent.text)} style={styles.searchInput} />
              </View>
            </View>
          )}

          {activeTab === 'manage' && (
            <View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Manage News</Text>
                <FastTouchable style={[styles.apiButton, { marginVertical: 10 }]} onPress={loadAllNews}>
                  <Text style={styles.apiButtonText}>Reload News From Firebase</Text>
                </FastTouchable>

                {isLoadingNews ? (
                  <ActivityIndicator color="#667eea" />
                ) : (
                  allNews.map(article => (
                    <View key={String((article as any).docId ?? article.id)} style={[styles.previewCard, { marginVertical: 8 }]}> 
                      <View style={styles.previewContent}>
                        <Text style={styles.previewHeadline}>{article.headline}</Text>
                        <Text style={styles.previewDescription}>{article.description}</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                          <FastTouchable onPress={() => handleEditNews(article)}>
                            <Text style={{ color: '#4ade80' }}>Edit</Text>
                          </FastTouchable>
                          <FastTouchable onPress={() => performDelete(article)}>
                            <Text style={{ color: '#ff6b6b' }}>Delete</Text>
                          </FastTouchable>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {activeTab === 'categories' && (
            <View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Categories</Text>
                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <TextInput placeholder="New category" value={newCategory} onChangeText={setNewCategory} style={[styles.input, { flex: 1, marginRight: 8 }]} />
                  <FastTouchable style={styles.apiButton} onPress={handleAddCategory}>
                    <Text style={styles.apiButtonText}>Add</Text>
                  </FastTouchable>
                </View>
                <ScrollView horizontal style={styles.categoryScroll}>
                  {categories.map(cat => (
                    <View key={cat} style={{ marginRight: 10, alignItems: 'center' }}>
                      <FastTouchable style={[styles.categoryButton, { backgroundColor: 'rgba(255,255,255,0.04)' }]} onPress={() => {}}>
                        <Text style={styles.categoryButtonText}>{cat}</Text>
                      </FastTouchable>
                      <FastTouchable onPress={() => handleRemoveCategory(cat)}>
                        <Text style={{ color: '#ff6b6b', marginTop: 6 }}>Delete</Text>
                      </FastTouchable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  quickAddContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAddButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  quickAddText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 15,
    color: '#ffffff',
  fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textArea: {
  height: 120,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    marginVertical: 5,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  previewSection: {
    marginTop: 20,
  },
  previewTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  previewCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewImage: {
    width: '100%',
    height: 120,
  },
  previewContent: {
    padding: 15,
  },
  previewHeadline: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewDescription: {
    color: 'rgba(255,255,255,0.8)',
  fontSize: 12,
  lineHeight: 16,
    marginBottom: 8,
  },
  previewMeta: {
    marginTop: 5,
  },
  previewMetaText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  analyticsContainer: {
  flexDirection: 'row',
  justifyContent: 'flex-start',
  alignItems: 'center',
  },
  analyticsCard: {
  width: 110,
  backgroundColor: 'rgba(255,255,255,0.05)',
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 10,
  alignItems: 'center',
  marginRight: 8,
  },
  analyticsNumber: {
    color: '#ffffff',
  fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  analyticsLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#667eea',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  tabSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 90,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  tabSmallText: {
    fontSize: 13,
  },
  // API Integration Styles
  apiSection: {
    margin: 20,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  apiButton: {
    backgroundColor: '#4ade80',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 5,
    marginHorizontal: 5,
    minWidth: 120,
  },
  apiButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 15,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 10,
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
  },
  // File Upload Styles
  mediaSourceToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 3,
    marginBottom: 15,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 2,
  },
  toggleButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadSection: {
    marginVertical: 10,
  },
  uploadButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    marginVertical: 10,
  },
  uploadButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  uploadButtonSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  uploadedMediaPreview: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
  },
  uploadedImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  videoContainer: {
    alignItems: 'center',
  },
  uploadedVideo: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  videoLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  removeMediaButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  removeMediaText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
  },
  characterCount: {
    fontSize: 11,
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'right',
    fontWeight: '500',
  },
  // News Management Styles
  newsList: {
    maxHeight: 400,
  },
  newsItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  newsItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  newsItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 10,
  },
  newsItemCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newsItemDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    lineHeight: 20,
  },
  newsItemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  newsActionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  newsActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  // Category Management Styles
  categoryInputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  categoryInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  addCategoryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCategoryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  categoriesList: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  removeCategoryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeCategoryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});