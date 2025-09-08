# Netlify Deployment Configuration

## Netlify Setup Steps:

1. **Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18

2. **Environment Variables:**
   Add these in Netlify dashboard under Site settings → Environment variables:
   ```
   NODE_VERSION=18
   CI=false
   ```

3. **Redirects:**
   All routes should redirect to index.html for SPA routing

## Auto-deployment:
- Connect your GitHub repository
- Netlify will auto-deploy on every push to main branch

## Manual deployment:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```
