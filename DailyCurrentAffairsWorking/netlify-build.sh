#!/bin/bash
echo "🔍 Checking for package.json..."
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "📂 Current directory: $(pwd)"
    echo "📁 Directory contents:"
    ls -la
    exit 1
fi

echo "✅ package.json found!"
echo "📦 Installing dependencies..."
npm ci

echo "🏗️ Building web version..."
npm run build:web

echo "✅ Build complete!"
echo "📁 Build output:"
ls -la dist/
