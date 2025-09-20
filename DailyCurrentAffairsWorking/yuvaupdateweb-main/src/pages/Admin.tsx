
import React, { useState, useEffect, useRef } from "react";
import { firebaseNewsService } from "../services/FirebaseNewsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X, Play, Image as ImageIcon, LogOut, RefreshCw, TrendingUp, Users, Eye, Clock, Activity, Globe, Smartphone, Monitor, BarChart3, Edit, Trash2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { NotificationSender } from "../services/NotificationSender";
import { TestNotificationService } from "../services/TestNotificationService";
import { webFileUploadService, UploadResult } from "../services/WebFileUploadService";
import { AuthProtected } from "@/components/AuthProtected";
import { VideoUrlUtils, VideoUrlInfo } from "../utils/VideoUrlUtils";
import { auth } from "@/services/firebase.config";
import { signOut } from "firebase/auth";
import { WebAnalyticsService, AnalyticsData } from "../services/WebAnalyticsService";
import { VideoService } from "../services/VideoService";
import { VideoReel } from "../types/types";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// Make VideoService available in browser console for debugging
(window as any).VideoService = VideoService;

const HEADLINE_MAX = 200;
const DESCRIPTION_WORD_MAX = 80;
const READTIME_MAX = 50;
const SOURCEURL_MAX = 1000;
const SOURCE_NAME_MAX = 100;

