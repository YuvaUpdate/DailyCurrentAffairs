# API Reference - YuvaUpdate Platform

## Overview

This document provides detailed information about the API services used in the YuvaUpdate platform. The platform uses Firebase as the backend service with custom service layers for data management.

## Authentication

All API operations require proper authentication through Firebase Auth. Admin operations require elevated permissions.

### Authentication Service

```typescript
class AuthService {
  // User authentication
  async login(email: string, password: string): Promise<UserProfile>
  async logout(): Promise<void>
  async isDeviceLoggedIn(): Promise<boolean>
  
  // User management
  async getUserProfile(uid: string): Promise<UserProfile>
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void>
  
  // Permission checks
  isAdminUser(profile: UserProfile): boolean
  async getPersistedUserUid(): Promise<string | null>
}
```

## News Service API

### FirebaseNewsService

The primary service for managing news articles and categories.

#### Article Operations

**Get All Articles**
```typescript
async getArticles(): Promise<NewsArticle[]>
```
- **Description**: Retrieves all published articles
- **Returns**: Array of NewsArticle objects
- **Sorting**: Articles sorted by timestamp (newest first)
- **Error Handling**: Returns fallback articles on failure

**Add New Article**
```typescript
async addArticle(article: Partial<NewsArticle>): Promise<void>
```
- **Parameters**: 
  - `article`: Partial NewsArticle object (headline, description, category required)
- **Description**: Creates a new article in the database
- **Side Effects**: Triggers push notification for new article
- **Validation**: Validates required fields before creation

**Update Article**
```typescript
async updateArticle(id: string | number, article: Partial<NewsArticle>): Promise<void>
```
- **Parameters**:
  - `id`: Article identifier
  - `article`: Fields to update
- **Description**: Updates existing article
- **Error Handling**: Throws error if article not found

**Delete Article**
```typescript
async deleteArticle(id: string | number): Promise<void>
```
- **Parameters**: 
  - `id`: Article identifier
- **Description**: Permanently deletes article
- **Authorization**: Requires admin permissions

**Get Articles by Category**
```typescript
async getArticlesByCategory(category: string): Promise<NewsArticle[]>
```
- **Parameters**:
  - `category`: Category name
- **Description**: Retrieves articles filtered by category
- **Returns**: Array of articles matching the category

#### Real-time Subscriptions

**Subscribe to Articles**
```typescript
subscribeToArticles(callback: (articles: NewsArticle[]) => void): () => void
```
- **Parameters**:
  - `callback`: Function called when articles change
- **Description**: Sets up real-time listener for article changes
- **Returns**: Unsubscribe function
- **Usage Example**:
```typescript
const unsubscribe = firebaseNewsService.subscribeToArticles((articles) => {
  console.log('Articles updated:', articles.length);
  setArticles(articles);
});

// Clean up subscription
return () => unsubscribe();
```

#### Category Operations

**Get Categories**
```typescript
async getCategories(): Promise<string[]>
```
- **Description**: Retrieves all available categories
- **Returns**: Array of category names
- **Fallback**: Returns default categories on error

**Add Category**
```typescript
async addCategory(category: string): Promise<void>
```
- **Parameters**:
  - `category`: New category name
- **Description**: Adds new category to the system
- **Validation**: Prevents duplicate categories

**Delete Category**
```typescript
async deleteCategory(category: string): Promise<void>
```
- **Parameters**:
  - `category`: Category name to delete
- **Description**: Removes category from system
- **Warning**: Does not delete articles in the category

## File Upload Service API

### WebFileUploadService (Web Application)

**Upload File**
```typescript
async uploadFile(file: File, options?: UploadOptions): Promise<UploadResult>
```
- **Parameters**:
  - `file`: File object to upload
  - `options`: Optional upload configuration
- **Returns**: UploadResult with URL and metadata
- **Supported Formats**: Images (JPEG, PNG, WebP), Videos (MP4, WebM)
- **File Size Limit**: 10MB for images, 50MB for videos

