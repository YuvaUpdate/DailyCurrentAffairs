import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  increment
} from 'firebase/firestore';
import { db } from './firebase.config';
import { Comment } from './types';

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
      console.log('✅ Comment added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      throw error;
    }
  }

  // Subscribe to comments for real-time updates
  subscribeToComments(articleId: number, callback: (comments: Comment[]) => void): () => void {
    try {
      const q = query(
        collection(db, 'comments'),
        where('articleId', '==', articleId),
        where('isDeleted', '==', false),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const comments: Comment[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          comments.push({
            id: doc.id,
            ...data
          } as Comment);
        });

        console.log('✅ Comments updated:', comments.length);
        callback(comments);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error subscribing to comments:', error);
      throw error;
    }
  }

  // Like/unlike a comment
  async likeComment(commentId: string, userId: string): Promise<void> {
    try {
      const commentRef = doc(db, 'comments', commentId);
      
      // Simplified version - in a real app, you'd check if user already liked
      await updateDoc(commentRef, {
        likes: increment(1)
      });

      console.log('✅ Comment liked');
    } catch (error) {
      console.error('❌ Error liking comment:', error);
      throw error;
    }
  }

  // Delete comment (soft delete)
  async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      const commentRef = doc(db, 'comments', commentId);
      
      await updateDoc(commentRef, {
        isDeleted: true,
        content: '[Comment deleted]'
      });

      console.log('✅ Comment deleted');
    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      throw error;
    }
  }
}

export const commentService = new CommentService();
