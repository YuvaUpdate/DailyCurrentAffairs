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
  onAddNews: (article: Omit<NewsArticle, 'id' | 'timestamp'>) => void;
  onBulkAddNews?: (articles: NewsArticle[]) => void;
  onLogout?: () => void;
  currentUser?: UserProfile | null;
}

export default function AdminPanel({ visible, onClose, onAddNews, onBulkAddNews, onLogout, currentUser }: AdminPanelProps) {
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [readTime, setReadTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'api'>('manual');
  
  // File upload states
  const [uploadedMedia, setUploadedMedia] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaSource, setMediaSource] = useState<'url' | 'upload'>('url');

  const categories = ['Breaking', 'Business', 'Entertainment', 'General', 'Health', 'Science', 'Sports', 'Technology'];

  const handleSubmit = () => {
    if (!headline || !description || !category) {
      Alert.alert('Error', 'Please fill in all required fields');
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
      mediaType: uploadedMedia?.type || 'image', // Add media type info
      mediaPath: uploadedMedia?.path, // Store path for potential deletion
    };

    onAddNews(newArticle);
    
    // Reset form
    setHeadline('');
    setDescription('');
    setImageUrl('');
    setCategory('');
    setReadTime('');
    setUploadedMedia(null);
    setMediaSource('url');
    
    Alert.alert('Success', 'News article added successfully!');
  };

  const handleQuickAdd = (type: string) => {
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
    };

    onAddNews(article);
    Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} news added!`);
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
        onBulkAddNews(articles);
        Alert.alert('Success', `Added ${articles.length} news articles from API!`);
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
            <Text style={styles.logoutButtonText}>🔓 Logout</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
            onPress={() => setActiveTab('manual')}
          >
            <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>Manual Entry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'api' && styles.activeTab]}
            onPress={() => setActiveTab('api')}
          >
            <Text style={[styles.tabText, activeTab === 'api' && styles.activeTabText]}>API Integration</Text>
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
                  Alert.alert('✅ Success', 'Firebase Storage is working correctly!');
                } catch (error) {
                  Alert.alert('❌ Storage Error', 'Firebase Storage is not configured. Please follow the setup guide.');
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

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter news description..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              numberOfLines={4}
            />

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
                <Text style={styles.toggleButtonText}>🔗 URL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  { backgroundColor: mediaSource === 'upload' ? '#667eea' : 'rgba(255,255,255,0.1)' }
                ]}
                onPress={() => setMediaSource('upload')}
              >
                <Text style={styles.toggleButtonText}>📁 Upload</Text>
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
                        <Text style={styles.uploadButtonText}>📷 Choose Media</Text>
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
                        <Text style={styles.videoLabel}>📹 Video uploaded</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={handleRemoveUploadedMedia}
                    >
                      <Text style={styles.removeMediaText}>✕ Remove</Text>
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
                            <Text style={styles.videoLabel}>📹 Video Preview</Text>
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
              <Text style={styles.submitButtonText}>Publish News</Text>
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
          ) : (
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
          )}
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
});
