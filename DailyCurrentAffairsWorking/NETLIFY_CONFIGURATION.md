# Netlify Environment Variables Configuration

## Required Environment Variables

Add these in Netlify Dashboard > Site settings > Environment variables:

### Firebase Configuration
```
REACT_APP_FIREBASE_API_KEY=AIzaSyAr0-reXFa5nLRAv2AdNbHMC9w-1LAtgsk
REACT_APP_FIREBASE_AUTH_DOMAIN=yuvaupdate-3762b.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=yuvaupdate-3762b
REACT_APP_FIREBASE_STORAGE_BUCKET=yuvaupdate-3762b.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=970590845048
REACT_APP_FIREBASE_APP_ID=1:970590845048:android:2d51c7c3fcae508edbd58d
```

### Optional Environment Variables
```
NODE_ENV=production
REACT_APP_ENVIRONMENT=production
```

## Build Settings Summary

**Base directory:** (leave empty)
**Build command:** npm run build:web
**Publish directory:** dist
**Functions directory:** netlify/functions
**Node.js version:** 18.x

## Deploy Settings

**Deploy log visibility:** Public logs
**Build status:** Active builds (for auto-deployment from GitHub)

## Domain Settings

After deployment, you can:
1. Use the auto-generated Netlify URL: `https://app-name.netlify.app`
2. Configure a custom domain in Site settings > Domain management
3. SSL certificate will be automatically provided

## Security Notes

- Your Firebase API keys are safe to expose in client-side code
- Firebase security rules control access to your data
- Consider adding domain restrictions in Firebase Console for production
