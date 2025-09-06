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
  // Local fallback articles used when Firestore access is blocked by rules
  private fallbackArticles: NewsArticle[] = [
    {
      id: 1,
      headline: 'Local: Major Tech Breakthrough Announced',
      description: 'Offline fallback: a summary of the latest tech news for offline or restricted environments.',
      image: 'https://picsum.photos/400/300?random=15',
      category: 'Technology',
      readTime: '2 min read',
      timestamp: new Date().toLocaleDateString()
    },
    {
      id: 2,
      headline: 'Local: Championship Finals This Weekend',
      description: 'Offline fallback: sports highlights to keep the feed populated while Firestore is unavailable.',
      image: 'https://picsum.photos/400/300?random=16',
      category: 'Sports',
      readTime: '1 min read',
      timestamp: new Date().toLocaleDateString()
    },
    {
      id: 3,
      headline: 'Local: Market Reaches All-Time High',
      description: 'Offline fallback business summary.',
      image: 'https://picsum.photos/400/300?random=17',
      category: 'Business',
      readTime: '3 min read',
      timestamp: new Date().toLocaleDateString()
    }
  ];

  // Update an existing article by document ID
  async updateArticle(id: number | string, article: Partial<NewsArticle>): Promise<void> {
    try {
      const { updateDoc, doc: docFn } = await import('firebase/firestore');

      // Attempt 1: If id looks like a Firestore docId (string), try direct update
      if (id != null && typeof id === 'string' && id.trim().length > 0) {
        try {
          const docRef = docFn(db, this.collectionName, id);
          await updateDoc(docRef, article);
          return;
        } catch (err) {
          console.warn('update by docId failed, falling back to queries', err);
        }
      }

      // Attempt 2: if article contains docId field, try that
      if ((article as any).docId) {
        try {
          const docRef = docFn(db, this.collectionName, String((article as any).docId));
          await updateDoc(docRef, article);
          return;
        } catch (err) {
          console.warn('update by article.docId failed, falling back', err);
        }
      }

      // Attempt 3: try to query by numeric 'id' field
      if (id != null) {
        const q = query(collection(db, this.collectionName), where('id', '==', id));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docRef = querySnapshot.docs[0].ref;
          await updateDoc(docRef, article);
          return;
        }
      }

      // Attempt 4: try to match by docId field stored on documents
      if (id != null) {
        const q2 = query(collection(db, this.collectionName), where('docId', '==', String(id)));
        const querySnapshot2 = await getDocs(q2);
        if (!querySnapshot2.empty) {
          const docRef = querySnapshot2.docs[0].ref;
          await updateDoc(docRef, article);
          return;
        }
      }

      // Attempt 5: fallback to headline/timestamp match
      if (article.headline) {
        const q3 = query(collection(db, this.collectionName), where('headline', '==', article.headline));
        const querySnapshot3 = await getDocs(q3);
        if (!querySnapshot3.empty) {
          const docRef = querySnapshot3.docs[0].ref;
          await updateDoc(docRef, article);
          return;
        }
      }

      throw new Error('Document not found for update');
    } catch (error) {
      console.error('Error updating article:', error);
      throw error;
    }
  }

  // Save categories into a dedicated metadata document so category list is persisted
  async saveCategories(categories: string[]): Promise<void> {
    try {
      const { doc: docFn, setDoc } = await import('firebase/firestore');
      const metaRef = docFn(db, 'app_metadata', 'categories');
      await setDoc(metaRef, { categories }, { merge: true });
    } catch (error) {
      console.error('Error saving categories to metadata doc:', error);
      throw error;
    }
  }

  // Get all articles with Firestore doc IDs (for deletion/editing)
  async getArticlesWithDocIds(): Promise<any[]> {
    try {
      const q = query(collection(db, this.collectionName), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        docId: doc.id,
      }));
    } catch (error) {
      console.error('Error getting articles with doc IDs:', error);
      return [];
    }
  }

  // Delete an article. Accepts either a Firestore doc id (string/number) or a full article object
  async deleteArticle(idOrArticle: number | string | any): Promise<void> {
    try {
      const { deleteDoc, doc: docFn } = await import('firebase/firestore');

      // If caller passed the whole article object, try to use its docId first
      let candidateId: string | number | null = null;
      let headline: string | undefined;
      let timestamp: any = undefined;

      if (typeof idOrArticle === 'object' && idOrArticle !== null) {
        candidateId = idOrArticle.docId ?? idOrArticle.id ?? null;
        headline = idOrArticle.headline;
        timestamp = idOrArticle.timestamp;
      } else {
        candidateId = idOrArticle as string | number;
      }

      // Attempt 1: delete by Firestore document path if candidateId looks like a doc id
      if (candidateId != null) {
        try {
          const docRef = docFn(db, this.collectionName, String(candidateId));
          await deleteDoc(docRef);
          return;
        } catch (docErr) {
          console.warn('delete by docId failed, falling back to query:', docErr);
        }
      }

      // Attempt 2: try to query by stored fields (docId, id)
      let querySnapshot = null as any;
      if (candidateId != null) {
        const q = query(collection(db, this.collectionName), where('id', '==', candidateId));
        querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          await deleteDoc(querySnapshot.docs[0].ref);
          return;
        }
      }

      // Attempt 3: try to match by docId field (some records might store docId)
      if (candidateId != null) {
        const q2 = query(collection(db, this.collectionName), where('docId', '==', String(candidateId)));
        querySnapshot = await getDocs(q2);
        if (!querySnapshot.empty) {
          await deleteDoc(querySnapshot.docs[0].ref);
          return;
        }
      }

      // Attempt 4: try to match by headline + timestamp (best-effort)
      if (headline) {
        const q3 = query(collection(db, this.collectionName), where('headline', '==', headline));
        querySnapshot = await getDocs(q3);
        if (!querySnapshot.empty) {
          // If timestamp provided, try to find closest match
          if (timestamp) {
            const match = querySnapshot.docs.find((d: any) => {
              const t = d.data().timestamp;
              return String(t) === String(timestamp) || (t && t.seconds && timestamp && t.seconds === timestamp.seconds);
            });
            if (match) {
              await deleteDoc(match.ref);
              return;
            }
          }

          // fallback to first result
          await deleteDoc(querySnapshot.docs[0].ref);
          return;
        }
      }

      throw new Error('Document not found for deletion');
    } catch (error) {
      console.error('Error deleting article:', error);
      throw error;
    }
  }
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
      // Persist the Firestore-generated document ID back into the document for deterministic updates/deletes
      try {
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(docRef, { docId: docRef.id });
      } catch (writeErr) {
        console.warn('Could not persist docId into the document:', writeErr);
      }

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
    } catch (error: any) {
      console.error('Error getting articles:', error);
      // If Firestore rules deny access OR network issues, return local fallback so app isn't empty
      if (error && (error.code === 'permission-denied' || error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('network'))) {
        console.warn('Firestore unavailable (offline/network/permission): returning local fallback articles');
        return this.fallbackArticles;
      }
      // For any other error, also return fallback to prevent blank pages
      console.warn('Firestore error, returning fallback articles to prevent blank page');
      return this.fallbackArticles;
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
    } catch (error: any) {
      console.error('Error getting articles by category:', error);
      if (error && error.code === 'permission-denied') {
        console.warn('Firestore permission denied on category query: falling back to local articles');
        return this.fallbackArticles.filter(a => a.category === category);
      }
      return [];
    }
  }

  // Real-time listener for new articles
  subscribeToArticles(callback: (articles: NewsArticle[]) => void): () => void {
    const q = query(
      collection(db, this.collectionName), 
      orderBy('timestamp', 'desc')
    );
    
    try {
      const unsub = onSnapshot(q, (snapshot) => {
        try {
          const articles = snapshot.docs.map((doc, index) => ({
            id: index + 1, // Use index-based ID for display
            ...doc.data(),
            timestamp: this.formatTimestamp(doc.data().timestamp)
          })) as NewsArticle[];
          callback(articles);
        } catch (inner) {
          console.warn('Error processing snapshot data, sending fallback articles', inner);
          callback(this.fallbackArticles);
        }
      }, (err) => {
        console.error('onSnapshot error:', err);
        // If permission denied or other error, provide fallback and return a no-op unsubscribe
        callback(this.fallbackArticles);
      });

      return unsub;
    } catch (err: any) {
      console.error('Failed to subscribe to Firestore articles:', err);
      // Immediately deliver fallback and return no-op unsubscribe
      setTimeout(() => callback(this.fallbackArticles), 0);
      return () => {};
    }
  }

  // Get unique categories
  async getCategories(): Promise<string[]> {
    try {
      // Try to read persisted categories from metadata first
      const { doc: docFn, getDoc } = await import('firebase/firestore');
      const metaRef = docFn(db, 'app_metadata', 'categories');
      const metaSnap = await getDoc(metaRef);
      if (metaSnap.exists()) {
        const data = metaSnap.data();
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          return data.categories as string[];
        }
      }

      // Fallback: derive categories by scanning existing articles
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      const categories = new Set<string>();
      querySnapshot.docs.forEach(doc => {
        const category = doc.data().category;
        if (category) categories.add(category);
      });
      return Array.from(categories);
    } catch (error) {
      console.error('Error getting categories:', error);
      // Return fallback categories when offline or network issues
      return ['Technology', 'Sports', 'Business', 'Health', 'Entertainment', 'Politics'];
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
