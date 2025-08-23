import { storage } from './firebase.config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export interface UploadResult {
  url: string;
  path: string;
  type: 'image' | 'video';
}

class FileUploadService {
  // Web-compatible file picker
  private createWebFilePicker(accept: string): Promise<string | null> {
    return new Promise((resolve) => {
      if (Platform.OS !== 'web') {
        resolve(null);
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.display = 'none';
      
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          console.log('📁 Web file selected:', file.name, file.type, file.size);
          resolve(url);
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
  // Request permissions for media access
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images and videos.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  // Pick image from gallery
  async pickImage(): Promise<string | null> {
    try {
      console.log('🖼️ Starting image picker...');
      
      // Use web file picker for web platform
      if (Platform.OS === 'web') {
        console.log('🌐 Using web file picker for images');
        return await this.createWebFilePicker('image/*');
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Good aspect ratio for news articles
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Image selected:', result.assets[0].uri);
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
      return null;
    }
  }

  // Pick video from gallery
  async pickVideo(): Promise<string | null> {
    try {
      console.log('🎥 Starting video picker...');
      
      // Use web file picker for web platform
      if (Platform.OS === 'web') {
        console.log('🌐 Using web file picker for videos');
        return await this.createWebFilePicker('video/*');
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Video selected:', result.assets[0].uri);
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Video picker error:', error);
      Alert.alert('Error', 'Failed to pick video');
      return null;
    }
  }

  // Take photo with camera
  async takePhoto(): Promise<string | null> {
    try {
      console.log('📸 Starting camera...');
      
      // On web, fall back to file picker (camera not widely supported)
      if (Platform.OS === 'web') {
        console.log('🌐 Using web file picker (camera not available in browser)');
        Alert.alert('Web Browser', 'Camera not available in browser. Please select an image file instead.');
        return await this.createWebFilePicker('image/*');
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Photo taken:', result.assets[0].uri);
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
      return null;
    }
  }

  // Upload file to Firebase Storage
  async uploadFile(uri: string, type: 'image' | 'video', category?: string): Promise<UploadResult | null> {
    try {
      console.log('📤 Starting upload for:', { uri, type, category });
      
      // Create a unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const extension = type === 'image' ? 'jpg' : 'mp4';
      const filename = `${timestamp}_${randomId}.${extension}`;
      
      // Create storage path
      const folder = type === 'image' ? 'news-images' : 'news-videos';
      const categoryFolder = category ? `/${category.toLowerCase()}` : '';
      const storagePath = `${folder}${categoryFolder}/${filename}`;
      
      console.log('📁 Storage path:', storagePath);

      // Convert URI to blob
      console.log('📥 Fetching file from URI...');
      let blob: Blob;
      
      if (Platform.OS === 'web' && uri.startsWith('blob:')) {
        // Handle web blob URLs
        console.log('🌐 Processing web blob URL');
        const response = await fetch(uri);
        blob = await response.blob();
      } else {
        // Handle regular file URIs
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
        blob = await response.blob();
      }
      
      console.log('📦 Blob created, size:', blob.size, 'type:', blob.type);

      // Create storage reference
      const storageRef = ref(storage, storagePath);

      // Set metadata
      const metadata = {
        contentType: blob.type || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          category: category || 'general',
          type: type,
        },
      };

      console.log('⬆️ Uploading to Firebase Storage...');
      // Upload file
      const uploadResult = await uploadBytes(storageRef, blob, metadata);
      console.log('✅ Upload complete:', uploadResult.metadata.name);

      // Get download URL
      console.log('🔗 Getting download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log('✅ Download URL obtained:', downloadURL);

      // Clean up web blob URL
      if (Platform.OS === 'web' && uri.startsWith('blob:')) {
        URL.revokeObjectURL(uri);
      }

      return {
        url: downloadURL,
        path: storagePath,
        type: type,
      };
    } catch (error) {
      console.error('❌ Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Upload Failed', `Failed to upload file: ${errorMessage}`);
      return null;
    }
  }

  // Delete file from Firebase Storage
  async deleteFile(path: string): Promise<boolean> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  // Show media selection options
  async showMediaPicker(type: 'image' | 'video' | 'both' = 'both'): Promise<string | null> {
    console.log('🎯 Media picker requested for type:', type);
    return new Promise((resolve) => {
      const options = [];
      
      if (type === 'image' || type === 'both') {
        options.push(
          { text: 'Choose Image', onPress: async () => {
            console.log('📷 User selected: Choose Image');
            resolve(await this.pickImage());
          }},
          { text: 'Take Photo', onPress: async () => {
            console.log('📸 User selected: Take Photo');
            resolve(await this.takePhoto());
          }}
        );
      }
      
      if (type === 'video' || type === 'both') {
        options.push(
          { text: 'Choose Video', onPress: async () => {
            console.log('🎥 User selected: Choose Video');
            resolve(await this.pickVideo());
          }}
        );
      }
      
      options.push({ text: 'Cancel', style: 'cancel' as const, onPress: () => {
        console.log('❌ User cancelled media selection');
        resolve(null);
      }});

      Alert.alert(
        'Select Media',
        'Choose how you want to add media to your article',
        options
      );
    });
  }
}

export const fileUploadService = new FileUploadService();
