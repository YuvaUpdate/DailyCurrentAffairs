# YuvaUpdate - Daily Current Affairs Platform

## Project Overview

YuvaUpdate is a comprehensive news and current affairs platform consisting of a web application and mobile application. The platform provides real-time news updates, article management, and push notifications to keep users informed about current events.

## Architecture

### Technology Stack

**Web Application:**
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with shadcn/ui components
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Hosting**: Vercel/Netlify

**Mobile Application:**
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Notifications**: Firebase Cloud Messaging
- **Audio**: Expo AV
- **Image Handling**: Expo Image Picker
- **Platform Support**: Android and iOS

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Web Client    │    │  Mobile Client  │    │  Admin Panel    │
│   (React)       │    │ (React Native)  │    │   (React)       │
│                 │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │                           │
                    │     Firebase Backend     │
                    │                           │
                    │  • Firestore Database    │
                    │  • Authentication        │
                    │  • Cloud Storage         │
                    │  • Cloud Messaging       │
                    │  • Cloud Functions       │
                    │                           │
                    └───────────────────────────┘
```

## Project Structure

### Web Application Structure

```
yuvaupdateweb-main/
├── public/
│   ├── robots.txt              # SEO crawler instructions
│   ├── sitemap.xml             # SEO sitemap
│   └── favicon.png             # Website favicon
├── src/
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── news/               # News-specific components
│   │   ├── AuthProtected.tsx   # Authentication wrapper
│   │   └── ArticleActions.tsx  # Article interaction components
│   ├── pages/
│   │   ├── Index.tsx           # Homepage
│   │   ├── Admin.tsx           # Admin panel
│   │   ├── About.tsx           # About page
│   │   ├── Privacy.tsx         # Privacy policy
│   │   ├── Terms.tsx           # Terms of service
│   │   └── Support.tsx         # Support page
│   ├── services/
│   │   ├── FirebaseNewsService.ts      # News data operations
│   │   ├── WebFileUploadService.ts     # File upload handling
│   │   ├── ImagePreloadService.ts      # Image optimization
│   │   ├── NotificationSender.ts       # Push notifications
│   │   ├── SitemapGenerator.ts         # SEO sitemap generation
│   │   └── firebase.config.ts          # Firebase configuration
│   ├── styles/
│   │   └── globals.css         # Global styles
│   ├── types/
│   │   └── article.ts          # TypeScript type definitions
│   └── main.tsx                # Application entry point
├── package.json                # Dependencies and scripts
├── tailwind.config.js          # TailwindCSS configuration
├── vite.config.ts              # Vite build configuration
└── tsconfig.json               # TypeScript configuration
```

### Mobile Application Structure

```
root/
├── App.tsx                     # Main application component
├── AppWrapper.tsx              # Application wrapper with providers
├── AuthService.ts              # Authentication service
├── FirebaseNewsService.ts      # News data operations
├── FirebaseNotificationService.ts # Push notification handling
├── AdminPanel.tsx              # Mobile admin interface
├── AudioService.ts             # Text-to-speech functionality
├── CommentService.ts           # Article comments handling
├── VideoPlayerComponent.tsx    # Video playback component
├── YouTubePlayer.tsx           # YouTube video integration
├── buildConfig.ts              # Build-time configuration
├── types.ts                    # TypeScript type definitions
├── firebase.config.ts          # Firebase configuration
├── app.json                    # Expo configuration
├── package.json                # Dependencies and scripts
└── eas.json                    # Expo Application Services config
```

## Core Features

### Web Application Features

**Public Features:**
- Real-time news feed with infinite scrolling
- Category-based article filtering
- Responsive design for all devices
- SEO optimized with meta tags and sitemaps
- Social media sharing integration
- Article search and sorting
- Image optimization and lazy loading

**Admin Features:**
- Secure authentication-protected admin panel
- Article creation and editing with rich media support
- Image upload with Firebase Storage integration
- YouTube video embedding
- Category management
- Push notification management
- Article analytics and statistics
- Bulk article operations

### Mobile Application Features

**User Features:**
- Real-time article synchronization
- Offline reading capability with cached articles
- Category-based filtering
- Text-to-speech functionality
- Article bookmarking
- Push notifications for new articles
- Social sharing
- Dark/light theme support
- Pull-to-refresh functionality

**Admin Features:**
- Mobile admin panel (configurable)
- Article creation and editing
- Image upload and management
- Push notification sending
- Real-time article management

## Database Schema

### Firestore Collections

**articles**
```typescript
{
  id: string;
  headline: string;
  description: string;
  category: string;
  imageUrl: string;
  youtubeUrl?: string;
  mediaType: 'image' | 'youtube';
  readTime: string;
  source: string;
  sourceUrl: string;
  timestamp: Timestamp;
  publishedAt: Date;
  tags?: string[];
  isBreaking?: boolean;
}
```

**categories**
```typescript
{
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
}
```

**users**
```typescript
{
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  isAdmin: boolean;
  isVerified: boolean;
  bio?: string;
  photoURL?: string;
  joinedAt: Timestamp;
}
```

**app_metadata**
```typescript
{
  categories: string[];
  totalArticles: number;
  lastUpdated: Timestamp;
}
```

## Authentication System

### Firebase Authentication Setup

The platform uses Firebase Authentication for secure user management:

**Configuration:**
- Email/password authentication
- Admin user creation via setup script
- Role-based access control
- Session persistence

**Admin Setup:**
```javascript
// Run: node setup-admin.js
const email = 'admin@yuvaupdate.in';
const password = 'secure_password';
```

**Authentication Flow:**
1. User attempts to access admin panel
2. AuthProtected component checks authentication state
3. Redirects to login form if not authenticated
4. Validates credentials with Firebase Auth
5. Sets user role and permissions
6. Grants access to protected resources

## API Services

### FirebaseNewsService

**Core Methods:**
```typescript
class FirebaseNewsService {
  // Article operations
  async getArticles(): Promise<NewsArticle[]>
  async addArticle(article: Partial<NewsArticle>): Promise<void>
  async updateArticle(id: string, updates: Partial<NewsArticle>): Promise<void>
  async deleteArticle(id: string): Promise<void>
  
