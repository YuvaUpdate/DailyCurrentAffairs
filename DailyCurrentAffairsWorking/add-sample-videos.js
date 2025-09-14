/**
 * Script to add sample videos to Firebase for testing
 * Run this with: node add-sample-videos.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

// Firebase config (replace with your actual config)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleVideos = [
  {
    title: "Big Buck Bunny",
    description: "A sample video for testing video playback functionality",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    duration: 596,
    likes: 25,
    shares: 5,
    views: 150,
    timestamp: new Date("2024-01-15T10:00:00Z"),
    isActive: true,
    tags: ["sample", "test", "demo"],
    originalSource: {
      sourcePlatform: "Test",
      creatorName: "Sample Creator"
    }
  },
  {
    title: "Elephants Dream",
    description: "Another sample video for testing video playback functionality",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    duration: 653,
    likes: 42,
    shares: 8,
    views: 275,
    timestamp: new Date("2024-01-15T11:00:00Z"),
    isActive: true,
    tags: ["sample", "test", "demo2"],
    originalSource: {
      sourcePlatform: "Test",
      creatorName: "Another Creator"
    }
  }
];

async function addSampleVideos() {
  try {
    console.log('Adding sample videos to Firebase...');
    
    for (const video of sampleVideos) {
      const docRef = await addDoc(collection(db, 'videos'), video);
      console.log(`✅ Added video: ${video.title} with ID: ${docRef.id}`);
    }
    
    console.log('🎉 All sample videos added successfully!');
  } catch (error) {
    console.error('❌ Error adding sample videos:', error);
  }
}

addSampleVideos();