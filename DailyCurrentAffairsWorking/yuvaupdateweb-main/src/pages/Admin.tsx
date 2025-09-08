
import React, { useState, useEffect, useRef } from "react";
import { firebaseNewsService } from "../services/FirebaseNewsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { NotificationSender } from "../services/NotificationSender";
import { TestNotificationService } from "../services/TestNotificationService";

const HEADLINE_MAX = 200;
const DESCRIPTION_WORD_MAX = 80;
const READTIME_MAX = 50;
const SOURCEURL_MAX = 1000;
const SOURCE_NAME_MAX = 100;

export default function AdminPanel() {
  // Ref for scrolling to form on edit
  const formRef = useRef<HTMLFormElement | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'api' | 'manage' | 'categories' | 'notifications'>('manual');
  // Add/Edit News
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mediaSource, setMediaSource] = useState<'url' | 'upload'>("url");
  const [uploadedMedia, setUploadedMedia] = useState<any>(null); // Stub for upload result
  const [readTime, setReadTime] = useState("");
  const [source, setSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  // Manage News
  const [newsList, setNewsList] = useState<any[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  // Categories
  const [newCategory, setNewCategory] = useState("");
  // Analytics
  const [analytics, setAnalytics] = useState({ articles: 0, categories: 0, users: 0, comments: 0, uploads: 0 });
  // Notification states
  const [isNotificationSending, setIsNotificationSending] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [customNotificationTitle, setCustomNotificationTitle] = useState("");
  const [customNotificationBody, setCustomNotificationBody] = useState("");
  const [notificationStats, setNotificationStats] = useState({ totalSent: 0, recentNotifications: 0 });

  useEffect(() => {
  fetchCategories();
  if (activeTab === 'manage') fetchNews();
  // Only reset form if not editing
  if (activeTab === 'manual' && !editingArticle) resetForm();
  // Load notification stats when switching to notifications tab
  if (activeTab === 'notifications') {
    const stats = NotificationSender.getNotificationStats();
    setNotificationStats(stats);
  }
    // eslint-disable-next-line
  }, [activeTab]);

  async function fetchCategories() {
    try {
      const cats = await firebaseNewsService.getCategories();
      setCategories(cats);
      setAnalytics(a => ({ ...a, categories: cats.length }));
    } catch (e) {
      setCategories(["Breaking", "Business", "Entertainment", "General", "Health", "Science", "Sports", "Technology"]);
    }
  }

  async function fetchNews() {
    setIsLoadingNews(true);
    try {
      const news = await firebaseNewsService.getArticlesWithDocIds();
      // Normalize all fields for each article so edit always works
      const normalized = news.map(article => ({
        headline: typeof article.headline === 'string' ? article.headline : '',
        description: typeof article.description === 'string' ? article.description : '',
        category: typeof article.category === 'string' ? article.category : '',
        image: typeof article.image === 'string' ? article.image : '',
        youtubeUrl: typeof article.youtubeUrl === 'string' ? article.youtubeUrl : '',
        readTime: typeof article.readTime === 'string' ? article.readTime : '',
        source: typeof article.source === 'string' ? article.source : '',
        sourceUrl: typeof article.sourceUrl === 'string' ? article.sourceUrl : '',
        docId: article.docId || article.id || '',
        mediaType: article.mediaType || '',
        mediaPath: article.mediaPath || '',
        // keep any other fields
        ...article
      }));
      setNewsList(normalized);
      setAnalytics(a => ({ ...a, articles: normalized.length }));
    } catch (e) {
      setNewsList([]);
    } finally {
      setIsLoadingNews(false);
    }
  }

  function limitWords(text: string, maxWords: number) {
    if (!text) return "";
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return words.join(" ");
    return words.slice(0, maxWords).join(" ");
  }

  function getWordCount(text: string) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function resetForm() {
    setHeadline("");
    setDescription("");
    setCategory("");
    setImageUrl("");
    setYoutubeUrl("");
    setReadTime("");
    setSource("");
    setSourceUrl("");
    setEditingArticle(null);
    setUploadedMedia(null);
    setMediaSource("url");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!headline || !description || !category || !sourceUrl) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      new URL(sourceUrl);
    } catch {
      alert("Please enter a valid URL for the external link.");
      return;
    }
    
    // Prevent duplicate submissions
    if (isLoading || isNotificationSending) {
      console.log('Submission blocked - already in progress');
      return;
    }

    setIsLoading(true);
    try {
      // Use uploaded media URL if available, otherwise use provided URL or placeholder
      let mediaUrl = imageUrl;
      if (uploadedMedia) {
        mediaUrl = uploadedMedia.url;
      } else if (!mediaUrl) {
        mediaUrl = `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`;
      }

      const payload: any = {
        headline: headline.slice(0, HEADLINE_MAX),
        description: limitWords(description, DESCRIPTION_WORD_MAX),
        image: mediaUrl,
        youtubeUrl: youtubeUrl || undefined,
        source: source.slice(0, SOURCE_NAME_MAX),
        category,
        readTime: (readTime || '2 min read').slice(0, READTIME_MAX),
        sourceUrl: sourceUrl.slice(0, SOURCEURL_MAX),
        mediaType: youtubeUrl ? 'youtube' : (uploadedMedia?.type || 'image'),
        mediaPath: uploadedMedia?.path,
        timestamp: new Date().toISOString(),
      };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });

      let result: any = null;
      if (editingArticle && editingArticle.docId) {
        await firebaseNewsService.updateArticle(editingArticle.docId, payload);
        result = editingArticle.docId;
        alert("Article updated!");
        setEditingArticle(null);
      } else {
        result = await firebaseNewsService.addArticle(payload);
        alert("News article added!");
        
        // Send push notification (non-blocking with rate limiting)
        (async () => {
          try {
            // Rate limiting: prevent sending notifications more than once per 5 seconds
            const now = Date.now();
            const timeSinceLastNotification = now - lastNotificationTime;
            const MIN_NOTIFICATION_INTERVAL = 5000; // 5 seconds
            
            if (timeSinceLastNotification < MIN_NOTIFICATION_INTERVAL) {
              console.log('⏭️ Notification rate limited - too soon since last notification');
              return;
            }

            // Prevent duplicate notification sending
            if (isNotificationSending) {
              console.log('⏭️ Notification already in progress');
              return;
            }
            
            setIsNotificationSending(true);
            setLastNotificationTime(now);
            
            try {
              // Send proper notification using NotificationSender
              await NotificationSender.sendNewArticleNotification({
                id: result || '',
                headline: payload.headline,
                category: payload.category,
                docId: result
              });

              // Update notification stats
              const stats = NotificationSender.getNotificationStats();
              setNotificationStats(stats);
              
              console.log('Notification sent for new article:', payload.headline);
            } finally {
              setIsNotificationSending(false);
            }
            
          } catch (e) {
            console.warn('Push notification failed:', e);
          }
        })();
      }

      resetForm();
      fetchNews();
    } catch (error) {
      alert("Failed to save article.");
      console.error('Article save error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(article: any) {
    // Debug: log the article being edited
    console.log('Editing article:', article);
    // Set all fields from the selected article
    setEditingArticle(article);
    setHeadline(typeof article.headline === 'string' ? article.headline : "");
    setDescription(typeof article.description === 'string' ? article.description : "");
    setCategory(typeof article.category === 'string' ? article.category : "");
    setImageUrl(typeof article.image === 'string' ? article.image : "");
    setYoutubeUrl(typeof article.youtubeUrl === 'string' ? article.youtubeUrl : "");
    setReadTime(typeof article.readTime === 'string' ? article.readTime : "");
    setSource(typeof article.source === 'string' ? article.source : "");
    setSourceUrl(typeof article.sourceUrl === 'string' ? article.sourceUrl : "");
    if (article.mediaType === 'youtube') {
      setMediaSource('url');
      setUploadedMedia(null);
    } else if (article.mediaPath && article.image) {
      setMediaSource('upload');
      setUploadedMedia({ url: article.image, path: article.mediaPath, type: article.mediaType });
    } else {
      setMediaSource('url');
      setUploadedMedia(null);
    }
    setActiveTab('manual');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this article?")) return;
    try {
      await firebaseNewsService.deleteArticle({ id });
      alert("Article deleted.");
      fetchNews();
    } catch {
      alert("Failed to delete article.");
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      alert("Category already exists");
      return;
    }
    try {
      const updatedCategories = [...categories, newCategory.trim()];
      await firebaseNewsService.saveCategories(updatedCategories);
      setCategories(updatedCategories);
      setNewCategory("");
      alert(`Category '${newCategory.trim()}' added.`);
    } catch {
      alert("Failed to add category to Firebase");
    }
  }

  async function handleRemoveCategory(cat: string) {
    if (!window.confirm(`Delete category '${cat}'?`)) return;
    try {
      const updatedCategories = categories.filter(c => c !== cat);
      await firebaseNewsService.saveCategories(updatedCategories);
      setCategories(updatedCategories);
      alert(`Category '${cat}' deleted.`);
    } catch {
      alert("Failed to remove category from Firebase");
    }
  }

  // API Import (stub)
  function handleApiImport(e: React.FormEvent) {
    e.preventDefault();
    alert("API Import is not implemented in the web admin panel yet.");
  }

  // Notification Testing Functions
  async function handleTestNotification() {
    try {
      setIsNotificationSending(true);
      const success = await TestNotificationService.sendTestNotification();
      
      if (success) {
        alert("Test notification sent successfully! Check mobile devices for the notification.");
        // Update notification stats
        const stats = NotificationSender.getNotificationStats();
        setNotificationStats(stats);
      } else {
        alert("Test notification failed. Check console for details.");
      }
    } catch (error) {
      console.error('Test notification error:', error);
      alert("Test notification failed with error. Check console for details.");
    } finally {
      setIsNotificationSending(false);
    }
  }

  async function handleCustomNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!customNotificationTitle.trim() || !customNotificationBody.trim()) {
      alert("Please enter both title and message for the custom notification.");
      return;
    }

    try {
      setIsNotificationSending(true);
      const success = await TestNotificationService.sendCustomTestNotification(
        customNotificationTitle.trim(),
        customNotificationBody.trim()
      );
      
      if (success) {
        alert("Custom notification sent successfully!");
        setCustomNotificationTitle("");
        setCustomNotificationBody("");
        // Update notification stats
        const stats = NotificationSender.getNotificationStats();
        setNotificationStats(stats);
      } else {
        alert("Custom notification failed. Check console for details.");
      }
    } catch (error) {
      console.error('Custom notification error:', error);
      alert("Custom notification failed with error. Check console for details.");
    } finally {
      setIsNotificationSending(false);
    }
  }

  async function handleBreakingNewsNotification() {
    if (!headline.trim()) {
      alert("Please enter a headline first, then use this button to send it as breaking news.");
      return;
    }

    try {
      setIsNotificationSending(true);
      const success = await TestNotificationService.sendBreakingNewsNotification(headline);
      
      if (success) {
        alert("Breaking news notification sent successfully!");
        // Update notification stats
        const stats = NotificationSender.getNotificationStats();
        setNotificationStats(stats);
      } else {
        alert("Breaking news notification failed. Check console for details.");
      }
    } catch (error) {
      console.error('Breaking news notification error:', error);
      alert("Breaking news notification failed with error. Check console for details.");
    } finally {
      setIsNotificationSending(false);
    }
  }

  async function handleCheckNotificationStatus() {
    try {
      setIsNotificationSending(true);
      const status = await TestNotificationService.checkNotificationSystemStatus();
      
      // Update notification stats
      setNotificationStats(status.stats);
      
      if (status.status === 'working') {
        alert(`Notification System Status: ${status.message}\n\nStats:\n- Total sent: ${status.stats.totalSent || 0}\n- Recent: ${status.stats.recentNotifications || 0}`);
      } else {
        alert(`Notification System Status: ${status.message}\n\nCheck console for detailed error information.`);
      }
      
      console.log('Notification system status:', status);
    } catch (error) {
      console.error('Status check error:', error);
      alert("Failed to check notification system status. Check console for details.");
    } finally {
      setIsNotificationSending(false);
    }
  }

  async function handleClearNotificationCache() {
    try {
      TestNotificationService.clearNotificationCache();
      setNotificationStats({ totalSent: 0, recentNotifications: 0 });
      alert("Notification cache cleared successfully!");
    } catch (error) {
      console.error('Cache clear error:', error);
      alert("Failed to clear notification cache.");
    }
  }

  // Analytics (users/comments/uploads are stubbed)
  useEffect(() => {
    // TODO: implement real analytics for users/comments/uploads
    setAnalytics(a => ({ ...a, users: 0, comments: 0, uploads: 0 }));
    // Load initial notification stats
    const stats = NotificationSender.getNotificationStats();
    setNotificationStats(stats);
  }, []);

  return (
  <div className="max-w-4xl mx-auto p-2 sm:p-4 md:p-6 bg-background rounded shadow mt-4 md:mt-10 w-full min-h-screen">
      <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>
      <div className="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center">
        <Button variant={activeTab === 'manual' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('manual')}>Add/Edit News</Button>
        <Button variant={activeTab === 'manage' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('manage')}>Manage News</Button>
        <Button variant={activeTab === 'categories' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('categories')}>Categories</Button>
        <Button variant={activeTab === 'notifications' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('notifications')}>Notifications</Button>
        <Button variant={activeTab === 'api' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('api')}>API Import</Button>
      </div>
      {/* Analytics Section */}
  <div className="mb-4 sm:mb-6 grid grid-cols-2 xs:grid-cols-3 md:grid-cols-7 gap-2 sm:gap-4 text-center">
        <div><div className="font-bold text-lg">{analytics.articles}</div><div className="text-xs text-muted-foreground">Articles</div></div>
        <div><div className="font-bold text-lg">{analytics.categories}</div><div className="text-xs text-muted-foreground">Categories</div></div>
        <div><div className="font-bold text-lg">{analytics.users}</div><div className="text-xs text-muted-foreground">Users</div></div>
        <div><div className="font-bold text-lg">{analytics.comments}</div><div className="text-xs text-muted-foreground">Comments</div></div>
        <div><div className="font-bold text-lg">{analytics.uploads}</div><div className="text-xs text-muted-foreground">Uploads</div></div>
        <div><div className="font-bold text-lg">{notificationStats.totalSent}</div><div className="text-xs text-muted-foreground">Notifications</div></div>
        <div><div className="font-bold text-lg">{isNotificationSending ? 'Sending...' : 'Ready'}</div><div className="text-xs text-muted-foreground">Status</div></div>
      </div>
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <form ref={formRef} onSubmit={handleSubmit} className={`space-y-4 ${editingArticle ? 'border-2 border-blue-500 rounded p-2' : ''} bg-white dark:bg-card shadow-sm p-2 sm:p-4 w-full`}>
            <div>
              <label className="block font-semibold mb-1">Headline</label>
              <Input value={headline} onChange={e => setHeadline(e.target.value.slice(0, HEADLINE_MAX))} maxLength={HEADLINE_MAX} required />
            </div>
            <div>
              <label className="block font-semibold mb-1">Description</label>
              <textarea className="w-full rounded border border-muted bg-card p-2 text-foreground min-h-[80px]" value={description} onChange={e => setDescription(limitWords(e.target.value, DESCRIPTION_WORD_MAX))} required />
              <div className="text-xs text-muted-foreground text-right mt-1">{getWordCount(description)} / {DESCRIPTION_WORD_MAX} words</div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Category</label>
              <select className="w-full rounded border border-muted bg-card p-2 text-foreground" value={category} onChange={e => setCategory(e.target.value)} required>
                <option value="">Select category</option>
                {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Image URL</label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." disabled={mediaSource === 'upload'} />
              <div className="flex gap-2 mt-2">
                <label className="inline-flex items-center">
                  <input type="radio" checked={mediaSource === 'url'} onChange={() => setMediaSource('url')} />
                  <span className="ml-1">Use URL</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" checked={mediaSource === 'upload'} onChange={() => setMediaSource('upload')} />
                  <span className="ml-1">Upload (not implemented)</span>
                </label>
              </div>
              {mediaSource === 'upload' && (
                <div className="mt-2 text-xs text-muted-foreground">File upload is not implemented in the web version yet.</div>
              )}
            </div>
            <div>
              <label className="block font-semibold mb-1">YouTube URL</label>
              <Input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div>
              <label className="block font-semibold mb-1">Read Time</label>
              <Input value={readTime} onChange={e => setReadTime(e.target.value.slice(0, READTIME_MAX))} placeholder="e.g. 2 min read" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Source</label>
              <Input value={source} onChange={e => setSource(e.target.value.slice(0, SOURCE_NAME_MAX))} placeholder="e.g. Times of India" />
            </div>
            <div>
              <label className="block font-semibold mb-1">External Link (Required)</label>
              <Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://example.com/article" required maxLength={SOURCEURL_MAX} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isNotificationSending}>
              {(isLoading || isNotificationSending) ? <Loader2 className="animate-spin w-5 h-5 inline-block mr-2" /> : null}
              {editingArticle 
                ? (isLoading ? "Updating..." : "Update Article") 
                : (isLoading ? "Adding..." : isNotificationSending ? "Sending Notification..." : "Add Article & Notify")
              }
            </Button>
            {!editingArticle && headline && (
              <Button 
                type="button" 
                variant="destructive" 
                className="w-full mt-2" 
                disabled={isLoading || isNotificationSending}
                onClick={handleBreakingNewsNotification}
              >
                {isNotificationSending ? <Loader2 className="animate-spin w-4 h-4 inline-block mr-2" /> : null}
                Send as Breaking News
              </Button>
            )}
            {editingArticle && (
              <div className="text-blue-600 text-sm text-center">Editing existing article. Make changes and click Update Article.</div>
            )}
          </form>
          {/* Live Preview */}
          <div className="bg-card border rounded p-2 sm:p-4 flex flex-col gap-2 w-full max-w-full overflow-x-auto">
            <div className="font-bold text-lg mb-1">{headline || <span className="text-muted-foreground">Headline preview</span>}</div>
            {imageUrl && mediaSource === 'url' && (
              <img src={imageUrl} alt="Preview" className="w-full max-h-48 object-cover rounded mb-2" />
            )}
            {youtubeUrl && (
              <div className="aspect-video mb-2">
                <iframe
                  src={youtubeUrl.replace('watch?v=', 'embed/')}
                  title="YouTube preview"
                  className="w-full h-full rounded"
                  allowFullScreen
                />
              </div>
            )}
            <div className="text-muted-foreground mb-1">{description || <span className="text-muted-foreground">Description preview</span>}</div>
            <div className="text-xs text-muted-foreground mb-1">{category || 'Category'} | {readTime || 'Read time'}</div>
            <div className="text-xs text-muted-foreground">{source || 'Source'} | {sourceUrl ? <a href={sourceUrl} className="underline" target="_blank" rel="noopener noreferrer">Link</a> : 'External Link'}</div>
          </div>
        </div>
      )}
      {activeTab === 'manage' && (
        <div>
          <Button onClick={fetchNews} className="mb-2 sm:mb-4 w-full sm:w-auto">Reload News</Button>
          {isLoadingNews ? <Loader2 className="animate-spin w-6 h-6 mx-auto my-8" /> : (
            <div className="space-y-3 sm:space-y-4">
              {newsList.length === 0 && <div className="text-muted-foreground">No news articles found.</div>}
              {newsList.map(article => (
                <div key={article.docId || article.id} className="border rounded p-2 sm:p-4 bg-card flex flex-col md:flex-row md:items-center gap-2 sm:gap-4 w-full overflow-x-auto">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base sm:text-lg mb-1 break-words">{article.headline}</div>
                    <div className="text-muted-foreground mb-1 break-words">{article.description}</div>
                    <div className="text-xs text-muted-foreground mb-1">{article.category} | {article.readTime}</div>
                    <div className="text-xs text-muted-foreground">{article.source} | <a href={article.sourceUrl} className="underline" target="_blank" rel="noopener noreferrer">Link</a></div>
                  </div>
                  <div className="flex flex-row md:flex-col gap-2 md:items-end w-full md:w-auto">
                    <Button size="sm" variant="outline" className="w-1/2 md:w-auto" onClick={() => handleEdit(article)}>Edit</Button>
                    <Button size="sm" variant="destructive" className="w-1/2 md:w-auto" onClick={() => handleDelete(article.docId || article.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === 'categories' && (
        <form onSubmit={handleAddCategory} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <div className="flex-1">
              <label className="block font-semibold mb-1">Add Category</label>
              <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New category" />
            </div>
            <Button type="submit" className="w-full sm:w-auto">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {categories.map(cat => (
              <span key={cat} className="inline-flex items-center bg-muted rounded px-3 py-1 text-sm font-medium w-full sm:w-auto justify-between">
                <span className="truncate">{cat}</span>
                <button type="button" className="ml-2 text-red-500 hover:text-red-700" onClick={() => handleRemoveCategory(cat)}>&times;</button>
              </span>
            ))}
          </div>
        </form>
      )}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Notification Statistics */}
          <div className="bg-card border rounded p-4">
            <h3 className="text-lg font-semibold mb-4">Notification Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{notificationStats.totalSent}</div>
                <div className="text-sm text-muted-foreground">Total Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{notificationStats.recentNotifications}</div>
                <div className="text-sm text-muted-foreground">Recent Cache</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{isNotificationSending ? 'Processing' : 'Active'}</div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">Mobile</div>
                <div className="text-sm text-muted-foreground">Push Ready</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleCheckNotificationStatus} 
                disabled={isNotificationSending}
                variant="outline"
                className="flex-1 min-w-[150px]"
              >
                {isNotificationSending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Check Status
              </Button>
              <Button 
                onClick={handleClearNotificationCache} 
                disabled={isNotificationSending}
                variant="outline"
                className="flex-1 min-w-[150px]"
              >
                Clear Cache
              </Button>
            </div>
          </div>

          {/* Quick Test Notification */}
          <div className="bg-card border rounded p-4">
            <h3 className="text-lg font-semibold mb-4">Test Notifications</h3>
            <div className="space-y-3">
              <Button 
                onClick={handleTestNotification} 
                disabled={isNotificationSending}
                className="w-full"
              >
                {isNotificationSending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Send Test Notification
              </Button>
              <p className="text-sm text-muted-foreground">
                Sends a test notification to all mobile app users to verify the system is working.
              </p>
            </div>
          </div>

          {/* Custom Notification */}
          <div className="bg-card border rounded p-4">
            <h3 className="text-lg font-semibold mb-4">Custom Notification</h3>
            <form onSubmit={handleCustomNotification} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Title</label>
                <Input 
                  value={customNotificationTitle} 
                  onChange={e => setCustomNotificationTitle(e.target.value)} 
                  placeholder="e.g., Important Update"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Message</label>
                <textarea 
                  className="w-full rounded border border-muted bg-card p-2 text-foreground min-h-[80px]" 
                  value={customNotificationBody} 
                  onChange={e => setCustomNotificationBody(e.target.value)} 
                  placeholder="Enter your custom notification message..."
                  maxLength={200}
                />
                <div className="text-xs text-muted-foreground text-right mt-1">
                  {customNotificationBody.length} / 200 characters
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isNotificationSending || !customNotificationTitle.trim() || !customNotificationBody.trim()}
                className="w-full"
              >
                {isNotificationSending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Send Custom Notification
              </Button>
            </form>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-4">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Important Notes</h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Notifications are automatically sent when you add new articles</li>
              <li>• Rate limiting prevents spam (minimum 5 seconds between notifications)</li>
              <li>• Test notifications help verify the system without affecting real users</li>
              <li>• Breaking news notifications have higher priority and visibility</li>
              <li>• All notifications are sent to mobile app users who have enabled push notifications</li>
            </ul>
          </div>
        </div>
      )}
      {activeTab === 'api' && (
        <form onSubmit={handleApiImport} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">API Query</label>
            <Input placeholder="Search or fetch from API... (stub)" disabled />
          </div>
          <Button type="submit" disabled>Fetch (Not implemented)</Button>
        </form>
      )}
    </div>
  );
}