# Complete Netlify Deployment Guide for YuvaUpdate

## 📋 **Step-by-Step Netlify Configuration**

### **1. Netlify Build Settings**

In your Netlify dashboard, configure these settings:

#### **Build & Deploy Settings:**
```
Base directory: (leave empty)
Build command: npm run build:web
Publish directory: dist
Functions directory: netlify/functions
```

#### **Runtime Settings:**
```
Runtime: Node.js 18.x (latest LTS)
Package manager: npm
```

#### **Deploy Settings:**
```
Deploy log visibility: Public logs
Build status: Active builds
Production branch: main
```

### **2. Environment Variables Setup**

Go to **Site settings > Environment variables** and add:

```
REACT_APP_FIREBASE_API_KEY = AIzaSyAr0-reXFa5nLRAv2AdNbHMC9w-1LAtgsk
REACT_APP_FIREBASE_AUTH_DOMAIN = yuvaupdate-3762b.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID = yuvaupdate-3762b
REACT_APP_FIREBASE_STORAGE_BUCKET = yuvaupdate-3762b.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID = 970590845048
REACT_APP_FIREBASE_APP_ID = 1:970590845048:android:2d51c7c3fcae508edbd58d
NODE_ENV = production
REACT_APP_ENVIRONMENT = production
```

### **3. Preview Server Settings**

For development preview:
```
Preview Server command: npm run web
Target port: 8081 (auto-detect)
Preview Server size: 1 vCPU, 4 GB RAM
```

### **4. Deployment Steps**

#### **Option A: GitHub Integration (Recommended)**
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Ready for Netlify deployment"
   git push origin main
   ```

2. In Netlify:
   - Click "New site from Git"
   - Choose GitHub and authorize
   - Select your repository
   - Configure build settings (as above)
   - Deploy site

#### **Option B: Manual Deploy**
1. Build locally:
   ```bash
   npm run build:web
   ```

2. Drag and drop the `dist` folder to Netlify

### **5. Post-Deployment Configuration**

#### **Domain Setup:**
- Default URL: `https://app-name.netlify.app`
- Custom domain: Site settings > Domain management
- SSL: Automatically provided

#### **Firebase Security:**
1. Go to Firebase Console
2. Add your Netlify domain to authorized domains
3. Update Firestore security rules if needed

#### **Performance Optimization:**
- Your `netlify.toml` already includes:
  - Asset caching
  - Security headers
  - SPA routing
  - Gzip compression

### **6. Verification Checklist**

After deployment, verify:
- [ ] Website loads correctly
- [ ] Firebase authentication works
- [ ] News feed displays articles
- [ ] Dark/Light mode toggle works
- [ ] Sidebar policies open correctly
- [ ] Contact information is updated
- [ ] Play Store button works
- [ ] Responsive design on mobile

### **7. Troubleshooting**

#### **Build Fails:**
- Check environment variables are set correctly
- Verify Node.js version (use 18.x)
- Check build logs for specific errors

#### **Firebase Errors:**
- Verify API keys in environment variables
- Check Firebase Console for domain authorization
- Ensure Firestore rules allow web access

#### **Deploy Issues:**
- Confirm publish directory is `dist`
- Check `netlify.toml` configuration
- Verify build command is `npm run build:web`

### **8. Continuous Deployment**

Once configured:
- Every push to `main` branch automatically deploys
- Pull requests create preview deployments
- Rollback capability available in Netlify dashboard

Your YuvaUpdate web app is now production-ready! 🚀

**Live URL will be:** `https://your-site-name.netlify.app`
