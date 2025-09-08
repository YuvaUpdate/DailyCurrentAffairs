import { storage } from './firebase.config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface UploadResult {
  url: string;
  path: string;
  type: 'image' | 'video';
  name: string;
  size: number;
}

class WebFileUploadService {
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
      
      // Create storage path
      const storagePath = `media/${category}/${mediaType}s/${fileName}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('📤 Uploading file to:', storagePath);
      
      // Upload file
      const uploadTask = await uploadBytes(storageRef, file);
      console.log('✅ Upload completed');
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadTask.ref);
      console.log('🔗 Download URL:', downloadURL);
      
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
