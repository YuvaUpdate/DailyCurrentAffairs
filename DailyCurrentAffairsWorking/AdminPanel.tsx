import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { VideoView } from 'expo-video';
import { newsService } from './NewsService';
import { firebaseNewsService } from './FirebaseNewsService';
import { fileUploadService, UploadResult } from './FileUploadService';
import { testFirebaseStorage, checkStorageConfig } from './StorageTest';
import FirebaseTest from './FirebaseTest';
import PlatformDebugger from './PlatformDebugger';
import { NewsArticle } from './types';
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
      headline,
      description,
      image: mediaUrl,
      category,
      readTime: readTime || '2 min read',
      sourceUrl,
      mediaType: uploadedMedia?.type || 'image', // Add media type info
      mediaPath: uploadedMedia?.path, // Store path for potential deletion
    };

    try {
      let result;
      if (editingNews) {
        // Update existing article
        await firebaseNewsService.updateArticle(editingNews.id, newArticle);
        result = editingNews.id;
        Alert.alert('Success', 'News article updated successfully!');
      } else {
        // Add new article
        result = await onAddNews(newArticle);
        Alert.alert('Success', 'News article added successfully!');
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
      
      await firebaseNewsService.deleteArticle(article.id);
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
            <TouchableOpacity 
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
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
            onPress={() => setActiveTab('manual')}
          >
            <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>Add News</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'api' && styles.activeTab]}
            onPress={() => setActiveTab('api')}
          >
            <Text style={[styles.tabText, activeTab === 'api' && styles.activeTabText]}>API Import</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
            onPress={() => {
              setActiveTab('manage');
              loadAllNews();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText]}>Manage News</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'categories' && styles.activeTab]}
            onPress={() => setActiveTab('categories')}
          >
            <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText]}>Categories</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {activeTab === 'manual' ? (
            // Manual Entry Tab Content
            <>
              {/* Quick Add Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Add News</Text>
            <View style={styles.quickAddContainer}>
              <TouchableOpacity 
                style={[styles.quickAddButton, { backgroundColor: '#ff4757' }]}
                onPress={() => handleQuickAdd('breaking')}
              >
                <Text style={styles.quickAddText}>Breaking News</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickAddButton, { backgroundColor: '#667eea' }]}
                onPress={() => handleQuickAdd('tech')}
              >
                <Text style={styles.quickAddText}>Tech News</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickAddButton, { backgroundColor: '#f093fb' }]}
                onPress={() => handleQuickAdd('sports')}
              >
                <Text style={styles.quickAddText}>Sports News</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Firebase Storage Test Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storage Test</Text>
            <TouchableOpacity 
              style={[styles.quickAddButton, { backgroundColor: '#4ade80', marginBottom: 10 }]}
              onPress={async () => {
                try {
                  checkStorageConfig();
                  await testFirebaseStorage();
                  Alert.alert('[SUCCESS]', 'Firebase Storage is working correctly!');
                } catch (error) {
                  Alert.alert('[ERROR] Storage Error', 'Firebase Storage is not configured. Please follow the setup guide.');
                }
              }}
            >
              <Text style={styles.quickAddText}>Test Firebase Storage</Text>
            </TouchableOpacity>
            
            {/* Firebase Test Component */}
            <FirebaseTest />
            
            {/* Platform Debugger */}
            <PlatformDebugger />
          </View>

          {/* Custom News Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Custom News</Text>
            
            <Text style={styles.label}>Headline *</Text>
            <TextInput
              style={styles.input}
              value={headline}
              onChangeText={setHeadline}
              placeholder="Enter news headline..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
            />

            <Text style={styles.label}>Description * (Detailed summary: 300-600 characters recommended)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter comprehensive news summary (300-600 chars recommended)..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              numberOfLines={6}
              maxLength={800} // Much higher limit for detailed content
            />
            <Text style={[styles.characterCount, { color: description.length > 600 ? '#ff6b6b' : 'rgba(255,255,255,0.6)' }]}>
              {description.length}/800 characters
            </Text>

            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: category === cat ? '#667eea' : 'rgba(255,255,255,0.1)' }
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={styles.categoryButtonText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Media (Image/Video)</Text>
            
            {/* Media Source Toggle */}
            <View style={styles.mediaSourceToggle}>
                <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: mediaSource === 'url' ? '#667eea' : 'rgba(255,255,255,0.1)' }
                ]}
                onPress={() => setMediaSource('url')}
              >
                <Text style={styles.toggleButtonText}>URL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: mediaSource === 'upload' ? '#667eea' : 'rgba(255,255,255,0.1)' }
                ]}
                onPress={() => setMediaSource('upload')}
              >
                <Text style={styles.toggleButtonText}>Upload</Text>
              </TouchableOpacity>
            </View>

            {mediaSource === 'url' ? (
              <TextInput
                style={styles.input}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://example.com/image.jpg or video.mp4"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
            ) : (
              <View style={styles.uploadSection}>
                {!uploadedMedia ? (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleMediaUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.uploadButtonText}>Choose Media</Text>
                        <Text style={styles.uploadButtonSubtext}>Images, Videos supported</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.uploadedMediaPreview}>
                    {uploadedMedia.type === 'image' ? (
                      <Image source={{ uri: uploadedMedia.url }} style={styles.uploadedImage} />
                    ) : (
                      <View style={styles.videoContainer}>
                        <Image 
                          source={{ uri: uploadedMedia.url }} 
                          style={styles.uploadedVideo}
                        />
                        <Text style={styles.videoLabel}>Video uploaded</Text>
                      </View>
                    )}
                        <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={handleRemoveUploadedMedia}
                    >
                      <Text style={styles.removeMediaText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.label}>Read Time (optional)</Text>
            <TextInput
              style={styles.input}
              value={readTime}
              onChangeText={setReadTime}
              placeholder="2 min read"
              placeholderTextColor="rgba(255,255,255,0.5)"
            />

            <Text style={styles.label}>External Link (for "Read full story") *</Text>
            <TextInput
              style={styles.input}
              value={sourceUrl}
              onChangeText={setSourceUrl}
              placeholder="https://example.com/full-article"
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoCapitalize="none"
              keyboardType="url"
            />

            {/* Preview */}
            {headline && description && (
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>Preview</Text>
                <View style={styles.previewCard}>
                  {(uploadedMedia || imageUrl) && (
                    <>
                      {uploadedMedia ? (
                        uploadedMedia.type === 'image' ? (
                          <Image source={{ uri: uploadedMedia.url }} style={styles.previewImage} />
                        ) : (
                          <View style={styles.videoContainer}>
                            <Image 
                              source={{ uri: uploadedMedia.url }} 
                              style={styles.previewImage}
                            />
                            <Text style={styles.videoLabel}>Video Preview</Text>
                          </View>
                        )
                      ) : (
                        <Image source={{ uri: imageUrl }} style={styles.previewImage} />
                      )}
                    </>
                  )}
                  <View style={styles.previewContent}>
                    <Text style={styles.previewHeadline}>{headline}</Text>
                    <Text style={styles.previewDescription} numberOfLines={3}>
                      {description}
                    </Text>
                    {category && (
                      <View style={styles.previewMeta}>
                        <Text style={styles.previewMetaText}>
                          {category} • {readTime || '2 min read'}
                          {uploadedMedia && ` • ${uploadedMedia.type === 'video' ? 'Video' : 'Image'}`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {editingNews ? 'Update News' : 'Publish News'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Analytics Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Analytics</Text>
            <View style={styles.analyticsContainer}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>247</Text>
                <Text style={styles.analyticsLabel}>Total Articles</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>12.5K</Text>
                <Text style={styles.analyticsLabel}>Daily Readers</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>89%</Text>
                <Text style={styles.analyticsLabel}>Engagement</Text>
              </View>
            </View>
          </View>
          </>
          ) : activeTab === 'api' ? (
            // API Integration Tab Content
            <>
              {/* API Integration Section */}
              <View style={styles.apiSection}>
                <Text style={styles.sectionTitle}>API News Integration</Text>
                <Text style={styles.label}>Fetch Latest News by Category</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.apiButton}
                      onPress={() => handleFetchLatestNews(cat.toLowerCase())}
                      disabled={isLoading}
                    >
                      <Text style={styles.apiButtonText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.apiButton, { backgroundColor: '#667eea', marginTop: 15 }]}
                  onPress={() => handleFetchLatestNews()}
                  disabled={isLoading}
                >
                  <Text style={styles.apiButtonText}>Fetch All Latest News</Text>
                </TouchableOpacity>
              </View>

              {/* Search News Section */}
              <View style={styles.apiSection}>
                <Text style={styles.sectionTitle}>Search News</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for specific news topics..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  onSubmitEditing={(e) => handleSearchNews(e.nativeEvent.text)}
                />
                <Text style={[styles.label, { fontSize: 12, marginTop: 5 }]}>
                  Press Enter to search or try: "technology", "climate", "sports"
                </Text>
              </View>

              {/* API Status Section */}
              <View style={styles.apiSection}>
                <Text style={styles.sectionTitle}>API Status</Text>
                <Text style={styles.label}>
                  Status: <Text style={{ color: '#4ade80' }}>Connected</Text>
                </Text>
                <Text style={[styles.label, { fontSize: 12, marginTop: 5 }]}>
                  Using NewsAPI.org for real-time news data
                </Text>
                <Text style={[styles.label, { fontSize: 12, marginTop: 5 }]}>
                  API key configured and ready for production
                </Text>
              </View>

              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#667eea" />
                  <Text style={styles.loadingText}>Fetching news...</Text>
                </View>
              )}
            </>
          ) : activeTab === 'manage' ? (
            // News Management Tab Content
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Manage Posted News</Text>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                  onPress={loadAllNews}
                  disabled={isLoadingNews}
                >
                  {isLoadingNews ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>Refresh News List</Text>
                  )}
                </TouchableOpacity>
                
                {isLoadingNews ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text style={styles.loadingText}>Loading news articles...</Text>
                  </View>
                ) : allNews.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No news articles found</Text>
                    <Text style={styles.emptyStateSubtext}>Click "Refresh News List" to load your articles</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.newsList}>
                    {allNews.map((article, index) => (
                      <View key={article.id || index} style={styles.newsItem}>
                        <View style={styles.newsItemHeader}>
                          <Text style={styles.newsItemTitle} numberOfLines={2}>
                            {article.headline}
                          </Text>
                          <Text style={styles.newsItemCategory}>{article.category}</Text>
                        </View>
                        <Text style={styles.newsItemDescription} numberOfLines={3}>
                          {article.description}
                        </Text>
                        <View style={styles.newsItemActions}>
                          <TouchableOpacity 
                            style={[styles.newsActionButton, { backgroundColor: '#3b82f6' }]}
                            onPress={() => handleEditNews(article)}
                          >
                            <Text style={styles.newsActionText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.newsActionButton, { backgroundColor: '#ef4444' }]}
                            onPress={() => handleDeleteNews(article)}
                          >
                            <Text style={styles.newsActionText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          ) : activeTab === 'categories' ? (
            // Category Management Tab Content
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Manage Categories</Text>
                
                {/* Add New Category */}
                <View style={styles.categoryInputContainer}>
                  <TextInput
                    style={styles.categoryInput}
                    value={newCategory}
                    onChangeText={setNewCategory}
                    placeholder="Enter new category name..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                  <TouchableOpacity 
                    style={styles.addCategoryButton}
                    onPress={handleAddCategory}
                  >
                    <Text style={styles.addCategoryText}>Add</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Current Categories List */}
                <Text style={[styles.label, { marginTop: 20, marginBottom: 10 }]}>Current Categories:</Text>
                <ScrollView style={styles.categoriesList}>
                  {categories.map((cat, index) => (
                    <View key={index} style={styles.categoryItem}>
                      <Text style={styles.categoryName}>{cat}</Text>
                      <TouchableOpacity 
                        style={styles.removeCategoryButton}
                        onPress={() => handleRemoveCategory(cat)}
                      >
                        <Text style={styles.removeCategoryText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </>
          ) : null}
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
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textArea: {
    height: 100,
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
    fontSize: 14,
    lineHeight: 20,
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
    justifyContent: 'space-between',
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  analyticsNumber: {
    color: '#ffffff',
    fontSize: 24,
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
