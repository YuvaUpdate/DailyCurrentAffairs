import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase.config';
import { NewsArticle } from './types';

export class FirebaseNewsService {
  private collectionName = 'news_articles';

  // Add a new article to Firebase
  async addArticle(article: Omit<NewsArticle, 'id' | 'timestamp'>): Promise<string> {
    try {
      console.log('🔄 FirebaseNewsService: Starting to add article:', article);
      console.log('🔄 FirebaseNewsService: Collection name:', this.collectionName);
      console.log('🔄 FirebaseNewsService: Database object:', db);
      
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...article,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
      
      console.log('✅ FirebaseNewsService: Document added with ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ FirebaseNewsService Error adding article:', error);
      console.error('❌ FirebaseNewsService Error code:', error.code);
      console.error('❌ FirebaseNewsService Error message:', error.message);
      console.error('❌ FirebaseNewsService Error details:', error);
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
      
      return querySnapshot.docs.map((doc, index) => ({
        id: index + 1, // Use index-based ID for display
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
      
      return querySnapshot.docs.map((doc, index) => ({
        id: index + 1, // Use index-based ID for display
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
    
    return onSnapshot(q, (snapshot) => {
      const articles = snapshot.docs.map((doc, index) => ({
        id: index + 1, // Use index-based ID for display
        ...doc.data(),
        timestamp: this.formatTimestamp(doc.data().timestamp)
      })) as NewsArticle[];
      
      callback(articles);
    });
  }

  // Get unique categories
  async getCategories(): Promise<string[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      const categories = new Set<string>();
      
      querySnapshot.docs.forEach(doc => {
        const category = doc.data().category;
        if (category) {
          categories.add(category);
        }
      });
      
      return Array.from(categories);
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
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
}

export const firebaseNewsService = new FirebaseNewsService();
