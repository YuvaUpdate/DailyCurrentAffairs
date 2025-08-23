import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase.config';
import { NewsArticle } from './types';
import { notificationService } from './NotificationService';

export class FirebaseNewsService {
  private collectionName = 'news_articles';

  // Add a new article to Firebase
  async addArticle(article: Omit<NewsArticle, 'id' | 'timestamp'>): Promise<string> {
    try {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Starting to add article:', { headline: article.headline, category: article.category });
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Collection name:', this.collectionName);
      
      // Filter out undefined values to prevent Firebase errors
      const cleanArticle = Object.fromEntries(
        Object.entries(article).filter(([_, value]) => value !== undefined)
      );
      
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Clean article data keys:', Object.keys(cleanArticle));
      
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...cleanArticle,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
      
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[SUCCESS] FirebaseNewsService: Document added with ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('[ERROR] FirebaseNewsService Error adding article:', error);
      console.error('[ERROR] FirebaseNewsService Error code:', error.code);
      console.error('[ERROR] FirebaseNewsService Error message:', error.message);
      console.error('[ERROR] FirebaseNewsService Error details:', error);
      throw error;
    }
  }

  // Get all articles
  async getArticles(): Promise<NewsArticle[]> {
    try {
      const q = query(
        collection(db, this.collectionName), 
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => ({
        id: doc.id, // Use actual Firebase document ID
        ...doc.data(),
        timestamp: this.formatTimestamp(doc.data().timestamp)
      })) as NewsArticle[];
    } catch (error) {
      console.error('Error getting articles:', error);
      return [];
    }
  }

