# Deployment Guide - YuvaUpdate Platform

## Overview

This guide covers the complete deployment process for both the web and mobile applications of the YuvaUpdate platform. The deployment includes setting up production environments, configuring hosting platforms, and implementing continuous deployment.

## Prerequisites

Before deploying, ensure you have:
- Production Firebase project configured
- Domain name registered (for web application)
- Apple Developer Account (for iOS deployment)
- Google Play Console Account (for Android deployment)
- Hosting platform accounts (Vercel/Netlify)
- SSL certificates configured

## Web Application Deployment

### Platform Options

#### Option 1: Vercel Deployment (Recommended)

**Step 1: Prepare for Deployment**
```bash
cd yuvaupdateweb-main

# Install dependencies
npm install

# Build the application
npm run build

# Test the build locally
npm run preview
```

**Step 2: Configure Environment Variables**
Create production environment variables in Vercel dashboard:
```env
VITE_FIREBASE_API_KEY=your_production_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_production_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_production_app_id
```

**Step 3: Deploy to Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Configure custom domain
vercel domains add yourdomain.com
```

**Step 4: Configure Custom Domain**
1. Add domain in Vercel dashboard
2. Configure DNS records:
   - A record: `@` pointing to Vercel IP
   - CNAME record: `www` pointing to `yourdomain.com`
3. Enable SSL certificate (automatic with Vercel)

#### Option 2: Netlify Deployment

**Step 1: Build Application**
```bash
cd yuvaupdateweb-main
npm run build
```

**Step 2: Deploy to Netlify**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

**Step 3: Configure Environment Variables**
1. Go to Netlify dashboard
2. Navigate to Site Settings > Environment Variables
3. Add all required environment variables

**Step 4: Configure Redirects**
Create `_redirects` file in `public` folder:
```
# Single Page Application redirects
/*    /index.html   200

# API redirects (if needed)
/api/*  https://your-api-endpoint.com/:splat  200
```

### Firebase Hosting (Alternative)

**Step 1: Initialize Firebase Hosting**
```bash
cd yuvaupdateweb-main

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
firebase init hosting
```

**Step 2: Configure firebase.json**
```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

**Step 3: Deploy**
```bash
npm run build
firebase deploy --only hosting
```

### Production Optimization

**Performance Optimizations:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/firestore'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

**SEO Configuration:**
- Ensure robots.txt is in public folder
- Verify sitemap.xml is accessible
- Configure meta tags for social sharing
- Set up Google Analytics (optional)

## Mobile Application Deployment

### Expo Application Services (EAS) Setup

**Step 1: Configure EAS**
```bash
# Install EAS CLI
npm install -g @expo/cli

# Login to Expo
expo login

# Configure EAS Build
eas build:configure
```

**Step 2: Configure eas.json**
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "buildConfiguration": "Debug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      }
    }
  }
}
```

### Android Deployment

**Step 1: Prepare Android Build**
```bash
# Configure app.json for production
{
  "expo": {
    "name": "YuvaUpdate",
    "slug": "yuvaupdate",
    "version": "1.0.0",
    "android": {
      "package": "com.yuvaupdate.dailynews",
      "versionCode": 1,
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ],
      "icon": "./assets/icon-android.png",
      "splash": {
        "image": "./assets/splash-android.png",
        "resizeMode": "cover"
      }
    }
  }
}
```

**Step 2: Build APK/AAB**
```bash
# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
```

**Step 3: Upload to Google Play Console**

**Manual Upload:**
1. Go to Google Play Console
2. Create new application
3. Upload AAB file
4. Fill in store listing details
5. Set up content rating
6. Configure pricing and availability
7. Submit for review

**Automated Upload:**
```bash
# Configure service account key
# Download JSON key from Google Cloud Console

# Submit to Play Store
eas submit --platform android --profile production
```

### iOS Deployment

**Step 1: Configure iOS Build**
```json
{
  "ios": {
    "bundleIdentifier": "com.yuvaupdate.dailynews",
    "buildNumber": "1",
    "icon": "./assets/icon-ios.png",
    "splash": {
      "image": "./assets/splash-ios.png",
      "resizeMode": "cover"
    },
    "supportsTablet": true,
    "infoPlist": {
      "NSCameraUsageDescription": "This app uses camera to capture images for articles.",
      "NSPhotoLibraryUsageDescription": "This app accesses photo library to select images."
    }
  }
}
```

**Step 2: Build for iOS**
```bash
# Build for iOS
eas build --platform ios --profile production
```

**Step 3: Submit to App Store**
```bash
# Submit to App Store
eas submit --platform ios --profile production
```

**Manual App Store Connect Process:**
1. Create app in App Store Connect
2. Upload IPA file using Transporter
3. Configure app metadata
4. Add screenshots and descriptions
5. Set up pricing and availability
6. Submit for App Store review

### Build Automation

**GitHub Actions Workflow**
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Applications

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        working-directory: ./yuvaupdateweb-main
        run: npm ci
        
      - name: Build application
        working-directory: ./yuvaupdateweb-main
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
          working-directory: ./yuvaupdateweb-main

  build-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Expo
        uses: expo/expo-github-action@v7
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build Android
        run: eas build --platform android --non-interactive --profile production
        
      - name: Build iOS
        run: eas build --platform ios --non-interactive --profile production
```

## Environment Configuration

### Production Environment Variables

**Web Application Environment:**
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=production_api_key
VITE_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_production_project
VITE_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Analytics (Optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# API Endpoints (If using external APIs)
VITE_API_BASE_URL=https://api.yuvaupdate.in
```

**Mobile Application Configuration:**
Update `firebase.config.ts` with production values:
```typescript
const firebaseConfig = {
  apiKey: "production_api_key",
  authDomain: "yourproject.firebaseapp.com",
  projectId: "your_production_project",
  storageBucket: "yourproject.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:android:abcdef"
};
```

### Firebase Production Setup

**Step 1: Create Production Project**
1. Go to Firebase Console
2. Create new project for production
3. Enable required services:
   - Authentication
   - Firestore Database
   - Cloud Storage
   - Cloud Messaging
   - Analytics (optional)

**Step 2: Configure Authentication**
1. Enable Email/Password authentication
2. Add authorized domains:
   - `yourdomain.com`
   - `www.yourdomain.com`
3. Configure OAuth providers if needed

**Step 3: Setup Firestore Security Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Articles - public read, admin write
    match /articles/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Categories - public read, admin write
    match /categories/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Users - authenticated read/write own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // App metadata - public read, admin write
    match /app_metadata/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

**Step 4: Configure Storage Security Rules**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Images and media files
    match /articles/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // User uploads
    match /uploads/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Post-Deployment Setup

### Domain Configuration

**DNS Records:**
```
Type    Name    Value                   TTL
A       @       76.76.19.61            300
CNAME   www     your-app.vercel.app    300
TXT     @       verification-code      300
```

**SSL Certificate:**
- Automatic with Vercel/Netlify
- Manual configuration for custom hosting

### Monitoring and Analytics

**Google Analytics Setup:**
1. Create GA4 property
2. Add tracking code to web application
3. Configure goals and conversions

**Firebase Analytics:**
```typescript
// Initialize Analytics
import { getAnalytics, logEvent } from 'firebase/analytics';

const analytics = getAnalytics(app);

// Track custom events
logEvent(analytics, 'article_read', {
  article_id: 'article-123',
  category: 'technology'
});
```

**Error Monitoring:**
```typescript
// Web application error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    console.error('Application error:', error, errorInfo);
  }
}
```

### Performance Monitoring

**Web Vitals Tracking:**
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

**Mobile Performance:**
- Monitor app startup time
- Track API response times
- Monitor crash rates
- Track user engagement metrics

## Maintenance and Updates

### Update Process

**Web Application Updates:**
1. Test changes in development
2. Build and test production build
3. Deploy to staging environment
4. Run automated tests
5. Deploy to production
6. Monitor for errors

**Mobile Application Updates:**
1. Update version numbers in app.json
2. Test on multiple devices
3. Build new version with EAS
4. Submit to app stores
5. Monitor store approval process
6. Release to users

### Rollback Procedures

**Web Application Rollback:**
```bash
# Vercel rollback
vercel rollback [deployment-url]

# Manual rollback
git revert [commit-hash]
vercel --prod
```

**Mobile Application Rollback:**
- Remove problematic version from stores
- Expedite review for fixed version
- Communicate with users about issues

### Backup and Recovery

**Database Backup:**
```bash
# Firestore backup
gcloud firestore export gs://backup-bucket/backup-folder

# Automated daily backups
gcloud scheduler jobs create http daily-firestore-backup \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/PROJECT_ID:exportDocuments"
```

**Code Backup:**
- Git repository with multiple remotes
- Regular code repository backups
- Documentation versioning

This deployment guide provides comprehensive instructions for deploying both applications to production environments. Follow the specific platform guidelines and ensure all security measures are properly configured before going live.
