# YuvaUpdate Social Media Features Documentation

## Overview
YuvaUpdate has been transformed from a basic news app into a comprehensive social media platform with user authentication, commenting system, bookmarking, sharing, and audio features.

## Features Implemented

### 1. User Authentication System
**File: `AuthService.ts`**
- User registration with email/password
- User login/logout functionality  
- Password reset functionality
- User profile management
- Firebase Auth integration

**File: `AuthScreen.tsx`**
- Professional login/register UI
- Form validation
- Password visibility toggle
- Responsive design
- Error handling with user feedback

### 2. Comments System
**File: `CommentService.ts`**
- Real-time comment posting and viewing
- Like/unlike functionality for comments
- Reply system (nested comments)
- Comment deletion (soft delete)
- User-specific comment management

**File: `Comments.tsx`**
- Modal-based comments interface
- Real-time comment updates
- User avatars and timestamps
- Reply functionality
- Like/unlike interactions

### 3. User Management & Bookmarks
**File: `UserService.ts`**
- Bookmark articles for later reading
- User preferences management
- Reading history tracking
- User statistics and engagement metrics

### 4. Audio Mode (Text-to-Speech)
**File: `AudioService.ts`**
- Convert articles to speech
- Playback controls (play/pause/stop)
- Audio settings customization
- Voice selection options
- Background playback support

### 5. Sharing System
**File: `SharingService.ts`**
- Native share dialog integration
- Platform-specific sharing (WhatsApp, Facebook, Twitter, etc.)
- Copy to clipboard functionality
- Custom share content formatting

### 6. Article Actions Integration
**File: `ArticleActions.tsx`**
- Unified action bar for articles
- Bookmark toggle functionality
- Share button integration
- Comments access
- Audio mode toggle

### 7. App Wrapper with Authentication
**File: `AppWrapper.tsx`**
- Authentication state management
- User session handling
- Login/logout interface
- User profile display

## Data Structure

### User Types
```typescript
interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  preferences?: UserPreferences;
}

interface UserPreferences {
  categories: string[];
  notifications: boolean;
  audioSettings: AudioSettings;
  theme: 'light' | 'dark' | 'system';
}
```

### Comment Types
```typescript
interface Comment {
  id: string;
  articleId: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  likedBy: string[];
  replies?: Comment[];
  parentId?: string;
  isDeleted: boolean;
}
```

### Enhanced NewsArticle Types
```typescript
interface NewsArticle {
  id: number;
  headline: string;
  description: string;
  image: string;
  imageUrl?: string; // For sharing
  link?: string; // External links
  category: string;
  readTime: string;
  timestamp: string;
  mediaType?: 'image' | 'video';
  mediaPath?: string;
}
```

## Firebase Collections Structure

### Users Collection
```
users/{userId}
- uid: string
- email: string
- displayName: string
- photoURL?: string
- bio?: string
- joinedAt: Date
- isVerified: boolean
```

### Comments Collection
```
comments/{commentId}
- articleId: number
- userId: string
- userName: string
- content: string
- timestamp: Date
- likes: number
- likedBy: string[]
- parentId?: string (for replies)
- isDeleted: boolean
```

### Bookmarks Collection
```
bookmarks/{bookmarkId}
- userId: string
- articleId: number
- timestamp: Date
- category?: string
```

### User Preferences Collection
```
userPreferences/{userId}
- categories: string[]
- notifications: boolean
- audioSettings: AudioSettings
- theme: string
```

## Required Dependencies

### Expo Packages
```json
{
  "expo-speech": "^12.0.2",
  "expo-av": "^14.0.7", 
  "expo-linking": "^6.3.1",
  "expo-clipboard": "^6.0.3",
  "react-native-safe-area-context": "^4.10.5"
}
```

### Firebase Packages
```json
{
  "firebase": "^10.x.x"
}
```

## Usage Examples

### 1. User Authentication
```typescript
// Register new user
await authService.register(email, password, displayName);

// Login user
await authService.login(email, password);

// Get current user
const user = await authService.getCurrentUser();

// Logout
await authService.logout();
```

### 2. Comments System
```typescript
// Add comment
await commentService.addComment({
  articleId: 123,
  userId: 'user123',
  userName: 'John Doe',
  content: 'Great article!'
});

// Subscribe to comments
const unsubscribe = commentService.subscribeToComments(
  articleId,
  (comments) => setComments(comments)
);
```

### 3. Bookmarks
```typescript
// Toggle bookmark
await userService.toggleBookmark(userId, articleId);

// Get user bookmarks
const bookmarks = await userService.getUserBookmarks(userId);
```

### 4. Audio Playback
```typescript
// Play article audio
await audioService.playArticleAudio(article, {
  speed: 1.0,
  pitch: 1.0,
  volume: 0.8
});

// Pause/Resume
await audioService.pauseAudio();
await audioService.resumeAudio();
```

### 5. Sharing
```typescript
// Share article
await sharingService.shareArticle(article);

// Share to specific platform
await sharingService.shareToSpecificPlatform(article, 'whatsapp');
```

## Integration Steps

### 1. Setup Firebase
1. Create Firebase project
2. Enable Authentication, Firestore, Storage
3. Configure Firebase config in `firebase.config.ts`

### 2. Install Dependencies
```bash
npm install expo-speech expo-av expo-linking expo-clipboard react-native-safe-area-context firebase
```

### 3. Update App Entry Point
- Use `AppWrapper.tsx` as main component
- Update `index.ts` to register `AppWrapper`

### 4. Configure Authentication
- Setup Firebase Auth providers
- Configure sign-in methods in Firebase Console

### 5. Setup Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Comments are public read, auth write
    match /comments/{commentId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Bookmarks are user-specific
    match /bookmarks/{bookmarkId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

## Security Considerations

### 1. Authentication
- Email verification required for sensitive actions
- Password strength requirements (min 6 characters)
- Rate limiting on login attempts

### 2. Data Validation
- Input sanitization for comments
- Content length limits
- Spam prevention measures

### 3. Privacy
- User data encryption
- Optional profile visibility settings
- Data deletion capabilities

## Performance Optimizations

### 1. Real-time Updates
- Efficient Firebase listeners
- Unsubscribe from inactive listeners
- Batch operations where possible

### 2. Caching
- Cache user preferences locally
- Offline comment drafts
- Image caching for user avatars

### 3. Lazy Loading
- Load comments on demand
- Paginated comment loading
- Background sync for bookmarks

## Future Enhancements

### 1. Advanced Features
- Push notifications for comments
- User following system
- Article recommendations
- Advanced search and filtering

### 2. Social Features
- User profiles with bio/stats
- Comment moderation system
- Report inappropriate content
- Social media cross-posting

### 3. Audio Enhancements
- Offline audio download
- Playlist creation
- Speed controls
- Background playback controls

## Troubleshooting

### Common Issues
1. **Firebase Connection**: Ensure proper config and network
2. **Authentication Errors**: Check Firebase Auth setup
3. **Comment Sync**: Verify Firestore rules and permissions
4. **Audio Playback**: Ensure device audio permissions

### Debug Tools
- Firebase Console for backend monitoring
- React Native Debugger for state inspection
- Console logs for service interactions

## Support
For technical support or feature requests, contact the development team or check the project documentation.
