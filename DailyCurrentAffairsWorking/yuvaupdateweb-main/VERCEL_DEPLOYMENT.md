# Vercel Deployment Guide

## Quick Deployment Steps:

### Option 1: GitHub Integration (Recommended)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Sign up with GitHub
4. Click "New Project"
5. Import your repository
6. Vercel auto-detects Vite settings
7. Click "Deploy"

### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# For production deployment
vercel --prod
```

## Configuration:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

## Environment Variables:
Add in Vercel dashboard under Project Settings → Environment Variables:
```
NODE_VERSION=18
```

## Domain:
- Free subdomain: `your-project.vercel.app`
- Custom domain available on free plan

## Features:
✅ Automatic deployments on git push
✅ Preview deployments for pull requests
✅ Edge network (CDN)
✅ HTTPS by default
✅ Serverless functions support
