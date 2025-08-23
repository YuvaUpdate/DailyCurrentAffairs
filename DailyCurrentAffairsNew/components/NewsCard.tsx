import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NewsArticle } from '../types';
import { StorageService } from '../services/storage';
import { SharingService } from '../services/sharingService';
import { AudioService } from '../services/audioService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface NewsCardProps {
  article: NewsArticle;
  onPress?: () => void;
  isBookmarked?: boolean;
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  article,
  onPress,
  isBookmarked = false,
  onBookmarkChange,
}) => {
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBookmark = async () => {
    try {
      setLoading(true);
      if (bookmarked) {
        await StorageService.removeBookmark(article.id);
        setBookmarked(false);
        onBookmarkChange?.(false);
      } else {
        await StorageService.addBookmark(article);
        setBookmarked(true);
        onBookmarkChange?.(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update bookmark');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await SharingService.shareArticle(article);
    } catch (error) {
      Alert.alert('Error', 'Failed to share article');
    }
  };

  const handleAudioToggle = async () => {
    try {
      if (isPlaying) {
        await AudioService.stopSpeaking();
        setIsPlaying(false);
      } else {
        await AudioService.playArticle(article);
        setIsPlaying(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to play audio');
      setIsPlaying(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const publishedAt = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.card} 
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.image}
            contentFit="cover"
            placeholder="blur"
            transition={300}
          />
          
          {/* Breaking News Badge */}
          {article.isBreaking && (
            <View style={styles.breakingBadge}>
              <Text style={styles.breakingText}>🔴 BREAKING</Text>
            </View>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradientOverlay}
          />

          {/* Action Buttons Overlay */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: isPlaying ? '#ff4444' : '#007AFF' }]}
              onPress={handleAudioToggle}
            >
              <Ionicons 
                name={isPlaying ? 'stop' : 'play'} 
                size={18} 
                color="white" 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={18} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, loading && styles.disabledButton]}
              onPress={handleBookmark}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name={bookmarked ? 'bookmark' : 'bookmark-outline'} 
                  size={18} 
                  color="white" 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.metaInfo}>
            <Text style={styles.source}>{article.source}</Text>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(article.publishedAt)}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{article.category.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={3}>
            {article.title}
          </Text>

          <Text style={styles.description} numberOfLines={4}>
            {article.description}
          </Text>

          {/* Read More Indicator */}
          <View style={styles.readMore}>
            <Text style={styles.readMoreText}>Tap to read full article</Text>
            <Ionicons name="chevron-up" size={16} color="#007AFF" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: screenHeight - 100, // Account for tab bar
    width: screenWidth,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  imageContainer: {
    height: '60%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  breakingBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 2,
  },
  breakingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  actionButtons: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'column',
    gap: 8,
    zIndex: 2,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  source: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  separator: {
    marginHorizontal: 8,
    color: '#666',
    fontSize: 14,
  },
  timeAgo: {
    fontSize: 14,
    color: '#666',
  },
  categoryBadge: {
    marginLeft: 'auto',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    lineHeight: 30,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#4a4a4a',
    lineHeight: 24,
    flex: 1,
  },
  readMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  readMoreText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
});

export default NewsCard;
