# Vercel Deployment Guide

## Quick Setup

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

## Environment Variables

Set these in Vercel dashboard or via CLI:

```bash
vercel env add REACT_APP_FIREBASE_API_KEY
vercel env add REACT_APP_FIREBASE_AUTH_DOMAIN
vercel env add REACT_APP_FIREBASE_PROJECT_ID
vercel env add REACT_APP_FIREBASE_STORAGE_BUCKET
vercel env add REACT_APP_FIREBASE_MESSAGING_SENDER_ID
vercel env add REACT_APP_FIREBASE_APP_ID
```

## Automatic Deployment

- Connect your GitHub repository to Vercel
- Every push to main branch will auto-deploy
- Preview deployments for pull requests

## Custom Domain

Add your custom domain in Vercel dashboard:
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration steps

## Why Vercel?

- ✅ Better Expo/React support
- ✅ Faster builds
- ✅ Automatic deployments
- ✅ Great performance
- ✅ Easy environment variables
- ✅ Built-in analytics
