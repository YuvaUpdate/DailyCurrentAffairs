/**
 * Sample YouTube Shorts URLs for testing
 * You can add these to your Firebase videos collection
 */

const sampleYouTubeShorts = [
  {
    title: "Amazing Tech Innovation",
    description: "Check out this incredible new technology!",
    videoUrl: "https://youtube.com/shorts/dQw4w9WgXcQ", // Replace with actual YouTube Short URL
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 30,
    likes: 125,
    shares: 15,
    views: 1250,
    timestamp: new Date("2024-01-15T12:00:00Z"),
    isActive: true,
    tags: ["tech", "innovation", "shorts"],
    originalSource: {
      sourcePlatform: "YouTube",
      creatorName: "TechChannel"
    }
  },
  {
    title: "Quick Cooking Tip",
    description: "Learn this amazing cooking trick in 30 seconds!",
    videoUrl: "https://youtube.com/shorts/another-short-id", // Replace with actual YouTube Short URL
    thumbnailUrl: "https://img.youtube.com/vi/another-short-id/maxresdefault.jpg",
    duration: 25,
    likes: 89,
    shares: 7,
    views: 890,
    timestamp: new Date("2024-01-15T13:00:00Z"),
    isActive: true,
    tags: ["cooking", "food", "tips"],
    originalSource: {
      sourcePlatform: "YouTube",
      creatorName: "CookingMaster"
    }
  },
  {
    title: "Funny Pet Moment",
    description: "This cat's reaction is hilarious!",
    videoUrl: "https://youtu.be/sample-short-url", // Replace with actual YouTube Short URL
    thumbnailUrl: "https://img.youtube.com/vi/sample-short-url/maxresdefault.jpg",
    duration: 15,
    likes: 203,
    shares: 25,
    views: 2030,
    timestamp: new Date("2024-01-15T14:00:00Z"),
    isActive: true,
    tags: ["pets", "funny", "cats"],
    originalSource: {
      sourcePlatform: "YouTube",
      creatorName: "PetLover"
    }
  }
];

console.log('Sample YouTube Shorts data:');
console.log(JSON.stringify(sampleYouTubeShorts, null, 2));

/**
 * Instructions:
 * 1. Replace the sample URLs with actual YouTube Shorts URLs
 * 2. Go to Firebase Console > Firestore Database > videos collection
 * 3. Add new documents with this data structure
 * 4. Make sure the videoUrl field contains valid YouTube Shorts URLs like:
 *    - https://youtube.com/shorts/VIDEO_ID
 *    - https://youtu.be/VIDEO_ID
 *    - https://youtube.com/watch?v=VIDEO_ID
 */

export { sampleYouTubeShorts };