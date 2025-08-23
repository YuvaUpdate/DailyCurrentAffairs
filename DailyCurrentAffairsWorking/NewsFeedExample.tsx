import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import NewsFeed from './NewsFeed';
import { NewsArticle } from './types';

// Example App component showing how to integrate NewsFeed
export default function AppWithNewsFeed() {
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Sample data that matches the NewsFeed requirements
  useEffect(() => {
    const sampleArticles: NewsArticle[] = [
      {
        id: '1',
        headline: "Breaking: Major Tech Breakthrough Announced",
        description: "Scientists have developed a revolutionary new technology that could change the way we interact with digital devices forever. This breakthrough promises to make technology more accessible and intuitive for users worldwide.",
        image: "https://via.placeholder.com/400x300/667eea/ffffff?text=Tech+News",
        category: "Technology",
        readTime: "2 min read",
        timestamp: "2 hours ago",
  mediaType: "image",
        sourceUrl: "https://example.com/tech-breakthrough"
      },
      {
  id: '2',
        headline: "Sports: Championship Finals This Weekend",
        description: "The most anticipated sporting event of the year is set to take place this weekend. Teams have been preparing for months, and fans are eagerly waiting for what promises to be an unforgettable match.",
        image: "https://via.placeholder.com/400x300/f093fb/ffffff?text=Sports+News",
        category: "Sports",
        readTime: "1 min read",
        timestamp: "4 hours ago",
  mediaType: "image",
        sourceUrl: "https://example.com/championship-finals"
      },
      {
  id: '3',
        headline: "Business: Market Reaches All-Time High",
        description: "Stock markets around the world have reached unprecedented levels today, driven by positive economic indicators and investor confidence. Analysts are optimistic about continued growth in the coming quarters.",
        image: "https://via.placeholder.com/400x300/4ade80/ffffff?text=Business+News",
        category: "Business",
        readTime: "3 min read",
        timestamp: "6 hours ago",
  mediaType: "image",
        sourceUrl: "https://example.com/market-high"
      },
      {
  id: '4',
        headline: "Finance: New Investment Opportunities Emerge",
        description: "Financial experts identify new sectors showing promising growth potential. These emerging markets could offer significant returns for investors willing to diversify their portfolios.",
        image: "https://via.placeholder.com/400x300/fbbf24/ffffff?text=Finance+News",
        category: "Finance",
        readTime: "4 min read",
        timestamp: "8 hours ago",
  mediaType: "image",
        sourceUrl: "https://example.com/investment-opportunities"
      },
      {
  id: '5',
        headline: "Health: New Medical Discovery Shows Promise",
        description: "Researchers have made a significant breakthrough in medical science that could lead to better treatment options for millions of patients worldwide. Clinical trials are showing very promising results.",
        image: "https://via.placeholder.com/400x300/fb7185/ffffff?text=Health+News",
        category: "Health",
        readTime: "2 min read",
        timestamp: "10 hours ago",
  mediaType: "image",
        sourceUrl: "https://example.com/medical-discovery"
      }
    ];
    
    setNewsArticles(sampleArticles);
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real app, you would fetch new articles here
    // const newArticles = await fetchArticlesFromAPI();
    // setNewsArticles(newArticles);
    
    setRefreshing(false);
  };

  // Handle bookmark toggle
  const handleBookmarkToggle = (articleId: string | number) => {
    const key = String(articleId);
    const newBookmarks = new Set(bookmarkedArticles);
    if (newBookmarks.has(key)) {
      newBookmarks.delete(key);
    } else {
      newBookmarks.add(key);
    }
    setBookmarkedArticles(newBookmarks);
    
    // In a real app, you would also save this to your backend/storage
    // await saveBookmarkToStorage(articleId, !bookmarkedArticles.has(articleId));
  };

  return (
    <View style={{ flex: 1 }}>
      <NewsFeed
        articles={newsArticles}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onBookmarkToggle={handleBookmarkToggle}
        bookmarkedArticles={bookmarkedArticles}
      />
    </View>
  );
}

/* 
 * Integration Instructions:
 * 
 * 1. To integrate this NewsFeed into your existing App.tsx:
 *    - Import the NewsFeed component
 *    - Replace your current news display logic with the NewsFeed component
 *    - Pass your articles data to the NewsFeed component
 * 
 * 2. Example integration in your existing App.tsx:
 * 
 *    import NewsFeed from './NewsFeed';
 *    
 *    // In your App component, replace the current news display with:
 *    <NewsFeed
 *      articles={filteredNews}
 *      onRefresh={onRefresh}
 *      refreshing={refreshing}
 *      onBookmarkToggle={toggleBookmark}
 *      bookmarkedArticles={new Set(bookmarkedItems)}
 *    />
 * 
 * 3. The NewsFeed component provides:
 *    - Inshorts-like UI with vertical scrolling and snap effect
 *    - Tab-based filtering (My Feed, Finance, Videos, Insights)
 *    - Full-screen article modal with sharing and bookmarking
 *    - Pull-to-refresh functionality
 *    - Responsive design optimized for mobile
 * 
 * 4. Required article properties:
 *    - id: number
 *    - headline: string (title)
 *    - description: string
 *    - image: string (URL)
 *    - category: string
 *    - readTime: string
 *    - timestamp: string (date)
 *    - fullText?: string (optional, for modal)
 *    - sourceUrl?: string (optional, for "Read Full Article" button)
 */
