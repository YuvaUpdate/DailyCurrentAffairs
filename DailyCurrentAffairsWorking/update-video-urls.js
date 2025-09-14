// Quick fix script to update your existing videos with working URLs for testing
// Run this in your browser console or as a Node.js script

const testVideoUrls = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
];

// If you want to quickly test, you can manually update your Firebase collection
// Go to Firebase Console > Firestore Database > videos collection
// And replace the videoUrl field with one of these URLs for testing

console.log('Available test video URLs:');
testVideoUrls.forEach((url, index) => {
  console.log(`${index + 1}. ${url}`);
});

// For automatic update (requires Firebase Admin SDK setup):
/*
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateVideoUrls() {
  try {
    const videosSnapshot = await db.collection('videos').get();
    
    let index = 0;
    const batch = db.batch();
    
    videosSnapshot.forEach((doc) => {
      const videoRef = db.collection('videos').doc(doc.id);
      batch.update(videoRef, {
        videoUrl: testVideoUrls[index % testVideoUrls.length]
      });
      index++;
    });
    
    await batch.commit();
    console.log('✅ Updated all video URLs successfully');
  } catch (error) {
    console.error('❌ Error updating video URLs:', error);
  }
}

// updateVideoUrls();
*/