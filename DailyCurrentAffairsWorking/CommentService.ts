import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from './firebase.config';

export interface Comment {
  id: string;
  articleId: number; // Changed to match NewsArticle.id type
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string; // Changed from Date to string for consistency
  likes: number;
  likedBy: string[];
  replies?: Comment[];
  parentId?: string; // Added missing parentId
  isDeleted: boolean;
}

export interface CommentData {
  articleId: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: string;
}

class CommentService {
  // Add a new comment
  async addComment(commentData: CommentData): Promise<string> {
    try {
      const comment = {
        ...commentData,
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        isDeleted: false
      };

      const docRef = await addDoc(collection(db, 'comments'), comment);

      // Update article comment count
      await this.updateArticleCommentCount(commentData.articleId.toString(), 1);

      console.log('✅ Comment added successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      throw error;
    }
  }

  // Get comments for an article
  async getComments(articleId: number): Promise<Comment[]> {
    try {
      // Use simple query without orderBy to avoid index requirement
      const q = query(
        collection(db, 'comments'),
        where('articleId', '==', articleId),
        where('isDeleted', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const comments: Comment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        comments.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp || new Date().toISOString()
        } as Comment);
      });

      // Sort in memory instead of using orderBy
      comments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log('✅ Comments retrieved for article', articleId, ':', comments.length);
      return comments;
    } catch (error) {
      console.error('❌ Error getting comments:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  // Subscribe to comments for real-time updates
  subscribeToComments(articleId: number, callback: (comments: Comment[]) => void) {
    try {
      const q = query(
        collection(db, 'comments'),
        where('articleId', '==', articleId),
        where('isDeleted', '==', false),
        orderBy('timestamp', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const comments: Comment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          comments.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          } as Comment);
        });

        callback(comments);
      });
    } catch (error) {
      console.error('❌ Error subscribing to comments:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // Update comment
  async updateComment(commentId: string, content: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'comments', commentId), {
        content,
        isEdited: true,
        editedAt: serverTimestamp()
      });

      console.log('✅ Comment updated successfully');
    } catch (error) {
      console.error('❌ Error updating comment:', error);
      throw error;
    }
  }

  // Delete comment (soft delete)
  async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'comments', commentId), {
        isDeleted: true,
        deletedAt: serverTimestamp()
      });

      console.log('✅ Comment deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      throw error;
    }
  }

  // Like/Unlike comment
  async toggleCommentLike(commentId: string, userId: string): Promise<void> {
    try {
      const commentRef = doc(db, 'comments', commentId);
      
      // Get current comment data
      const commentDoc = await getDocs(query(collection(db, 'comments'), where('__name__', '==', commentId)));
      
      if (!commentDoc.empty) {
        const commentData = commentDoc.docs[0].data();
        const likedBy = commentData.likedBy || [];
        const isLiked = likedBy.includes(userId);

        if (isLiked) {
          // Unlike
          await updateDoc(commentRef, {
            likes: increment(-1),
            likedBy: likedBy.filter((id: string) => id !== userId)
          });
        } else {
          // Like
          await updateDoc(commentRef, {
            likes: increment(1),
            likedBy: [...likedBy, userId]
          });
        }

        console.log('✅ Comment like toggled successfully');
      }
    } catch (error) {
      console.error('❌ Error toggling comment like:', error);
      throw error;
    }
  }

  // Simplified like method for Comments component
  async likeComment(commentId: string, userId: string): Promise<void> {
    return this.toggleCommentLike(commentId, userId);
  }

  // Get comment count for an article
  async getCommentCount(articleId: number): Promise<number> {
    try {
      const q = query(
        collection(db, 'comments'),
        where('articleId', '==', articleId),
        where('isDeleted', '==', false)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('❌ Error getting comment count:', error);
      return 0;
    }
  }

  // Update article comment count in the articles collection
  private async updateArticleCommentCount(articleId: string, increment_value: number): Promise<void> {
    try {
      const articleRef = doc(db, 'news_articles', articleId.toString());
      await updateDoc(articleRef, {
        commentCount: increment(increment_value)
      });
    } catch (error) {
      console.error('❌ Error updating article comment count:', error);
      // Don't throw error as this is not critical
    }
  }

  // Add reply to comment
  async addReply(parentCommentId: string, replyData: CommentData): Promise<string> {
    try {
      const reply = {
        ...replyData,
        timestamp: new Date().toISOString(),
        likes: 0,
        likedBy: [],
        isDeleted: false
      };

      const docRef = await addDoc(collection(db, 'replies'), {
        ...reply,
        parentCommentId,
        timestamp: serverTimestamp()
      });

      console.log('✅ Reply added successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding reply:', error);
      throw error;
    }
  }

  // Get replies for a comment
  async getReplies(commentId: string): Promise<Comment[]> {
    try {
      const q = query(
        collection(db, 'replies'),
        where('parentCommentId', '==', commentId),
        where('isDeleted', '==', false),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const replies: Comment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        replies.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        } as Comment);
      });

      return replies;
    } catch (error) {
      console.error('❌ Error getting replies:', error);
      return [];
    }
  }
}

export const commentService = new CommentService();
