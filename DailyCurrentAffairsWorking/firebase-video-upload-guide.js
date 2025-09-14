/**
 * Firebase Storage Video Upload Guide
 * 
 * 1. Upload your video files to Firebase Storage
 * 2. Get the download URLs
 * 3. Update your Firebase documents with these URLs
 */

// Example of how to upload and get video URLs
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function uploadVideoToFirebase(file, fileName) {
  const storage = getStorage();
  const videoRef = ref(storage, `videos/${fileName}`);
  
  try {
    // Upload the file
    const snapshot = await uploadBytes(videoRef, file);
    console.log('Video uploaded successfully');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Video URL:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}

// Example usage:
// const videoFile = new File([...], 'my-video.mp4', { type: 'video/mp4' });
// const videoUrl = await uploadVideoToFirebase(videoFile, 'my-video.mp4');

/**
 * Update your Firebase video documents to use these URLs instead of YouTube links
 */