**Upload Options Interface**
```typescript
interface UploadOptions {
  quality?: number;        // Image quality (0.1 - 1.0)
  maxWidth?: number;       // Maximum width in pixels
  maxHeight?: number;      // Maximum height in pixels
  folder?: string;         // Storage folder path
}
```

**Upload Result Interface**
```typescript
interface UploadResult {
  url: string;            // Public download URL
  path: string;           // Firebase Storage path
  size: number;           // File size in bytes
  contentType: string;    // MIME type
  metadata: {
    uploadedAt: string;   // ISO timestamp
    originalName: string; // Original filename
  };
}
```

### FileUploadService (Mobile Application)

**Upload Image**
```typescript
async uploadImage(imageUri: string, options?: MobileUploadOptions): Promise<UploadResult>
```
- **Parameters**:
  - `imageUri`: Local image URI
  - `options`: Upload configuration
- **Description**: Uploads image from mobile device
- **Compression**: Automatic image compression for mobile

**Mobile Upload Options**
```typescript
interface MobileUploadOptions {
  quality?: number;        // Compression quality
  resize?: {
    width: number;
    height: number;
  };
  folder?: string;
}
```

## Notification Service API

### NotificationSender

**Send Article Notification**
```typescript
static async sendArticleNotification(article: NewsArticle): Promise<void>
```
- **Parameters**:
  - `article`: Article to notify about
- **Description**: Sends push notification for new article
- **Target**: All subscribed users
- **Payload**: Article headline, description, and ID

**Send Custom Notification**
```typescript
static async sendCustomNotification(title: string, body: string): Promise<void>
```
- **Parameters**:
  - `title`: Notification title
  - `body`: Notification body text
- **Description**: Sends custom notification to all users
- **Use Cases**: Announcements, maintenance notices

**Get Notification Stats**
```typescript
static getNotificationStats(): NotificationStats
```
- **Returns**: Statistics about sent notifications
- **Statistics Include**: Total sent, recent notifications, success rate

### FirebaseNotificationService (Mobile)

**Initialize Notifications**
```typescript
async initialize(): Promise<void>
```
- **Description**: Sets up push notification handlers
- **Permissions**: Requests notification permissions
- **Token Management**: Handles FCM token registration

**Test Notification Status**
```typescript
async testNotificationStatus(): Promise<void>
```
- **Description**: Verifies notification setup
- **Debugging**: Logs permission and token status

## Data Types

### NewsArticle Interface

```typescript
interface NewsArticle {
  id: string | number;          // Unique identifier
  headline: string;             // Article title
  description: string;          // Article summary
  category: string;             // Article category
  imageUrl: string;             // Main article image
  youtubeUrl?: string;          // YouTube video URL (optional)
  mediaType: 'image' | 'youtube'; // Media type indicator
  readTime: string;             // Estimated reading time
  source: string;               // News source name
  sourceUrl: string;            // Original source URL
  timestamp: string;            // Publication timestamp
  publishedAt: Date;            // Publication date object
  tags?: string[];              // Article tags (optional)
  isBreaking?: boolean;         // Breaking news flag (optional)
}
```

### UserProfile Interface

```typescript
interface UserProfile {
  uid: string;                  // User unique ID
  email: string;                // User email address
  displayName: string;          // Display name
  role: 'admin' | 'user';       // User role
  isAdmin: boolean;             // Admin permission flag
  isVerified: boolean;          // Email verification status
  bio?: string;                 // User biography (optional)
  photoURL?: string;            // Profile picture URL (optional)
  joinedAt: Timestamp;          // Account creation date
}
```

### NotificationStats Interface

```typescript
interface NotificationStats {
  totalSent: number;            // Total notifications sent
  recentNotifications: number;  // Recent notifications count
  lastSentAt?: Date;            // Last notification timestamp
  successRate: number;          // Delivery success rate
}
```

## Error Handling

