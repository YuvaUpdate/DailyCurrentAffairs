#!/bin/bash

echo "🚀 Building YuvaUpdate for Web Deployment..."
echo "========================================"

# Build the web version
echo "📦 Building web bundle..."
npm run build:web

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📁 Build output in: dist/"
    echo "📋 Files created:"
    ls -la dist/
    echo ""
    echo "🌐 Ready for deployment! Choose one option:"
    echo ""
    echo "Option 1 - Drag & Drop:"
    echo "  → Go to netlify.com"
    echo "  → Drag the 'dist' folder to deploy"
    echo ""
    echo "Option 2 - GitHub Integration:"
    echo "  → Push to GitHub: git push origin main"
    echo "  → Connect repo to Netlify"
    echo ""
    echo "Option 3 - Netlify CLI:"
    echo "  → Run: netlify deploy --prod --dir=dist"
    echo ""
    echo "🎉 Your YuvaUpdate app will be live on the web!"
else
    echo "❌ Build failed. Check the error messages above."
    exit 1
fi