  // Category operations
  async getCategories(): Promise<string[]>
  async addCategory(category: string): Promise<void>
  
  // Real-time subscriptions
  subscribeToArticles(callback: (articles: NewsArticle[]) => void): () => void
}
```

### NotificationService

**Push Notification System:**
```typescript
class NotificationSender {
  static async sendArticleNotification(article: NewsArticle): Promise<void>
  static async sendCustomNotification(title: string, body: string): Promise<void>
  static getNotificationStats(): NotificationStats
}
```

## Configuration

### Environment Variables

**Web Application (.env):**
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=sender_id
VITE_FIREBASE_APP_ID=app_id
```

**Mobile Application:**
Firebase configuration is handled through `firebase.config.ts` with hardcoded values for stability.

### Build Configuration

**Web Build:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

**Mobile Build:**
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "build": "eas build"
  }
}
```

## Deployment

### Web Application Deployment

**Platform:** Vercel/Netlify

**Build Process:**
1. Install dependencies: `npm install`
2. Build application: `npm run build`
3. Deploy to hosting platform
4. Configure custom domain
5. Set up SSL certificate

**Environment Setup:**
1. Configure environment variables in hosting platform
2. Set up Firebase project
3. Configure authentication domain
4. Upload service account key for admin functions

### Mobile Application Deployment

**Platform:** Expo Application Services (EAS)

**Build Process:**
1. Configure EAS: `eas build:configure`
2. Build APK: `eas build --platform android`
3. Build iOS: `eas build --platform ios`
4. Submit to stores: `eas submit`

**Configuration Files:**
- `app.json`: Expo configuration
- `eas.json`: Build profiles
- `google-services.json`: Android Firebase config

## Development Workflow

### Getting Started

**Prerequisites:**
- Node.js 18+ 
- npm or yarn
- Firebase CLI
- Expo CLI (for mobile)
- Android Studio (for mobile development)

**Setup Steps:**

1. **Clone Repository:**
```bash
git clone https://github.com/YuvaUpdate/DailyCurrentAffairs.git
cd DailyCurrentAffairs
```

2. **Web Application Setup:**
```bash
cd yuvaupdateweb-main
npm install
cp .env.example .env
# Configure environment variables
npm run dev
```

3. **Mobile Application Setup:**
```bash
# In root directory
npm install
expo start
```

4. **Firebase Setup:**
```bash
npm install -g firebase-tools
firebase login
firebase init
# Configure Firestore, Authentication, Storage
```

### Development Commands

**Web Application:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

**Mobile Application:**
```bash
expo start           # Start development server
expo run:android     # Run on Android
expo run:ios         # Run on iOS
expo build           # Build for production
```

## Testing

### Web Application Testing

**Testing Framework:** Vitest + React Testing Library

```bash
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

