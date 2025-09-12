# Quick Start Guide - YuvaUpdate Platform

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 18 or higher)
- npm or yarn package manager
- Git
- Firebase CLI
- Expo CLI (for mobile development)
- Android Studio (for Android development)
- Xcode (for iOS development on macOS)

## Initial Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/YuvaUpdate/DailyCurrentAffairs.git
cd DailyCurrentAffairs

# Install dependencies for mobile app
npm install
```

### 2. Firebase Configuration

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project named "yuvaupdate"
3. Enable Authentication, Firestore, and Storage
4. Generate configuration files

#### Configure Authentication
1. Enable Email/Password authentication
2. Add authorized domains for web app
3. Configure OAuth providers if needed

#### Setup Firestore Database
1. Create database in production mode
2. Configure security rules (see DOCUMENTATION.md)
3. Create initial collections

#### Configure Storage
1. Enable Firebase Storage
2. Set up security rules for file uploads
3. Configure CORS for web access

### 3. Web Application Setup

```bash
# Navigate to web application directory
cd yuvaupdateweb-main

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure environment variables in .env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=sender_id
VITE_FIREBASE_APP_ID=app_id

# Start development server
npm run dev
```

### 4. Mobile Application Setup

```bash
# Return to root directory
cd ..

# Configure app.json with your project details
# Edit app.json to match your configuration

# Start Expo development server
expo start

# For Android development
expo run:android

# For iOS development (macOS only)
expo run:ios
```

### 5. Admin User Creation

```bash
# Navigate to web application directory
cd yuvaupdateweb-main

# Install Firebase Admin SDK
npm install firebase-admin

# Configure serviceAccountKey.json (download from Firebase Console)
# Edit setup-admin.js with your admin credentials

# Create admin user
node setup-admin.js
```

## Development Workflow

### Running Applications

#### Web Application
```bash
cd yuvaupdateweb-main
npm run dev                 # Development server
npm run build              # Production build
npm run preview            # Preview production build
```

#### Mobile Application
```bash
expo start                 # Start development server
expo start --tunnel        # Use tunnel for testing on device
expo run:android          # Run on Android emulator/device
expo run:ios              # Run on iOS simulator/device
```

### Building for Production

#### Web Application
```bash
cd yuvaupdateweb-main
npm run build
# Deploy dist/ folder to hosting platform
```

#### Mobile Application
```bash
# Configure EAS Build
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Build for both platforms
eas build --platform all
```

## Common Development Tasks

### Adding New Features

1. **Create Feature Branch**
```bash
git checkout -b feature/new-feature-name
```

2. **Web Component Development**
```bash
# Create component in src/components/
# Add to appropriate page in src/pages/
# Update types in src/types/
```

3. **Mobile Component Development**
```bash
# Create component in root directory
# Update App.tsx or relevant parent component
# Update types.ts
```

4. **Testing Changes**
```bash
# Web testing
cd yuvaupdateweb-main
npm run test

# Mobile testing
npm test
```

### Database Operations

#### Adding New Article
```typescript
// Web application
import { firebaseNewsService } from '@/services/FirebaseNewsService';

const article = {
  headline: "Sample Headline",
  description: "Article description",
  category: "Technology",
  imageUrl: "https://example.com/image.jpg",
  readTime: "3 min read",
  source: "Source Name",
  sourceUrl: "https://source.com"
};

await firebaseNewsService.addArticle(article);
```

#### Managing Categories
```typescript
// Add new category
await firebaseNewsService.addCategory("New Category");

// Get all categories
const categories = await firebaseNewsService.getCategories();
```

### File Upload Handling

#### Web Application
```typescript
import { webFileUploadService } from '@/services/WebFileUploadService';

// Upload image
const result = await webFileUploadService.uploadFile(file);
console.log('Uploaded URL:', result.url);
```

#### Mobile Application
```typescript
import { FileUploadService } from './FileUploadService';

// Upload image
const result = await FileUploadService.uploadImage(imageUri);
```

## Testing

### Web Application Testing
```bash
cd yuvaupdateweb-main
npm run test               # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report
```

### Mobile Application Testing
```bash
npm test                   # Run all tests
npm run test:watch         # Watch mode
```

## Debugging

### Web Application Debugging
1. Open browser developer tools
2. Check console for errors
3. Use React Developer Tools extension
4. Monitor network requests

### Mobile Application Debugging
1. Use Expo Dev Tools
2. Enable remote debugging
3. Use Reactotron for advanced debugging
4. Check device logs

## Deployment

### Web Application Deployment

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd yuvaupdateweb-main
vercel --prod
```

#### Netlify Deployment
```bash
# Build application
npm run build

# Upload dist/ folder to Netlify
# Configure environment variables in Netlify dashboard
```

### Mobile Application Deployment

#### Android Play Store
```bash
# Build AAB for Play Store
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

#### iOS App Store
```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

## Troubleshooting

### Common Issues

#### Firebase Connection Issues
- Verify API keys in environment variables
- Check Firebase project configuration
- Ensure billing is enabled for Firebase project

#### Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Expo cache: `expo start --clear`
- Update dependencies: `npm update`

#### Performance Issues
- Check bundle size: `npm run build --analyze`
- Optimize images and assets
- Use React.memo for expensive components

### Getting Help

1. Check existing GitHub issues
2. Review Firebase documentation
3. Check Expo documentation
4. Post detailed error reports with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Code snippets

## Next Steps

After completing the quick start:

1. **Explore the Codebase**
   - Review main components
   - Understand data flow
   - Study service integrations

2. **Customize Configuration**
   - Update branding and colors
   - Modify feature flags
   - Configure push notifications

3. **Add Content**
   - Create initial articles
   - Set up categories
   - Configure admin users

4. **Deploy to Production**
   - Set up hosting platforms
   - Configure custom domains
   - Set up monitoring

5. **Monitor and Maintain**
   - Set up analytics
   - Monitor error logs
   - Plan regular updates

This quick start guide should get you up and running with the YuvaUpdate platform. Refer to the main DOCUMENTATION.md for detailed information about specific features and advanced configuration.
