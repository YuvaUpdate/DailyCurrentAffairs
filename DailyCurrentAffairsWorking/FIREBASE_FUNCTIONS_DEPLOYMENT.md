# Firebase Functions Deployment Guide

## Prerequisites
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize your project: `firebase init functions`

## Deployment Steps

### 1. Install Dependencies
```bash
cd firebase-functions
npm install
```

### 2. Deploy Functions
```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:sendNotificationToTopic
firebase deploy --only functions:sendNotificationOnNewArticle
```

### 3. Get Function URLs
After deployment, you'll get URLs like:
- https://us-central1-soullink-96d4b.cloudfunctions.net/sendNotificationToTopic
- The Firestore trigger runs automatically

### 4. Update FCMNotificationService.ts
Replace the cloudFunctionUrl in FCMNotificationService.ts with your actual deployed URL.

## Testing
1. Deploy the functions
2. Upload an article through admin panel
3. Check Firebase Functions logs: `firebase functions:log`
4. Verify notifications are received on devices (even when app is closed)

## Automatic Notifications
The `sendNotificationOnNewArticle` function will automatically trigger whenever:
- A new document is added to the 'news' collection in Firestore
- This happens automatically when you upload articles via admin panel

## Manual Notifications
The `sendNotificationToTopic` function can be called manually via HTTP POST:
```bash
curl -X POST https://your-function-url/sendNotificationToTopic \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "news-updates",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test message"
    },
    "data": {
      "type": "test"
    }
  }'
```
