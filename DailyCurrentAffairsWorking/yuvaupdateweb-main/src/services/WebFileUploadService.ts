import { storage } from './firebase.config';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export interface UploadResult {
  url: string;
  path: string;
  type: 'image' | 'video';
  name: string;
  size: number;
}

class WebFileUploadService {
  private API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || '';

  /**
   * Return the runtime API base. Prefer runtime-injected global (native), then
   * build-time Vite value. Always trim trailing slash.
   */
  private getRuntimeApiBase(): string {
    try {
      // runtime-injected (native) value set by App bootstrap or host
      const runtime = (globalThis as any).API_BASE || (typeof window !== 'undefined' ? (window as any).__API_BASE__ : undefined);
      const base = runtime || this.API_BASE || '';
      return String(base).replace(/\/$/, '');
    } catch (e) {
      return (this.API_BASE || '').replace(/\/$/, '');
    }
  }
  /**
   * Show file picker for web browsers
   */
  showFilePicker(type: 'image' | 'video' | 'both' = 'both'): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';

      // Set accept attribute based on type
      switch (type) {
        case 'image':
          input.accept = 'image/*';
          break;
        case 'video':
          input.accept = 'video/*';
          break;
        case 'both':
          input.accept = 'image/*,video/*';
          break;
      }