  // Get articles by category
  async getArticlesByCategory(category: string): Promise<NewsArticle[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('category', '==', category),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => ({
        id: doc.id, // Use actual Firebase document ID
        ...doc.data(),
        timestamp: this.formatTimestamp(doc.data().timestamp)
      })) as NewsArticle[];
    } catch (error) {
      console.error('Error getting articles by category:', error);
      return [];
    }
  }

  // Real-time listener for new articles
  subscribeToArticles(callback: (articles: NewsArticle[]) => void): () => void {
    const q = query(
      collection(db, this.collectionName), 
      orderBy('timestamp', 'desc')
    );
    
    // Keep a local set of known document IDs to detect new additions
    const knownIds = new Set<string>();

    const unsub = onSnapshot(q, (snapshot) => {
      const articles = snapshot.docs.map((doc) => ({
        id: doc.id, // Use actual Firebase document ID
        ...doc.data(),
        timestamp: this.formatTimestamp(doc.data().timestamp)
      })) as NewsArticle[];

      // Detect newly added documents
      const newDocs: NewsArticle[] = [];
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const d = change.doc;
          const article = ({ id: d.id, ...d.data(), timestamp: this.formatTimestamp(d.data().timestamp) } as unknown) as NewsArticle;
          if (!knownIds.has(d.id)) {
            newDocs.push(article);
            knownIds.add(d.id);
          }
        }
      });

      // Notify subscribers (app UI) first
      callback(articles);

      // For any newly added articles, send a notification (in-app fallback or system if configured)
      if (newDocs.length > 0) {
        newDocs.forEach(article => {
          try {
            notificationService.sendNewArticleNotification(article);
          } catch (err) {
            console.warn('Failed to send new article notification', err);
          }
        });
      }
    });

    return unsub;
  }

  // Get categories from Firebase settings or return defaults
  async getCategories(): Promise<string[]> {
    try {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Getting categories');
      const categoriesDoc = await getDoc(doc(db, 'settings', 'categories'));
      
      if (categoriesDoc.exists()) {
        const data = categoriesDoc.data();
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[SUCCESS] FirebaseNewsService: Retrieved categories:', data.categories);
        return data.categories || [];
      } else {
        // Return default categories if none exist
        const defaultCategories = ['Breaking', 'Business', 'Entertainment', 'General', 'Health', 'Science', 'Sports', 'Technology'];
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[INFO] FirebaseNewsService: No categories found, returning defaults');
        return defaultCategories;
      }
    } catch (error: any) {
      console.error('[ERROR] FirebaseNewsService Error getting categories:', error);
      // Return default categories on error
      return ['Breaking', 'Business', 'Entertainment', 'General', 'Health', 'Science', 'Sports', 'Technology'];
    }
  }

  private formatTimestamp(timestamp: any): string {
    if (!timestamp) return new Date().toLocaleDateString();
    
    if (timestamp.seconds) {
      // Firestore Timestamp
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    
    return new Date(timestamp).toLocaleDateString();
  }

  // Delete an article
  async deleteArticle(articleId: string | number): Promise<void> {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('🔥 [ENTRY] FirebaseNewsService.deleteArticle called with ID:', articleId);
    
    try {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Starting delete operation for ID:', articleId);
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Collection name:', this.collectionName);
      
      // First, check if the document exists
  const docRef = doc(db, this.collectionName, String(articleId));
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Document reference created:', docRef.path);
      
      // Try to get the document first to verify it exists
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Checking if document exists...');
  const docSnap = await getDoc(docRef);
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Document exists:', docSnap.exists());
      
      if (!docSnap.exists()) {
        console.error('[ERROR] FirebaseNewsService: Document does not exist with ID:', articleId);
        throw new Error(`Document with ID ${articleId} does not exist`);
      }
      
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Document data keys:', Object.keys(docSnap.data() || {}));
      
      // Now delete the document
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Attempting to delete document...');
  await deleteDoc(docRef);
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[SUCCESS] FirebaseNewsService: Article deleted successfully from Firebase');
      
      // Verify deletion by trying to get the document again
      const verifyDocSnap = await getDoc(docRef);
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[VERIFY] FirebaseNewsService: Document still exists after delete:', verifyDocSnap.exists());
      
    } catch (error: any) {
      console.error('[ERROR] FirebaseNewsService Error deleting article:', error);
      console.error('[ERROR] FirebaseNewsService Error code:', error.code);
      console.error('[ERROR] FirebaseNewsService Error message:', error.message);
      throw error;
    }
  }

  // Update an article
  async updateArticle(articleId: string | number, updates: Partial<NewsArticle>): Promise<void> {
    try {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Updating article with ID:', articleId);
      
      // Filter out undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
  await updateDoc(doc(db, this.collectionName, String(articleId)), {
        ...cleanUpdates,
        updatedAt: serverTimestamp()
      });
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[SUCCESS] FirebaseNewsService: Article updated successfully');
    } catch (error: any) {
      console.error('[ERROR] FirebaseNewsService Error updating article:', error);
      throw error;
    }
  }

  // Get articles with real document IDs (for editing/deleting)
  async getArticlesWithDocIds(): Promise<NewsArticle[]> {
    try {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Getting articles with document IDs');
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Collection name:', this.collectionName);
      
      const q = query(
        collection(db, this.collectionName), 
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Query returned', querySnapshot.docs.length, 'documents');
      
      const articles = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const article = {
          id: docSnap.id, // Use actual document ID for editing/deleting
          ...data,
          timestamp: this.formatTimestamp(data.timestamp)
        } as unknown as NewsArticle;
        
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Article ID:', article.id, 'Headline:', article.headline);
        return article;
      });
      
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[SUCCESS] FirebaseNewsService: Retrieved articles with IDs:', articles.length);
      return articles;
    } catch (error) {
      console.error('[ERROR] FirebaseNewsService Error getting articles with IDs:', error);
      return [];
    }
  }

  // Category management methods
  async saveCategories(categories: string[]): Promise<void> {
    try {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] FirebaseNewsService: Saving categories:', categories);
  await setDoc(doc(db, 'settings', 'categories'), {
        categories: categories,
        updatedAt: serverTimestamp()
      });
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[SUCCESS] FirebaseNewsService: Categories saved successfully');
    } catch (error: any) {
      console.error('[ERROR] FirebaseNewsService Error saving categories:', error);
      throw error;
    }
  }
}

export const firebaseNewsService = new FirebaseNewsService();
