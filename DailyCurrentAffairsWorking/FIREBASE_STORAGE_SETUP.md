# Firebase Storage Setup Guide

## 🔥 Firebase Storage Configuration

Your file upload feature is now ready, but you need to configure Firebase Storage in your Firebase Console.

### Step 1: Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **soullink-96d4b**
3. In the left sidebar, click on **Storage**
4. Click **Get started**
5. Choose **Start in test mode** for now
6. Select a storage location (choose the closest to your users)
7. Click **Done**

### Step 2: Configure Storage Rules

In the Firebase Console > Storage > Rules tab, replace the default rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow upload of images and videos for news articles
    match /news-images/{allPaths=**} {
      allow read: if true; // Anyone can read images
      allow write: if true; // Allow uploads for testing (change later for production)
    }
    
    match /news-videos/{allPaths=**} {
      allow read: if true; // Anyone can read videos
      allow write: if true; // Allow uploads for testing (change later for production)
    }
    
    // Fallback rule for other files
    match /{allPaths=**} {
      allow read, write: if true; // Allow everything for testing
    }
  }
}
```

### Step 3: Test File Upload

1. **Open Admin Panel**: Click the admin button and login with password: `admin123`
2. **Try Image Upload**: 
   - Switch to "Upload" tab in media section
   - Click "Choose Media" 
   - Select an image from your device
   - Wait for upload completion
3. **Create Article**: Fill in headline, description, category and publish

### Step 4: Troubleshooting Upload Issues

If uploads are still hanging, check:

1. **Browser Console**: Open developer tools (F12) and check console for errors
2. **Network Tab**: Check if upload requests are being made
3. **Firebase Authentication**: Make sure you're logged in as admin
4. **Storage Rules**: Verify rules are published correctly
5. **File Size**: Keep images under 5MB, videos under 50MB

### 📱 Mobile Upload Features

- **📷 Take Photo**: Capture new photos with camera
- **🖼️ Choose Image**: Select from gallery
- **🎥 Choose Video**: Select videos (max 60 seconds)
- **🔗 URL Option**: Still support direct URLs

### 🎯 Current Features

✅ **Image Upload**: JPEG images up to 5MB  
✅ **Video Upload**: MP4 videos up to 50MB (60s max)  
✅ **Smart Preview**: Shows media before publishing  
✅ **Category Organization**: Files organized by news category  
✅ **Automatic Resize**: Images optimized for mobile viewing  
✅ **Video Thumbnails**: Preview videos with play button  

### 🔧 Admin Panel Updates

- **Media Source Toggle**: Switch between URL and Upload
- **Visual Upload Area**: Drag-and-drop style interface  
- **Upload Progress**: Loading indicator during upload
- **Media Preview**: See exactly how it will look
- **Remove Media**: Easy removal and re-upload

### 📊 Storage Organization

Your files are organized as:
```
📁 news-images/
  📁 breaking/
  📁 technology/
  📁 sports/
  📁 general/
📁 news-videos/
  📁 breaking/
  📁 technology/
  📁 sports/
  📁 general/
```

### 🚀 Next Steps

1. **Configure Storage Rules** (most important!)
2. **Test image upload**
3. **Test video upload** 
4. **Monitor storage usage** in Firebase Console
5. **Consider upgrading** to Blaze plan for production

---

**Need Help?** Check browser console for detailed error messages and ensure Firebase Storage rules are properly configured.