### Common Error Types

**Authentication Errors**
```typescript
// Error codes
'auth/user-not-found'         // User does not exist
'auth/wrong-password'         // Incorrect password
'auth/too-many-requests'      // Rate limit exceeded
'auth/network-request-failed' // Network connectivity issue
```

**Firestore Errors**
```typescript
// Error codes
'permission-denied'           // Insufficient permissions
'not-found'                  // Document not found
'already-exists'             // Document already exists
'resource-exhausted'         // Quota exceeded
'unavailable'                // Service unavailable
```

**Storage Errors**
```typescript
// Error codes
'storage/unauthorized'        // Insufficient permissions
'storage/canceled'           // Upload canceled
'storage/unknown'            // Unknown error occurred
'storage/object-not-found'   // File not found
'storage/quota-exceeded'     // Storage quota exceeded
```

### Error Handling Best Practices

```typescript
try {
  const articles = await firebaseNewsService.getArticles();
  return articles;
} catch (error: any) {
  console.error('Failed to fetch articles:', error);
  
  // Handle specific error types
  if (error.code === 'permission-denied') {
    throw new Error('Access denied. Please check your permissions.');
  }
  
  if (error.code === 'unavailable') {
    throw new Error('Service temporarily unavailable. Please try again.');
  }
  
  // Generic error handling
  throw new Error('Failed to load articles. Please try again.');
}
```

## Rate Limits and Quotas

### Firebase Quotas

**Firestore:**
- Reads: 50,000 per day (free tier)
- Writes: 20,000 per day (free tier)
- Deletes: 20,000 per day (free tier)

**Storage:**
- Storage: 5GB (free tier)
- Downloads: 1GB per day (free tier)
- Uploads: 20MB per file

**Authentication:**
- New users: 100 per hour (free tier)
- Verification emails: 100 per hour (free tier)

### Best Practices

**Optimize Read Operations:**
- Use pagination for large datasets
- Implement caching strategies
- Use real-time listeners efficiently

**Optimize Write Operations:**
- Batch write operations when possible
- Avoid unnecessary updates
- Use transactions for consistency

**Storage Optimization:**
- Compress images before upload
- Use appropriate file formats
- Implement CDN for frequent access

## Security Considerations

### API Security

**Authentication Required:**
- All write operations require authentication
- Admin operations require elevated permissions
- API keys should be environment-specific

**Data Validation:**
- Validate all input data
- Sanitize user-generated content
- Implement rate limiting

**Security Rules Example:**
```javascript
// Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Articles - read public, write admin only
    match /articles/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Users - read/write own data only
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Testing APIs

### Unit Testing Examples

```typescript
// Test article service
describe('FirebaseNewsService', () => {
  test('should fetch articles successfully', async () => {
    const articles = await firebaseNewsService.getArticles();
    expect(articles).toBeInstanceOf(Array);
    expect(articles.length).toBeGreaterThan(0);
  });
  
  test('should add article with valid data', async () => {
    const article = {
      headline: 'Test Article',
      description: 'Test description',
      category: 'Technology'
    };
    
    await expect(firebaseNewsService.addArticle(article)).resolves.not.toThrow();
  });
});
```

### Integration Testing

```typescript
// Test complete workflow
describe('Article Management Workflow', () => {
  test('should create, update, and delete article', async () => {
    // Create article
    const article = await firebaseNewsService.addArticle(testArticle);
    expect(article.id).toBeDefined();
    
    // Update article
    await firebaseNewsService.updateArticle(article.id, { headline: 'Updated' });
    const updated = await firebaseNewsService.getArticle(article.id);
    expect(updated.headline).toBe('Updated');
    
    // Delete article
    await firebaseNewsService.deleteArticle(article.id);
    await expect(firebaseNewsService.getArticle(article.id)).rejects.toThrow();
  });
});
```

This API reference provides comprehensive information about all available services and their usage. For implementation examples, refer to the source code in the respective service files.