      input.style.display = 'none';

      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          console.log('📁 File selected:', file.name, file.type, file.size);
          resolve(file);
        } else {
          resolve(null);
        }
        document.body.removeChild(input);
      };

      input.oncancel = () => {
        console.log('❌ User cancelled file selection');
        resolve(null);
        document.body.removeChild(input);
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Given a stored URL (possibly the direct Cloudflare R2 public URL),
   * return a playable URL. If the URL points to the R2 public host pattern
   * (e.g. https://<account>.r2.cloudflarestorage.com/<bucket>/<key>) this
   * rewrites it to our proxy `/api/r2/media?path=<key>` so browsers/apps
   * avoid CORS issues and get Range support via the backend.
   *
   * Usage: pass any stored media URL through this before assigning to a
   * video `src` in the web app or the Admin so previously uploaded files
   * become playable.
   */
  getPlaybackUrl(storedUrl: string): string {
    if (!storedUrl) return storedUrl;
    // Already proxied
    if (storedUrl.startsWith('/api/r2/media')) return storedUrl;

    try {
      const baseForParse = (typeof window !== 'undefined' && window.location && window.location.href) ? window.location.href : this.getRuntimeApiBase() || 'http://localhost';
      const u = new URL(storedUrl, baseForParse);
      // Detect Cloudflare R2 account host (contains `.r2.cloudflarestorage.com`)
      if (u.hostname.includes('.r2.cloudflarestorage.com')) {
        // Path is expected to be /<bucket>/<key...>
        const segments = u.pathname.split('/').filter(Boolean);
        if (segments.length >= 2) {
          // Remove bucket segment and rejoin the rest as the object key
          const objectKey = segments.slice(1).join('/');
          // Return proxied path; make absolute if we know runtime base so native can reach it
          const proxied = `/api/r2/media?path=${encodeURIComponent(objectKey)}`;
          const runtime = this.getRuntimeApiBase();
          if (runtime) return `${runtime}${proxied}`;
          return proxied;
        }
      }

      // If the stored URL points at localhost, make it reachable from native
      // by replacing it with the runtime API base (if available). If no
      // runtime base is set, fall back to Android emulator host `10.0.2.2`.
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        const runtime = this.getRuntimeApiBase();
        if (runtime) return `${runtime}${u.pathname}${u.search}`;
        // Fallback for Android emulator - may help when running on emulator
        const emulatorHost = '10.0.2.2';
        return `${u.protocol}//${emulatorHost}${u.pathname}${u.search}`;
      }
    } catch (err) {
      // If URL parsing fails, fall back to original
      console.warn('getPlaybackUrl: failed to parse URL', err);
    }
    // If the storedUrl is a relative proxied path like '/api/r2/media?...',
    // prefer making it absolute using runtime API base so native apps can reach it.
    if (storedUrl.startsWith('/api')) {
      const runtime = this.getRuntimeApiBase();
      if (runtime) return `${runtime}${storedUrl}`;
    }
    return storedUrl;
  }

  /**
   * Upload file to Firebase Storage
   */
  async uploadFile(file: File, category: string = 'general'): Promise<UploadResult> {
    try {
      // Determine file type
      const isVideo = file.type.startsWith('video/');
      const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

      // Validate file size (max 50MB for videos, 10MB for images)
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${isVideo ? '50MB' : '10MB'}`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;

      // By default upload to Firebase Storage (existing behavior)
      // Create storage path
      const storagePath = `media/${category}/${mediaType}s/${fileName}`;
      const storageRef = ref(storage, storagePath);

      console.log('📤 Uploading file to Firebase Storage at:', storagePath);

      // Use resumable upload with explicit metadata for faster CDN delivery
      const metadata = {
        contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        cacheControl: 'public, max-age=31536000, s-maxage=31536000, immutable'
      } as const;
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed',
          () => { },
          (error) => reject(error),
          () => resolve()
        );
      });
      console.log('✅ Upload to Firebase completed');

      // Get download URL (tokened, CDN cached via cacheControl above)
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      console.log('🔗 Firebase Download URL:', downloadURL);

      return {
        url: downloadURL,
        path: storagePath,
        type: mediaType,
        name: file.name,
        size: file.size
      };
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  /**
   * Optional: Upload file to Cloudflare R2 (S3-compatible). This is guarded and will throw if R2 env is not configured.
   * Uses dynamic import of @aws-sdk/client-s3 so the package is only required when R2 is used.
   */
  async uploadFileToR2(file: File, category: string = 'general'): Promise<UploadResult> {
    try {
      // For security, client-side direct uploads to R2 with secret keys are not recommended.
      // This method expects a server-side endpoint at `/api/r2/upload` that accepts a multipart/form-data POST
      // containing `file` and `category`, performs the R2 upload server-side using Cloudflare credentials, and
      // returns JSON { url, path, name, size }.
      const form = new FormData();
      form.append('file', file);
      form.append('category', category);

      const resp = await fetch(`${this.API_BASE}/api/r2/upload`, {
        method: 'POST',
        body: form
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`R2 upload failed: ${resp.status} ${txt}`);
      }

      const data = await resp.json();
      // Expecting { url, path, name, size }
      // For media (video) we prefer to return a proxied playback URL that supports Range requests
      const isVideo = file.type.startsWith('video/');
      const objectPath = data.path || data.key || '';
  const proxiedPath = isVideo && objectPath ? `/api/r2/media?path=${encodeURIComponent(objectPath)}` : data.url;
  // If API_BASE is set (production where API may be on another host), make proxied URL absolute
  const proxiedUrl = this.API_BASE && proxiedPath.startsWith('/api') ? `${this.API_BASE}${proxiedPath}` : proxiedPath;
      return {
        url: proxiedUrl,
        path: objectPath,
        type: data.type || (isVideo ? 'video' : 'image'),
        name: data.name || file.name,
        size: data.size || file.size
      } as UploadResult;
    } catch (error) {
      console.error('❌ R2 upload (via backend) failed:', error);
      throw new Error('R2 upload failed. Ensure /api/r2/upload is implemented on the server or choose Firebase upload.');
    }
  }

  /**
   * Convenience dispatcher: choose target 'firebase' (default) or 'r2'
   */
  async uploadFileToTarget(file: File, category: string = 'general', target: 'firebase' | 'r2' = 'firebase'): Promise<UploadResult> {
    if (target === 'r2') {
      try {
        // Attempt R2 upload via backend. If the backend is not deployed or
        // unreachable this may fail (network error or non-2xx response). In
        // that case, fall back to Firebase Storage so the deployed frontend
        // continues to work without a backend.
        return await this.uploadFileToR2(file, category);
      } catch (err) {
        console.warn('R2 upload failed, falling back to Firebase upload:', err);
        // Fallback to Firebase upload to avoid breaking frontend-only deployments
        return this.uploadFile(file, category);
      }
    }
    return this.uploadFile(file, category);
  }

  /**
   * Delete file from Firebase Storage
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
      console.log('🗑️ File deleted:', storagePath);
    } catch (error) {
      console.error('❌ Delete failed:', error);
      throw error;
    }
  }

  /**
   * Validate file type
   */
  validateFileType(file: File, allowedTypes: string[] = ['image/*', 'video/*']): boolean {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });
  }

  /**
   * Get file preview URL for display
   */
  getFilePreviewURL(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Generate YouTube embed URL
   */
  getYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  /**
   * Generate YouTube thumbnail URL
   */
  getYouTubeThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
  }
}

export const webFileUploadService = new WebFileUploadService();
export default webFileUploadService;
