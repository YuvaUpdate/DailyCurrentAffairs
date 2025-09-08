# 🚀 Deployment Guide - Daily Current Affairs

## 📊 Comparison: Vercel vs Netlify

| Feature | Vercel ⭐ | Netlify |
|---------|-----------|---------|
| **Free Tier** | 100GB bandwidth | 100GB bandwidth |
| **Build Time** | 45 min/month | 300 min/month |
| **Ease of Setup** | Excellent | Excellent |
| **Performance** | Excellent | Excellent |
| **Custom Domains** | ✅ Free | ✅ Free |
| **Auto Deploy** | ✅ | ✅ |
| **Preview Deploys** | ✅ | ✅ |

## 🏆 **Recommended: Vercel** 
Better for React/Vite apps with excellent performance and simpler setup.

---

## 🚀 Quick Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "**New Project**"
4. Select your repository
5. Click "**Deploy**" (Vercel auto-detects Vite settings)

**That's it!** Your app will be live at `https://your-project.vercel.app`

---

## 🔧 Alternative: Netlify Deploy

### Step 1: Push to GitHub (same as above)

### Step 2: Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Sign in with GitHub
3. Click "**New site from Git**"
4. Select your repository
5. Settings are auto-configured via `netlify.toml`
6. Click "**Deploy site**"

---

## 🛠️ Manual Deployment (CLI)

### Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Netlify CLI
```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod --dir=dist
```

---

## 🔑 Environment Variables

If you have any environment variables, add them in the deployment platform:

**Vercel:** Project Settings → Environment Variables
**Netlify:** Site Settings → Environment Variables

Common variables:
```
NODE_VERSION=18
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_domain_here
```

---

## 🎯 Custom Domain Setup

Both platforms support free custom domains:

1. Buy domain from any registrar (Namecheap, GoDaddy, etc.)
2. In your deployment platform dashboard:
   - **Vercel:** Settings → Domains
   - **Netlify:** Domain settings → Custom domains
3. Add your domain and configure DNS

---

## 📈 Performance Tips

1. **Images:** Already optimized with lazy loading
2. **Bundle Size:** Consider code splitting for large bundles
3. **Caching:** Both platforms handle this automatically
4. **CDN:** Global edge network included

---

## 🔄 Auto-Deployment Setup

✅ **Already configured!** 
- Every push to `main` branch auto-deploys
- Pull requests get preview deployments
- Rollback available if needed

---

## 🎉 Next Steps After Deployment

1. **Test the live app** thoroughly
2. **Set up custom domain** (optional)
3. **Configure monitoring** (both platforms provide analytics)
4. **Share your live URL!**

---

## 📞 Support

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Netlify Docs:** [docs.netlify.com](https://docs.netlify.com)

**Your app is ready to deploy! 🚀**
