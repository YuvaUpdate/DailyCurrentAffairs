import { storage } from './firebase.config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Simple test function to verify Firebase Storage is working
export async function testFirebaseStorage(): Promise<string> {
  try {
    console.log('🧪 Testing Firebase Storage connection...');
    
    // Create a simple test file
    const testData = new Blob(['Hello Firebase Storage!'], { type: 'text/plain' });
    const testRef = ref(storage, 'test/test-file.txt');
    
    console.log('📤 Uploading test file...');
    await uploadBytes(testRef, testData);
    console.log('✅ Test file uploaded successfully!');
    
    console.log('🔗 Getting download URL...');
    const downloadURL = await getDownloadURL(testRef);
    console.log('✅ Download URL obtained:', downloadURL);
    
    console.log('🎉 Firebase Storage is working correctly!');
    return downloadURL;
  } catch (error) {
    console.error('❌ Firebase Storage test failed:', error);
    throw error;
  }
}

// Function to check Firebase Storage configuration
export function checkStorageConfig(): void {
  console.log('🔍 Checking Firebase Storage configuration...');
  console.log('Storage instance:', storage);
  console.log('Storage app:', storage.app);
  console.log('Storage bucket:', storage.app.options.storageBucket);
  
  if (!storage.app.options.storageBucket) {
    console.error('❌ Storage bucket not configured in Firebase config!');
    console.log('💡 Make sure your Firebase project has Storage enabled');
  } else {
    console.log('✅ Storage bucket configured:', storage.app.options.storageBucket);
  }
}
