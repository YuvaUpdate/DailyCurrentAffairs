import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase.config';
import { NewsArticle } from './types';

export interface UserBookmark {
  id: string;
  userId: string;
  articleId: string;
  articleData: NewsArticle;
  bookmarkedAt: Date;
}

export interface UserPreferences {
  userId: string;
  favoriteCategories: string[];
  notificationSettings: {
    newArticles: boolean;
    comments: boolean;
    likes: boolean;
    newsletter: boolean;
  };
  readingMode: 'light' | 'dark' | 'auto';
  audioSettings: {
    enabled: boolean;
    speed: number;
    voice: string;
  };
}

class UserService {
  // Bookmark/Unbookmark article
  async toggleBookmark(userId: string, articleId: number): Promise<boolean> {
    try {
      const bookmarkId = `${userId}_${articleId}`;
      const bookmarkRef = doc(db, 'bookmarks', bookmarkId);

      // Check if bookmark exists
      const existingBookmarks = await getDocs(
        query(collection(db, 'bookmarks'), where('userId', '==', userId), where('articleId', '==', articleId))
      );

      if (!existingBookmarks.empty) {
        // Remove bookmark
        await deleteDoc(bookmarkRef);
        console.log('✅ Article unbookmarked');
        return false;
      } else {
        // Add bookmark
        const bookmark = {
          userId,
          articleId: articleId,
          bookmarkedAt: new Date().toISOString()
        };

        await setDoc(bookmarkRef, bookmark);

        console.log('✅ Article bookmarked');
        return true;
      }
    } catch (error) {
      console.error('❌ Error toggling bookmark:', error);
      throw error;
    }
  }

  // Get user's bookmarked articles
  async getUserBookmarks(userId: string): Promise<UserBookmark[]> {
    try {
      // Use simple query without orderBy to avoid index requirement
      const q = query(
        collection(db, 'bookmarks'),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const bookmarks: UserBookmark[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        bookmarks.push({
          id: doc.id,
          ...data,
          bookmarkedAt: data.bookmarkedAt?.toDate() || new Date()
        } as UserBookmark);
      });

      // Sort in memory instead of using orderBy
      bookmarks.sort((a, b) => b.bookmarkedAt.getTime() - a.bookmarkedAt.getTime());

      console.log('✅ User bookmarks retrieved:', bookmarks.length);
      return bookmarks;
    } catch (error) {
      console.error('❌ Error getting user bookmarks:', error);
      return [];
    }
  }

  // Check if article is bookmarked
  async isArticleBookmarked(userId: string, articleId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'bookmarks'),
        where('userId', '==', userId),
        where('articleId', '==', articleId)
      );

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('❌ Error checking bookmark status:', error);
      return false;
    }
  }

  // Save user preferences
  async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      await setDoc(doc(db, 'userPreferences', preferences.userId), preferences);
      console.log('✅ User preferences saved');
    } catch (error) {
      console.error('❌ Error saving user preferences:', error);
      throw error;
    }
  }

  // Get user preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const q = query(
        collection(db, 'userPreferences'),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        return data as UserPreferences;
      }

      // Return default preferences if none exist
      return {
        userId,
        favoriteCategories: [],
        notificationSettings: {
          newArticles: true,
          comments: true,
          likes: true,
          newsletter: false
        },
        readingMode: 'auto',
        audioSettings: {
          enabled: true,
          speed: 1.0,
          voice: 'default'
        }
      };
    } catch (error) {
      console.error('❌ Error getting user preferences:', error);
      return null;
    }
  }

  // Update favorite categories
  async updateFavoriteCategories(userId: string, category: string, add: boolean): Promise<void> {
    try {
      const prefsRef = doc(db, 'userPreferences', userId);
      
      if (add) {
        await updateDoc(prefsRef, {
          favoriteCategories: arrayUnion(category)
        });
      } else {
        await updateDoc(prefsRef, {
          favoriteCategories: arrayRemove(category)
        });
      }

      console.log('✅ Favorite categories updated');
    } catch (error) {
      console.error('❌ Error updating favorite categories:', error);
      throw error;
    }
  }

  // Track article read
  async trackArticleRead(userId: string, articleId: string): Promise<void> {
    try {
      const readId = `${userId}_${articleId}`;
      await setDoc(doc(db, 'readArticles', readId), {
        userId,
        articleId,
        readAt: serverTimestamp()
      });

      console.log('✅ Article read tracked');
    } catch (error) {
      console.error('❌ Error tracking article read:', error);
      // Don't throw error as this is not critical
    }
  }

  // Get reading history
  async getReadingHistory(userId: string, limit: number = 50): Promise<string[]> {
    try {
      const q = query(
        collection(db, 'readArticles'),
        where('userId', '==', userId),
        orderBy('readAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const articleIds: string[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        articleIds.push(data.articleId);
      });

      return articleIds.slice(0, limit);
    } catch (error) {
      console.error('❌ Error getting reading history:', error);
      return [];
    }
  }

  // Get user stats
  async getUserStats(userId: string): Promise<{
    bookmarksCount: number;
    commentsCount: number;
    readArticlesCount: number;
  }> {
    try {
      // Get bookmarks count
      const bookmarksQuery = query(
        collection(db, 'bookmarks'),
        where('userId', '==', userId)
      );
      const bookmarksSnapshot = await getDocs(bookmarksQuery);

      // Get comments count
      const commentsQuery = query(
        collection(db, 'comments'),
        where('userId', '==', userId),
        where('isDeleted', '==', false)
      );
      const commentsSnapshot = await getDocs(commentsQuery);

      // Get read articles count
      const readQuery = query(
        collection(db, 'readArticles'),
        where('userId', '==', userId)
      );
      const readSnapshot = await getDocs(readQuery);

      return {
        bookmarksCount: bookmarksSnapshot.size,
        commentsCount: commentsSnapshot.size,
        readArticlesCount: readSnapshot.size
      };
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      return {
        bookmarksCount: 0,
        commentsCount: 0,
        readArticlesCount: 0
      };
    }
  }
}

export const userService = new UserService();