export default function AdminPanel() {
  // Ensure runtime global API base is set for any embedded components that
  // run in mixed environments. For web builds, Vite provides `VITE_API_BASE_URL`.
  try {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || window.location.origin;
    (globalThis as any).API_BASE = apiBase.replace(/\/$/, '');
    // Also expose to window for debugging
    (window as any).__API_BASE__ = (globalThis as any).API_BASE;
  } catch (e) {
    // import.meta may not be available in some environments; ignore.
  }

  // Ref for scrolling to form on edit
  const formRef = useRef<HTMLFormElement | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'api' | 'manage' | 'categories' | 'notifications' | 'analytics' | 'videos'>('manual');
  // Add/Edit News
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mediaSource, setMediaSource] = useState<'url' | 'upload'>("url");
  const [uploadedMedia, setUploadedMedia] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'firebase' | 'r2'>('firebase');
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
  const [webAnalytics, setWebAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Videos states
  const [videos, setVideos] = useState<VideoReel[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [originalSource, setOriginalSource] = useState("");
  const [originalSourceUrl, setOriginalSourceUrl] = useState("");
  // removed originalCreator and creatorProfilePic as part of admin simplification
  const [videoCategory, setVideoCategory] = useState("General");
  const [videoTags, setVideoTags] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoReel | null>(null);
  const [cleanupCount, setCleanupCount] = useState<number>(0);
  const [isCleaning, setIsCleaning] = useState(false);
  const [videoUrlInfo, setVideoUrlInfo] = useState<VideoUrlInfo | null>(null);
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);
  // Notification states
  const [isNotificationSending, setIsNotificationSending] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [customNotificationTitle, setCustomNotificationTitle] = useState("");
  const [customNotificationBody, setCustomNotificationBody] = useState("");
  const [notificationStats, setNotificationStats] = useState({ totalSent: 0, recentNotifications: 0 });

  useEffect(() => {
    fetchCategories();
    if (activeTab === 'manage') fetchNews();
    if (activeTab === 'videos') fetchVideos();
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

  async function fetchVideos() {
    setIsLoadingVideos(true);
    try {
      const { videos: videoList } = await VideoService.getVideos();
      setVideos(videoList);
    } catch (e) {
      console.error('Error fetching videos:', e);
      setVideos([]);
    } finally {
      setIsLoadingVideos(false);
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
    setSelectedFile(null);
    setMediaSource("url");
  }

  function resetVideoForm() {
    setVideoTitle("");
    setVideoDescription("");
    setVideoUrl("");
    setOriginalSource("");
    setOriginalSourceUrl("");
    // creator fields removed
    setVideoCategory("General");
    setVideoTags("");
    setThumbnailUrl("");
    setVideoUrlInfo(null);
    setEditingVideo(null);
  }

  // Handle video URL changes and parse platform info
  async function handleVideoUrlChange(url: string) {
    setVideoUrl(url);
    if (url.trim()) {
      try {
        const parsedInfo = VideoUrlUtils.parseVideoUrl(url);
        setVideoUrlInfo(parsedInfo);

        // Auto-fill source platform if detected and not manually set
        if (!originalSource && parsedInfo.platform !== 'Other' && parsedInfo.platform !== 'Direct') {
          setOriginalSource(parsedInfo.platform);
        }

        // Auto-fill thumbnail if available and not manually set
        if (!thumbnailUrl && parsedInfo.thumbnailUrl) {
          // Special handling for Instagram - fetch real thumbnail
          if (parsedInfo.platform === 'Instagram') {
            console.log('🔍 Detected Instagram URL, fetching thumbnail...');
            setIsFetchingThumbnail(true);
            try {
              const instagramThumbnail = await VideoUrlUtils.fetchInstagramThumbnail(url);
              if (instagramThumbnail) {
                setThumbnailUrl(instagramThumbnail);
                console.log('✅ Instagram thumbnail fetched:', instagramThumbnail);
              } else {
                // Use placeholder if fetch fails
                setThumbnailUrl(parsedInfo.thumbnailUrl);
              }
            } catch (error) {
              console.warn('⚠️ Failed to fetch Instagram thumbnail:', error);
              setThumbnailUrl(parsedInfo.thumbnailUrl);
            } finally {
              setIsFetchingThumbnail(false);
            }
          } else {
            // For other platforms (YouTube, etc.)
            setThumbnailUrl(parsedInfo.thumbnailUrl);
          }
        }
      } catch (error) {
        setVideoUrlInfo(null);
        if (url.trim()) {
          try {
            const parsedInfo = VideoUrlUtils.parseVideoUrl(url);
            setVideoUrlInfo(parsedInfo);
            // Auto-fill source platform if detected and not manually set
            if (!originalSource && parsedInfo.platform !== 'Other' && parsedInfo.platform !== 'Direct') {
              setOriginalSource(parsedInfo.platform);
            }
            // Auto-fill thumbnail if available and not manually set
            if (!thumbnailUrl && parsedInfo.thumbnailUrl) {
              setThumbnailUrl(parsedInfo.thumbnailUrl);
            }
          } catch (error) {
            setVideoUrlInfo(null);
          }
        } else {
          setVideoUrlInfo(null);
        }
      }
    } else {
      setVideoUrlInfo(null);
    }
  }

  // Submit handler for adding/updating a video
  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    let parsedVideoInfo: VideoUrlInfo;
    try {
  // Accept both absolute and relative (proxied) URLs by providing a base
  new URL(videoUrl, window.location.origin); // Basic URL validation
      parsedVideoInfo = VideoUrlUtils.parseVideoUrl(videoUrl);
      if (!parsedVideoInfo.isSupported) {
        const confirmContinue = window.confirm(
          `⚠️ Video platform "${parsedVideoInfo.platform}" may not be fully supported for embedded playback.\n\n` +
          `The video will be saved but may require users to open it in a new tab to view.\n\n` +
          `Supported platforms: YouTube, Instagram, TikTok, Direct MP4 files.\n\n` +
          `Do you want to continue anyway?`
        );
        if (!confirmContinue) return;
      }
      // Validate other URLs
      if (originalSourceUrl) {
        new URL(originalSourceUrl, window.location.origin);
      }
      if (thumbnailUrl) {
        new URL(thumbnailUrl, window.location.origin);
      }
    
  const detectedPlatform = parsedVideoInfo.platform;
  const finalThumbnailUrl = thumbnailUrl?.trim() || parsedVideoInfo.thumbnailUrl || 'https://via.placeholder.com/720x1280.png?text=Video+Thumbnail';
  // Resolve playback URL (may return proxied path like `/api/r2/media?...`).
  // Ensure we save an absolute URL so mobile/native clients can reach it.
  let resolvedPlayback = webFileUploadService.getPlaybackUrl(videoUrl.trim());
  if (resolvedPlayback.startsWith('/api')) {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || window.location.origin;
    resolvedPlayback = `${apiBase}${resolvedPlayback}`;
  }

  const videoData = {
        title: videoTitle.trim(),
        description: videoDescription.trim(),
        videoUrl: resolvedPlayback,
        embedUrl: parsedVideoInfo.embedUrl, // Add embed URL for supported platforms
        thumbnailUrl: finalThumbnailUrl,
        category: videoCategory,
        tags: videoTags.split(',').map(tag => tag.trim()).filter(Boolean),
        originalSource: {
          sourcePlatform: (originalSource || detectedPlatform) as 'Instagram' | 'TikTok' | 'YouTube' | 'Facebook' | 'Twitter' | 'Other',
          sourceUrl: originalSourceUrl?.trim() || videoUrl,
          creatorName: 'Unknown',
        },
        // Add metadata about video platform support
        platformInfo: {
          detectedPlatform: parsedVideoInfo.platform,
          isSupported: parsedVideoInfo.isSupported,
          // Coerce any non-supported literal to closest supported value for backend type
          playbackType: parsedVideoInfo.playbackType === 'iframe' ? 'embed' : parsedVideoInfo.playbackType,
          ...(parsedVideoInfo.videoId && { videoId: parsedVideoInfo.videoId })
        },
        duration: 0, // Will be determined later
        resolution: '1080p', // Default
        uploadedBy: 'admin',
        aspectRatio: '9:16' as const,
        isFeatured: false,
        moderationStatus: 'approved' as const,
        isActive: true
      };

      if (editingVideo) {
        console.log('Updating video with data:', videoData);
        const result = await VideoService.updateVideo(String(editingVideo.id), videoData);
        console.log('Video updated successfully:', result);

        alert("✅ Video updated successfully! Changes will appear in the video feed.");
      } else {
        console.log('Adding video with data:', videoData);
        const result = await VideoService.addVideo(videoData);
        console.log('Video added successfully:', result);

        alert("✅ Video added successfully! It will appear in the video feed.");
      }

      resetVideoForm();

      // Refresh the video list
      await fetchVideos();

    } catch (error) {
      console.error('Error adding video:', error);
      alert(`❌ Failed to add video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAddingVideo(false);
    }
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
      setUploadedMedia({
        url: article.image,
        path: article.mediaPath,
        type: article.mediaType || 'image',
        name: 'Existing media',
        size: 0
      });
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

  async function handleDeleteVideo(videoId: string, videoTitle: string) {
    if (!window.confirm(`Are you sure you want to delete "${videoTitle}"?`)) return;
    try {
      await VideoService.deleteVideo(videoId);
      alert("✅ Video deleted successfully!");
      // Refresh the video list
      await fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      alert(`❌ Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Cleanup: delete oldest N videos
  async function handleDeleteOldestN() {
    if (!window.confirm(`Delete the oldest ${cleanupCount} videos? This will remove Firestore documents and stored media.`)) return;
    setIsCleaning(true);
    try {
      const { default: VideoCleanupService } = await import('../services/VideoCleanupService');
      const res = await VideoCleanupService.deleteOldestN(cleanupCount);
      alert(`Deleted ${res.deleted} videos. ${res.errors.length} errors.`);
      // refresh list
      await fetchVideos();
    } catch (e) {
      console.error('Cleanup failed', e);
      alert('Cleanup failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsCleaning(false);
    }
  }

  function handleEditVideo(video: VideoReel) {
    // Populate the form with existing video data
    setEditingVideo(video);
    setVideoTitle(video.title);
    setVideoDescription(video.description || '');
    setVideoUrl(video.videoUrl);
    setOriginalSource(video.originalSource?.sourcePlatform || '');
    setOriginalSourceUrl(video.originalSource?.sourceUrl || '');
    setVideoCategory(video.category);
    setVideoTags(video.tags?.join(', ') || '');
    setThumbnailUrl(video.thumbnailUrl);

    // Switch to videos tab and scroll to form
    setActiveTab('videos');
    setTimeout(() => {
      const form = document.getElementById('video-form');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  // File Upload Functions
  async function handleFileSelect() {
    try {
      const file = await webFileUploadService.showFilePicker('both');
      if (file) {
        setSelectedFile(file);
        setMediaSource('upload');
        console.log('File selected:', file.name, file.type, webFileUploadService.formatFileSize(file.size));
      }
    } catch (error) {
      console.error('File selection error:', error);
      alert('Failed to select file');
    }
  }

  async function handleFileUpload() {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setIsUploading(true);
    try {
      const uploadResult = await webFileUploadService.uploadFileToTarget(selectedFile, category || 'general', uploadTarget);
      setUploadedMedia(uploadResult);
      setImageUrl(uploadResult.url); // Set the image URL to the uploaded file URL
      setSelectedFile(null);
      alert(`${uploadResult.type} uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveUploadedMedia() {
    if (window.confirm('Are you sure you want to remove the uploaded media?')) {
      setUploadedMedia(null);
      setSelectedFile(null);
      setImageUrl('');
      setMediaSource('url');
    }
  }

  function handleCancelFileSelection() {
    setSelectedFile(null);
    setMediaSource('url');
  }

  // YouTube Helper Functions
  function getYouTubeVideoId(url: string): string | null {
    return webFileUploadService.extractYouTubeVideoId(url);
  }

  function getYouTubeEmbedUrl(videoId: string): string {
    return webFileUploadService.getYouTubeEmbedUrl(videoId);
  }

  function getYouTubeThumbnail(videoId: string): string {
    return webFileUploadService.getYouTubeThumbnailUrl(videoId, 'high');
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

  // Track admin page view and load analytics data
  useEffect(() => {
    // Track admin page view
    WebAnalyticsService.trackPageView('/admin');
    // Load web analytics
    const loadAnalytics = async () => {
      try {
        setIsLoadingAnalytics(true);
        const data = await WebAnalyticsService.getAnalyticsData();
        setWebAnalytics(data);
        setLastUpdated(new Date());
        setAnalytics(a => ({
          ...a,
          users: data.totalUsers,
          comments: 0, // Still not implemented
          uploads: 0   // Still not implemented
        }));
      } catch (error) {
        console.error('Failed to load analytics:', error);
        setAnalytics(a => ({ ...a, users: 0, comments: 0, uploads: 0 }));
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    loadAnalytics();

    // Load initial notification stats
    const stats = NotificationSender.getNotificationStats();
    setNotificationStats(stats);

    // Set up real-time analytics updates
    const unsubscribeAnalytics = WebAnalyticsService.subscribeToAnalytics((data) => {
      setWebAnalytics(data);
      setAnalytics(a => ({
        ...a,
        users: data.totalUsers
      }));
    });

    return () => {
      unsubscribeAnalytics();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthProtected>
      <div className="max-w-4xl mx-auto p-2 sm:p-4 md:p-6 bg-background rounded shadow mt-4 md:mt-10 w-full min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Admin Panel</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center">
          <Button variant={activeTab === 'manual' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('manual')}>Add/Edit News</Button>
          <Button variant={activeTab === 'videos' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('videos')}>Videos</Button>
          <Button variant={activeTab === 'manage' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('manage')}>Manage News</Button>
          <Button variant={activeTab === 'categories' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('categories')}>Categories</Button>
          <Button variant={activeTab === 'notifications' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('notifications')}>Notifications</Button>
          <Button variant={activeTab === 'analytics' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('analytics')}>Analytics</Button>
          <Button variant={activeTab === 'api' ? 'default' : 'outline'} className="flex-1 min-w-[120px]" onClick={() => setActiveTab('api')}>API Import</Button>
        </div>
        {/* Quick Analytics Overview */}
        <div className="mb-4 sm:mb-6 grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-4 text-center">
          <div className="bg-card border rounded-lg p-3">
            <div className="font-bold text-lg">{analytics.articles}</div>
            <div className="text-xs text-muted-foreground">Articles</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="font-bold text-lg">{analytics.categories}</div>
            <div className="text-xs text-muted-foreground">Categories</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="font-bold text-lg text-blue-600">{webAnalytics?.totalUsers || 0}</div>
            <div className="text-xs text-muted-foreground">Total Users</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="font-bold text-lg text-green-600">{webAnalytics?.activeUsers || 0}</div>
            <div className="text-xs text-muted-foreground">Online Now</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="font-bold text-lg text-purple-600">{webAnalytics?.totalPageViews || 0}</div>
            <div className="text-xs text-muted-foreground">Page Views</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="font-bold text-lg text-orange-600">{webAnalytics?.dailyUsers || 0}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="font-bold text-lg">{notificationStats.totalSent}</div>
            <div className="text-xs text-muted-foreground">Notifications</div>
          </div>
          <div className="bg-card border rounded-lg p-3">
            <div className="font-bold text-lg text-sm">{isNotificationSending ? 'Sending...' : 'Ready'}</div>
            <div className="text-xs text-muted-foreground">Status</div>
          </div>
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
                <label className="block font-semibold mb-1">Media</label>
                <div className="flex gap-2 mb-2">
                  <label className="inline-flex items-center">
                    <input type="radio" checked={mediaSource === 'url'} onChange={() => setMediaSource('url')} />
                    <span className="ml-1">Use URL</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input type="radio" checked={mediaSource === 'upload'} onChange={() => setMediaSource('upload')} />
                    <span className="ml-1">Upload File</span>
                  </label>
                </div>

                {mediaSource === 'url' && (
                  <Input
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                )}

                {mediaSource === 'upload' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                      <label className="inline-flex items-center">
                        <input type="radio" name="uploadTarget" checked={uploadTarget === 'firebase'} onChange={() => setUploadTarget('firebase')} />
                        <span className="ml-2">Firebase</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input type="radio" name="uploadTarget" checked={uploadTarget === 'r2'} onChange={() => setUploadTarget('r2')} />
                        <span className="ml-2">Cloudflare R2</span>
                      </label>
                    </div>
                    {!selectedFile && !uploadedMedia && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleFileSelect}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Select Image or Video
                      </Button>
                    )}

                    {selectedFile && !uploadedMedia && (
                      <div className="border rounded p-3 bg-muted">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Selected File:</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelFileSelection}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Name: {selectedFile.name}</div>
                          <div>Size: {webFileUploadService.formatFileSize(selectedFile.size)}</div>
                          <div>Type: {selectedFile.type}</div>
                        </div>
                        {selectedFile.type.startsWith('image/') && (
                          <img
                            src={webFileUploadService.getFilePreviewURL(selectedFile)}
                            alt="Preview"
                            className="w-full max-h-32 object-cover rounded mt-2"
                          />
                        )}
                        <Button
                          type="button"
                          onClick={handleFileUpload}
                          disabled={isUploading}
                          className="w-full mt-2"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload File
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {uploadedMedia && (
                      <div className="border rounded p-3 bg-green-50 dark:bg-green-900/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                            {uploadedMedia.type === 'image' ? <ImageIcon className="w-4 h-4 inline mr-1" /> : <Play className="w-4 h-4 inline mr-1" />}
                            Uploaded Successfully
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveUploadedMedia}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Name: {uploadedMedia.name}</div>
                          <div>Size: {webFileUploadService.formatFileSize(uploadedMedia.size)}</div>
                          <div>Type: {uploadedMedia.type}</div>
                        </div>
                        {uploadedMedia.type === 'image' && (
                          <img
                            src={uploadedMedia.url}
                            alt="Uploaded"
                            className="w-full max-h-32 object-cover rounded mt-2"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1">YouTube URL (Optional)</label>
                <Input
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
                {youtubeUrl && (
                  <div className="mt-2">
                    {(() => {
                      const videoId = getYouTubeVideoId(youtubeUrl);
                      if (videoId) {
                        return (
                          <div className="border rounded p-3 bg-blue-50 dark:bg-blue-900/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Play className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                YouTube Video Detected
                              </span>
                            </div>
                            <div className="aspect-video max-w-xs">
                              <iframe
                                src={getYouTubeEmbedUrl(videoId)}
                                className="w-full h-full rounded"
                                allowFullScreen
                                title="YouTube video preview"
                              />
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                              Video ID: {videoId}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              📺 YouTube video will be embedded. The image above will be used as a custom thumbnail instead of the auto-generated YouTube thumbnail.
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            Invalid YouTube URL. Please use a valid YouTube link.
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
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

              {/* Media Preview */}
              {youtubeUrl && (() => {
                const videoId = getYouTubeVideoId(youtubeUrl);
                if (videoId) {
                  // Show custom image as YouTube thumbnail if available
                  const thumbnailUrl = uploadedMedia?.url || imageUrl;
                  if (thumbnailUrl) {
                    return (
                      <div className="mb-2">
                        <div className="relative aspect-video max-w-md">
                          <img
                            src={thumbnailUrl}
                            alt="Custom YouTube Thumbnail"
                            className="w-full h-full object-cover rounded"
                          />
                          {/* Play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="bg-red-600 rounded-full p-3">
                              <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                          </div>
                          {/* Video indicator */}
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                            <Play className="w-3 h-3 fill-white" />
                            Video
                          </div>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          📺 Custom thumbnail for YouTube video (ID: {videoId})
                        </div>
                      </div>
                    );
                  } else {
                    // Show embedded player if no custom image
                    return (
                      <div className="aspect-video mb-2">
                        <iframe
                          src={getYouTubeEmbedUrl(videoId)}
                          title="YouTube preview"
                          className="w-full h-full rounded"
                          allowFullScreen
                        />
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {!youtubeUrl && uploadedMedia && (
                <div className="mb-2">
                  {uploadedMedia.type === 'image' ? (
                    <img src={uploadedMedia.url} alt="Preview" className="w-full max-h-48 object-cover rounded" />
                  ) : (
                    <video src={uploadedMedia.url} controls className="w-full max-h-48 rounded">
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              )}

              {!youtubeUrl && !uploadedMedia && imageUrl && mediaSource === 'url' && (
                <img src={imageUrl} alt="Preview" className="w-full max-h-48 object-cover rounded mb-2" />
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

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Analytics Header with Refresh */}
            <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  Website Analytics Dashboard
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading analytics data...'}
                </p>
              </div>
              <Button
                onClick={async () => {
                  setIsLoadingAnalytics(true);
                  const data = await WebAnalyticsService.getAnalyticsData();
                  setWebAnalytics(data);
                  setLastUpdated(new Date());
                  setIsLoadingAnalytics(false);
                }}
                disabled={isLoadingAnalytics}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoadingAnalytics ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Real-time Users */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-700 dark:text-green-300 text-sm font-medium">Live Users</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
                      {webAnalytics?.activeUsers || 0}
                    </p>
                  </div>
                  <div className="bg-green-500 rounded-full p-3">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-xs text-green-700 dark:text-green-300">Real-time</span>
                </div>
              </div>

              {/* Total Users */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-700 dark:text-blue-300 text-sm font-medium">Total Users</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                      {webAnalytics?.totalUsers || 0}
                    </p>
                  </div>
                  <div className="bg-blue-500 rounded-full p-3">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-4">Last 30 days</p>
              </div>

              {/* Page Views */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/30 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-700 dark:text-purple-300 text-sm font-medium">Page Views</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                      {webAnalytics?.totalPageViews || 0}
                    </p>
                  </div>
                  <div className="bg-purple-500 rounded-full p-3">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-4">Total views</p>
              </div>

              {/* Avg Session Duration */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/30 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-700 dark:text-orange-300 text-sm font-medium">Avg Session</p>
                    <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                      {webAnalytics?.averageSessionDuration || 0}m
                    </p>
                  </div>
                  <div className="bg-orange-500 rounded-full p-3">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-4">Minutes per session</p>
              </div>
            </div>

            {/* Charts Row 1: Traffic Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Traffic Chart */}
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Daily Traffic (Last 30 Days)
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={webAnalytics?.dailyStats || []}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: any) => [value, 'Users']}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#colorUsers)"
                      />
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hourly Activity */}
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Hourly Activity (Today)
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={webAnalytics?.hourlyStats || []}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${value}:00`}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(value) => `${value}:00 - ${value + 1}:00`}
                        formatter={(value: any) => [value, 'Users']}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Charts Row 2: Content & Devices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Pages */}
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Most Visited Pages
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={webAnalytics?.topPages || []} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="page"
                        tick={{ fontSize: 11 }}
                        width={100}
                        tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                      />
                      <Tooltip
                        formatter={(value: any) => [value, 'Views']}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                      <Bar dataKey="views" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Device Breakdown */}
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-indigo-600" />
                  Device Breakdown
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={webAnalytics?.deviceBreakdown || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {(webAnalytics?.deviceBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b'][index % 3]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [value, 'Users']}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  {(webAnalytics?.deviceBreakdown || []).map((entry, index) => (
                    <div key={entry.device} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'][index % 3] }}
                      ></div>
                      <span className="text-sm text-muted-foreground">{entry.device}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bounce Rate */}
              <div className="bg-card rounded-xl border p-6 text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {webAnalytics?.bounceRate || 0}%
                </div>
                <p className="text-sm text-muted-foreground">Bounce Rate</p>
                <p className="text-xs text-muted-foreground mt-1">Single page sessions</p>
              </div>

              {/* Content Stats */}
              <div className="bg-card rounded-xl border p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {analytics.articles}
                </div>
                <p className="text-sm text-muted-foreground">Published Articles</p>
                <p className="text-xs text-muted-foreground mt-1">Total content pieces</p>
              </div>

              {/* Notifications Sent */}
              <div className="bg-card rounded-xl border p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {notificationStats.totalSent}
                </div>
                <p className="text-sm text-muted-foreground">Notifications Sent</p>
                <p className="text-xs text-muted-foreground mt-1">Push notifications</p>
              </div>
            </div>

            {/* Export/Actions Section */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Analytics Data Export</h4>
                  <p className="text-sm text-muted-foreground mt-1">Download detailed analytics reports</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Globe className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Videos Management Section */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg">
                  <Play className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Video Management</h3>
                  <p className="text-sm text-muted-foreground">Upload and manage Instagram-style video content</p>
                </div>
              </div>

              {/* Debug Section */}
              <div className="flex flex-wrap gap-2 mt-4 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    VideoService.debugLocalStorage();
                  }}
                >
                  🔍 Debug localStorage
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const foundVideos = VideoService.findAllVideosInStorage();
                    console.log(`Found ${foundVideos.length} videos total:`, foundVideos);
                  }}
                >
                  🔎 Search All Keys
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    console.log('🔄 Starting migration...');
                    await VideoService.migrateToFirebase();
                  }}
                >
                  🚀 Migrate to Firebase
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('🔥 Enabling Firebase mode...');
                    console.log('⚠️ You need to manually change USE_FIREBASE to true in VideoService.ts');
                    console.log('📁 File: src/services/VideoService.ts');
                  }}
                >
                  🔥 Enable Firebase
                </Button>
                {/* Cleanup oldest N videos control */}
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="number"
                    min={0}
                    value={cleanupCount}
                    onChange={e => {
                      const raw = e.target.value;
                      // Allow empty input while typing; treat empty as 0
                      if (raw === '') {
                        setCleanupCount(0);
                        return;
                      }
                      const num = Number(raw);
                      if (Number.isNaN(num)) return;
                      setCleanupCount(Math.max(0, Math.floor(num)));
                    }}
                    className="w-20 text-sm px-2 py-1 rounded border"
                    title="Number of oldest videos to delete"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteOldestN}
                    disabled={isCleaning || cleanupCount <= 0}
                  >
                    {isCleaning ? 'Deleting...' : `Delete Oldest ${cleanupCount}`}
                  </Button>
                </div>
              </div>
            </div>

            {/* Add/Edit Video Form */}
            <div id="video-form" className="bg-card border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg">
                  {editingVideo ? (
                    <Edit className="h-5 w-5 text-purple-600" />
                  ) : (
                    <Upload className="h-5 w-5 text-purple-600" />
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold">
                    {editingVideo ? 'Edit Video' : 'Add New Video'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {editingVideo
                      ? 'Update video details and metadata'
                      : 'Upload Instagram-style video content for the mobile app'
                    }
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <h5 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">📋 Platform Support:</h5>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• <strong>✅ YouTube Shorts:</strong> Embedded playback with auto-play</li>
                  <li>• <strong>📸 Instagram Reels:</strong> Link only (Instagram blocks embedding)</li>
                  <li>• <strong>🎵 TikTok:</strong> Embedded playback supported</li>
                  <li>• <strong>☁️ Mega.nz:</strong> Iframe embedded videos (bypass CORS)</li>
                  <li>• <strong>📁 Google Drive:</strong> Public video files via iframe</li>
                  <li>• <strong>� Dropbox:</strong> Shared video files via iframe</li>
                  <li>• <strong>🎬 Vimeo:</strong> Embedded player support</li>
                  <li>• <strong>📺 Dailymotion:</strong> Embedded player support</li>
                  <li>• <strong>📚 Archive.org:</strong> Internet Archive video files</li>
                  <li>• <strong>📁 Direct MP4:</strong> Full playback control</li>
                  <li>• <strong>💡 Tip:</strong> Portrait videos (9:16 ratio) work best for mobile</li>
                  <li>• <strong>🔒 Security:</strong> Iframe videos are properly sandboxed</li>
                </ul>
              </div>

              <form onSubmit={handleAddVideo} className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">Video Title *</label>
                    <Input
                      value={videoTitle}
                      onChange={e => setVideoTitle(e.target.value)}
                      placeholder="Enter video title"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Category</label>
                    <select
                      value={videoCategory}
                      onChange={e => setVideoCategory(e.target.value)}
                      className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Video Source: URL or Upload */}
                <div>
                  <label className="block font-semibold mb-1">Video Source</label>
                  <div className="flex gap-4 mb-2">
                    <label className="inline-flex items-center">
                      <input type="radio" checked={mediaSource === 'url'} onChange={() => setMediaSource('url')} />
                      <span className="ml-1">Use URL</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" checked={mediaSource === 'upload'} onChange={() => setMediaSource('upload')} />
                      <span className="ml-1">Upload Video File</span>
                    </label>
                  </div>
                  {mediaSource === 'url' && (
                    <Input
                      value={videoUrl}
                      onChange={e => handleVideoUrlChange(e.target.value)}
                      placeholder="YouTube, Instagram, TikTok, Mega.nz, Google Drive, Dropbox, Vimeo, or direct MP4 URL"
                      required
                    />
                  )}
                  {mediaSource === 'upload' && (
                    <div className="space-y-3">
                      <div className="space-y-3">
                        <div className="text-xs text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 rounded p-2 mb-2">
                          <b>Tip:</b> For fastest playback, upload MP4 (H.264) videos under 20MB, optimized for web streaming ("fast start"). Use <a href="https://handbrake.fr/" target="_blank" rel="noopener noreferrer" className="underline">HandBrake</a> or <a href="https://ffmpeg.org/" target="_blank" rel="noopener noreferrer" className="underline">ffmpeg</a> to compress and optimize videos before uploading.
                        </div>
                        {!selectedFile && !uploadedMedia && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                              const file = await webFileUploadService.showFilePicker('video');
                              if (file) {
                                // Warn if not MP4 or too large
                                if (!file.type.includes('mp4')) {
                                  alert('⚠️ For best performance, upload MP4 (H.264) videos. Other formats may play slowly or not at all.');
                                }
                                if (file.size > 20 * 1024 * 1024) {
                                  alert('⚠️ File is larger than 20MB. Large files may play slowly or buffer on mobile devices.');
                                }
                                setSelectedFile(file);
                              }
                            }}
                            className="w-full"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Select Video File
                          </Button>
                        )}
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center">
                            <input type="radio" name="uploadTargetVideos" checked={uploadTarget === 'firebase'} onChange={() => setUploadTarget('firebase')} />
                            <span className="ml-2">Firebase</span>
                          </label>
                          <label className="inline-flex items-center">
                            <input type="radio" name="uploadTargetVideos" checked={uploadTarget === 'r2'} onChange={() => setUploadTarget('r2')} />
                            <span className="ml-2">Cloudflare R2</span>
                          </label>
                        </div>
                        {selectedFile && !uploadedMedia && (
                          <div className="border rounded p-3 bg-muted">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Selected File:</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFile(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>Name: {selectedFile.name}</div>
                              <div>Size: {webFileUploadService.formatFileSize(selectedFile.size)}</div>
                              <div>Type: {selectedFile.type}</div>
                            </div>
                            <Button
                              type="button"
                              onClick={async () => {
                                setIsUploading(true);
                                try {
                                  const uploadResult = await webFileUploadService.uploadFileToTarget(selectedFile, videoCategory || 'general', uploadTarget);
                                  setUploadedMedia(uploadResult);
                                  setVideoUrl(uploadResult.url);
                                } catch (error) {
                                  alert(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                } finally {
                                  setIsUploading(false);
                                }
                              }}
                              disabled={isUploading}
                              className="w-full mt-2"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload Video
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        {uploadedMedia && (
                          <div className="border rounded p-3 bg-muted">
                            <div className="text-sm text-muted-foreground mb-2">Uploaded: {uploadedMedia.name}</div>
                            <video src={uploadedMedia.url} controls className="w-full max-h-48 rounded" preload="auto" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUploadedMedia(null);
                                setSelectedFile(null);
                                setVideoUrl("");
                              }}
                              className="mt-2"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Remove Video
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold mb-1">Video Description *</label>
                  <textarea
                    value={videoDescription}
                    onChange={e => setVideoDescription(e.target.value)}
                    placeholder="Enter video description"
                    className="w-full p-2 border rounded-md h-24 dark:bg-gray-800 dark:border-gray-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">Video URL *</label>
                    <Input
                      value={videoUrl}
                      onChange={e => handleVideoUrlChange(e.target.value)}
                      placeholder="YouTube, Instagram, TikTok, Mega.nz, Google Drive, Dropbox, Vimeo, or direct MP4 URL"
                      required
                    />
                    {/* Show platform detection info */}
                    {videoUrlInfo && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        {videoUrlInfo.isSupported ? (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span>
                              {videoUrlInfo.platform === 'Instagram' ? '📸 Instagram Reel' :
                                videoUrlInfo.platform === 'Mega' ? '☁️ Mega.nz' :
                                  videoUrlInfo.platform === 'GoogleDrive' ? '📁 Google Drive' :
                                    videoUrlInfo.platform === 'Dropbox' ? '📦 Dropbox' :
                                      videoUrlInfo.platform === 'Vimeo' ? '🎬 Vimeo' :
                                        videoUrlInfo.platform === 'Dailymotion' ? '📺 Dailymotion' :
                                          videoUrlInfo.platform === 'Archive' ? '📚 Archive.org' :
                                            videoUrlInfo.platform} detected - Supported ✓
                            </span>
                            {videoUrlInfo.platform === 'Instagram' && (
                              <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded ml-2">
                                External link (Instagram blocks embedding)
                              </span>
                            )}
                            {['Mega', 'GoogleDrive', 'Dropbox', 'Vimeo', 'Dailymotion', 'Archive'].includes(videoUrlInfo.platform) && (
                              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded ml-2">
                                Iframe embedded
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                            <AlertCircle className="h-4 w-4" />
                            <span>{videoUrlInfo.platform} detected - Limited support</span>
                          </div>
                        )}
                        {videoUrlInfo.playbackType === 'embed' && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            Auto-play enabled
                          </span>
                        )}
                        {isFetchingThumbnail && videoUrlInfo.platform === 'Instagram' && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded flex items-center gap-1">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Fetching thumbnail...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Thumbnail URL</label>
                    <Input
                      value={thumbnailUrl}
                      onChange={e => setThumbnailUrl(e.target.value)}
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                  </div>
                </div>

                {/* Source Attribution Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Source Attribution</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Original Source Platform *</label>
                      <select
                        value={originalSource}
                        onChange={e => setOriginalSource(e.target.value)}
                        className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"
                        required
                      >
                        <option value="">Select Platform</option>
                        <option value="Instagram">📷 Instagram</option>
                        <option value="TikTok">🎵 TikTok</option>
                        <option value="YouTube">📺 YouTube</option>
                        <option value="Facebook">📘 Facebook</option>
                        <option value="Twitter">🐦 Twitter</option>
                        <option value="Other">🌐 Other</option>
                      </select>
                    </div>
                    {/* Original Creator fields removed - simplified attribution */}
                  </div>
                  <div className="mt-3">
                    <label className="block font-semibold mb-1">Original Source URL</label>
                    <Input
                      value={originalSourceUrl}
                      onChange={e => setOriginalSourceUrl(e.target.value)}
                      placeholder="Link to original video"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Tags (comma-separated)</label>
                  <Input
                    value={videoTags}
                    onChange={e => setVideoTags(e.target.value)}
                    placeholder="trending, viral, entertainment"
                  />
                </div>

                {/* Live Preview Section */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h5 className="font-semibold mb-3 flex items-center gap-2 text-purple-800 dark:text-purple-200">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </h5>
                  {(videoTitle || videoDescription || thumbnailUrl || videoUrl) ? (
                    <div className="flex gap-4">
                      {/* Thumbnail/Video Preview */}
                      <div className="w-24 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {(thumbnailUrl || videoUrlInfo?.thumbnailUrl) ? (
                          <img
                            src={thumbnailUrl || videoUrlInfo?.thumbnailUrl}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/720x1280.png?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800">
                            {videoUrlInfo?.platform ? (
                              <div className="text-center">
                                <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                                  {videoUrlInfo.platform}
                                </div>
                                <Play className="h-6 w-6 text-purple-600 dark:text-purple-300 mx-auto" />
                              </div>
                            ) : (
                              <Play className="h-8 w-8 text-purple-600 dark:text-purple-300" />
                            )}
                          </div>
                        )}
                        {/* Platform badge with special Instagram styling */}
                        {videoUrlInfo?.platform && videoUrlInfo.platform !== 'Other' && (
                          <div className={`absolute top-1 left-1 text-white text-xs px-1 py-0.5 rounded ${videoUrlInfo.platform === 'Instagram'
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                              : videoUrlInfo.platform === 'YouTube'
                                ? 'bg-red-600'
                                : 'bg-black bg-opacity-75'
                            }`}>
                            {videoUrlInfo.platform === 'Instagram' ? '📸 IG' : videoUrlInfo.platform}
                          </div>
                        )}
                        {/* Play button overlay or loading indicator */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                          {isFetchingThumbnail && videoUrlInfo?.platform === 'Instagram' ? (
                            <div className="bg-white bg-opacity-90 rounded-full p-2">
                              <RefreshCw className="h-4 w-4 text-purple-600 animate-spin" />
                            </div>
                          ) : (
                            <div className="bg-white bg-opacity-90 rounded-full p-2">
                              <Play className="h-4 w-4 text-purple-600 fill-purple-600" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Video Info */}
                      <div className="flex-1 min-w-0">
                        <h6 className="font-semibold text-base text-gray-900 dark:text-white truncate">
                          {videoTitle || "Enter video title above"}
                        </h6>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                          {videoDescription || "Enter video description above"}
                        </p>

                        {/* Source Info */}
                        {originalSource && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-purple-700 dark:text-purple-300">
                            <span>FROM:</span>
                            <span className="font-medium">{originalSource}</span>
                          </div>
                        )}

                        {/* Tags and Category */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {videoCategory && (
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded">
                              {videoCategory}
                            </span>
                          )}
                          {videoTags.split(',').filter(tag => tag.trim()).slice(0, 3).map((tag, index) => (
                            <span key={index} className="bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 text-xs px-2 py-1 rounded">
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>

                        {/* Enhanced Video URL Status */}
                        {videoUrl && videoUrlInfo && (
                          <div className="mt-2 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 dark:text-green-400">✓ Video URL provided</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${videoUrlInfo.isSupported
                                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                  : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                                }`}>
                                {videoUrlInfo.platform}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {videoUrlInfo.isSupported ? (
                                <>
                                  <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                                  <span className="text-green-600 dark:text-green-400">
                                    {videoUrlInfo.playbackType === 'embed' ? 'Embeddable video' :
                                      videoUrlInfo.playbackType === 'direct' ? 'Direct video file' :
                                        'External playback'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                  <span className="text-orange-600 dark:text-orange-400">
                                    Limited support - may require external playback
                                  </span>
                                </>
                              )}
                            </div>

                            {videoUrlInfo.videoId && (
                              <div className="text-gray-500 dark:text-gray-400">
                                Video ID: {videoUrlInfo.videoId}
                              </div>
                            )}

                            {videoUrlInfo.embedUrl && videoUrlInfo.embedUrl !== videoUrl && (
                              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <ExternalLink className="h-3 w-3" />
                                <span>Embed URL generated</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Fill in the form fields above to see a preview of your video</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={resetVideoForm}
                  >
                    <X className="mr-2 h-4 w-4" />
                    {editingVideo ? 'Cancel Edit' : 'Clear Form'}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={isAddingVideo}
                  >
                    {isAddingVideo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingVideo ? 'Updating Video...' : 'Adding Video...'}
                      </>
                    ) : (
                      <>
                        {editingVideo ? (
                          <Edit className="mr-2 h-4 w-4" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {editingVideo ? 'Update Video' : 'Add Video to App'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Videos List */}
            <div className="bg-card border rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">Uploaded Videos ({videos.length})</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchVideos}
                  disabled={isLoadingVideos}
                >
                  {isLoadingVideos ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>

              {isLoadingVideos ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No videos uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map(video => (
                    <div key={video.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                      {/* Video Thumbnail - Takes most space */}
                      <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden relative group flex-shrink-0">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {/* Video duration badge */}
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                          {video.duration || 0}s
                        </div>
                      </div>

                      {/* Video Title */}
                      <div className="p-3 pb-2">
                        <h5 className="font-semibold text-sm line-clamp-2 text-gray-900 dark:text-gray-100">
                          {video.title}
                        </h5>
                      </div>

                      {/* Minimal Bottom Actions */}
                      <div className="p-2 mt-auto bg-white dark:bg-gray-900 border-t">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => handleEditVideo(video)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleDeleteVideo(String(video.id), video.title)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Video Details Section - Bottom of Page */}
              {videos.length > 0 && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Video Details & Analytics
                  </h3>
                  <div className="space-y-4">
                    {videos.map(video => (
                      <div key={`details-${video.id}`} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Basic Info */}
                          <div>
                            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">VIDEO INFO</h4>
                            <p className="font-semibold">{video.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded">
                                {video.category}
                              </span>
                              {video.tags?.map((tag, index) => (
                                <span key={index} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Stats */}
                          <div>
                            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">STATISTICS</h4>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-sm">
                                  <Eye className="h-3 w-3" />
                                  Views
                                </span>
                                <span className="font-medium">{video.views || 0}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-sm">
                                  <Activity className="h-3 w-3" />
                                  Likes
                                </span>
                                <span className="font-medium">{video.likes || 0}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-sm">
                                  <TrendingUp className="h-3 w-3" />
                                  Shares
                                </span>
                                <span className="font-medium">{video.shares || 0}</span>
                              </div>
                            </div>
                          </div>

                          {/* Source */}
                          <div>
                            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">SOURCE</h4>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Smartphone className="h-3 w-3" />
                                <span>{video.originalSource?.sourcePlatform || 'Unknown'}</span>
                              </div>
                              {video.originalSource?.creatorName && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Users className="h-3 w-3" />
                                  <span>{video.originalSource.creatorName}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(video.timestamp).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthProtected>
  );
}