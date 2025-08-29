import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Share,
  Platform
} from 'react-native';
import FastTouchable from './FastTouchable';
import { NewsArticle } from './types';
import { authService } from './AuthService';
import { userService } from './UserService';
import { Comments } from './Comments';
import { SHOW_BOOKMARKS } from './uiConfig';

interface ArticleActionsProps {
  article: NewsArticle;
  isDarkMode?: boolean;
  currentTheme?: any;
  currentUser?: any;
}

export const ArticleActions: React.FC<ArticleActionsProps> = ({ article, isDarkMode = false, currentTheme, currentUser: propCurrentUser }) => {
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (propCurrentUser) {
      setCurrentUser(propCurrentUser);
    } else {
      getCurrentUser();
    }
  }, [propCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      checkBookmarkStatus();
    }
  }, [currentUser, article.id]);

  const getCurrentUser = async () => {
    try {
      const firebaseUser = authService.getCurrentUser();
      if (firebaseUser) {
        const userProfile = await authService.getUserProfile(firebaseUser.uid);
        setCurrentUser(userProfile);
      }
    } catch (error) {
      console.log('Error getting current user:', error);
    }
  };

  const checkBookmarkStatus = async () => {
    if (!currentUser) return;
    
    try {
      const bookmarks = await userService.getUserBookmarks(currentUser.uid);
      const isArticleBookmarked = bookmarks.some(bookmark => {
        // Convert both to numbers for comparison
        const bookmarkArticleId = parseInt(bookmark.articleId.toString());
        const currentArticleId = parseInt(article.id.toString());
        return bookmarkArticleId === currentArticleId;
      });
      setIsBookmarked(isArticleBookmarked);
    } catch (error) {
      console.log('Error checking bookmark status:', error);
    }
  };

  const handleBookmark = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to bookmark articles');
      return;
    }

    // Optimistic update: update UI immediately so the tap feels instant.
    // Perform the network toggle in the background and rollback on failure.
    setIsBookmarked(prev => !prev);

    (async () => {
      try {
        await userService.toggleBookmark(currentUser.uid, article.id);
        // success: nothing further to do because UI already updated optimistically
      } catch (error: any) {
        // rollback optimistic change on failure
        setIsBookmarked(prev => !prev);
        Alert.alert('Error', error?.message || 'Failed to update bookmark');
      }
    })();
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        message: `Check out this article: ${article.headline}\n\n${article.description.substring(0, 100)}...`,
        url: article.image,
      };

      if (Platform.OS === 'ios') {
        await Share.share({
          url: shareContent.url,
          message: shareContent.message,
        });
      } else {
        await Share.share({
          message: `${shareContent.message}\n${shareContent.url}`,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to share article');
    }
  };

  const handleComments = () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to view comments');
      return;
    }
    setShowComments(true);
  };

  const handleAudioToggle = () => {
    setIsPlaying(!isPlaying);
    if (isPlaying) {
      Alert.alert('Audio Paused', 'Article reading paused');
    } else {
      Alert.alert('Audio Playing', `Reading: "${article.headline}"`);
    }
  };

  const defaultTheme = {
    surface: '#FFFFFF',
    text: '#000000',
    subText: '#666666',
    accent: '#2563EB',
    success: '#10B981',
    background: '#FFFFFF',
    border: '#E5E7EB'
  };

  const theme = currentTheme || defaultTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
      <View style={styles.actionsRow}>
        {/* Bookmark Button (hidden via SHOW_BOOKMARKS) */}
        {SHOW_BOOKMARKS && (
        <FastTouchable
          style={[
            styles.actionButton, 
            { backgroundColor: theme.surface },
            isBookmarked && { backgroundColor: theme.success + '20' }
          ]}
          onPress={handleBookmark}
        >
          <Text style={[styles.actionIcon, isBookmarked && { color: theme.success }]}>
            {isBookmarked ? '●' : '○'}
          </Text>
          <Text style={[
            styles.actionText, 
            { color: theme.subText },
            isBookmarked && { color: theme.success }
          ]}>
            {isBookmarked ? 'Saved' : 'Save'}
          </Text>
        </FastTouchable>
        )}

        {/* Share Button */}
        <FastTouchable style={[styles.actionButton, { backgroundColor: theme.surface }]} onPress={handleShare}>
          <Text style={[styles.actionIcon, { color: theme.text }]}>↗</Text>
          <Text style={[styles.actionText, { color: theme.subText }]}>Share</Text>
        </FastTouchable>

        {/* Comments Button */}
        <FastTouchable style={[styles.actionButton, { backgroundColor: theme.surface }]} onPress={handleComments}>
          <Text style={[styles.actionIcon, { color: theme.text }]}>◉</Text>
          <Text style={[styles.actionText, { color: theme.subText }]}>Comments</Text>
        </FastTouchable>

        {/* Audio Button */}
        <FastTouchable
          style={[
            styles.actionButton, 
            { backgroundColor: theme.surface },
            isPlaying && { backgroundColor: theme.accent + '20' }
          ]}
          onPress={handleAudioToggle}
        >
          <Text style={[styles.actionIcon, isPlaying && { color: theme.accent }]}>
            {isPlaying ? '||' : '♫'}
          </Text>
          <Text style={[
            styles.actionText, 
            { color: theme.subText },
            isPlaying && { color: theme.accent }
          ]}>
            {isPlaying ? 'Pause' : 'Listen'}
          </Text>
        </FastTouchable>
      </View>

      {/* Comments Modal */}
      {showComments && (
        <Comments 
          article={article} 
          onClose={() => setShowComments(false)}
          currentUser={currentUser}
          visible={showComments}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 60,
    backgroundColor: '#F8F9FA',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