**Test Structure:**
```
src/
├── __tests__/
│   ├── components/
│   ├── services/
│   └── pages/
└── test-utils/
    └── setup.ts
```

### Mobile Application Testing

**Testing Framework:** Jest + React Native Testing Library

```bash
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
```

## Performance Optimization

### Web Application

**Image Optimization:**
- Lazy loading with Intersection Observer
- WebP format support
- Responsive images with srcSet
- Image preloading service

**Code Splitting:**
- Route-based code splitting
- Dynamic imports for heavy components
- Bundle size optimization

**Caching Strategy:**
- Service worker for offline functionality
- HTTP caching headers
- Local storage for user preferences

### Mobile Application

**Performance Features:**
- FlatList for efficient scrolling
- Image caching and optimization
- Background app refresh
- Memory management
- Startup time optimization

## Security

### Authentication Security

**Web Application:**
- Protected routes with AuthProtected wrapper
- Firebase Auth session management
- Role-based access control
- HTTPS enforcement

**Mobile Application:**
- Secure token storage
- Biometric authentication support
- Certificate pinning
- Data encryption

### Data Security

**Firebase Security Rules:**
```javascript
// Firestore rules example
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /articles/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## Monitoring and Analytics

### Error Tracking

**Web Application:**
- Console error logging
- Firebase Analytics integration
- Performance monitoring

**Mobile Application:**
- Crash reporting
- Performance metrics
- User behavior analytics

### SEO and Marketing

**SEO Features:**
- Meta tags optimization
- Structured data markup
- XML sitemaps
- robots.txt configuration
- Open Graph tags
- Twitter Card support

## Troubleshooting

### Common Issues

**Build Errors:**
- TypeScript configuration issues
- Missing environment variables
- Firebase configuration problems
- Dependency version conflicts

**Runtime Issues:**
- Authentication failures
- Network connectivity problems
- Firebase quota limits
- Image loading failures

**Performance Issues:**
- Large bundle sizes
- Slow API responses
- Memory leaks
- Inefficient re-renders

### Debug Mode

**Web Application:**
```bash
npm run dev -- --debug
```

**Mobile Application:**
```bash
expo start --dev-client
```

## Contributing Guidelines

### Code Standards

**TypeScript:**
- Strict mode enabled
- Explicit type definitions
- Interface over type aliases
- Consistent naming conventions

**React:**
- Functional components with hooks
- Custom hooks for reusable logic
- Proper error boundaries
- Performance optimization with memo

**Styling:**
- TailwindCSS utility classes
- Consistent spacing and colors
- Responsive design patterns
- Accessibility considerations

### Git Workflow

**Branch Strategy:**
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `hotfix/*`: Critical bug fixes

**Commit Convention:**
```
type(scope): description

feat(auth): add user authentication
fix(ui): resolve mobile navigation issue
docs(readme): update installation guide
```

## Maintenance

### Regular Tasks

**Weekly:**
- Monitor Firebase usage and costs
- Review error logs and crashes
- Update dependencies
- Performance monitoring

**Monthly:**
- Security audit
- Backup verification
- Analytics review
- User feedback analysis

**Quarterly:**
- Major dependency updates
- Architecture review
- Performance optimization
- Feature planning

### Backup Strategy

**Database:**
- Automated Firestore exports
- Regular backup verification
- Disaster recovery procedures

**Code:**
- Git repository backups
- Branch protection rules
- Release tagging strategy

## Support and Documentation

### Additional Resources

**Official Documentation:**
- Firebase Documentation
- React Documentation
- React Native Documentation
- Expo Documentation

**Community:**
- GitHub Issues
- Stack Overflow
- Discord/Slack channels
- Developer forums

### Contact Information

**Development Team:**
- Technical Lead: [Contact Information]
- Frontend Developer: [Contact Information]
- Mobile Developer: [Contact Information]
- DevOps Engineer: [Contact Information]

---

This documentation should be updated regularly to reflect changes in the codebase and new features. All developers should familiarize themselves with this documentation before contributing to the project.
