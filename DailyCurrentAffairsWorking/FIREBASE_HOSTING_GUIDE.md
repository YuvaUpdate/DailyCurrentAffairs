# Firebase Hosting Deployment

## Setup Firebase Hosting

1. **Initialize Firebase Hosting**:
   ```bash
   firebase init hosting
   ```

2. **Configure hosting in firebase.json**:
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
       ]
     }
   }
   ```

3. **Build and Deploy**:
   ```bash
   npm run build:web
   firebase deploy --only hosting
   ```

## Why Firebase Hosting?

- ✅ Already integrated with our Firebase backend
- ✅ Fast global CDN
- ✅ Free SSL certificate
- ✅ Custom domain support
- ✅ Easy rollback
- ✅ Great for React/Expo apps

## Automatic Deployment

Set up GitHub Actions for auto-deployment:
- Every push to main deploys automatically
- Firebase provides the GitHub Action template
