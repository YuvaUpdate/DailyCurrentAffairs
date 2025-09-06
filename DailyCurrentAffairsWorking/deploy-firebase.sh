#!/bin/bash

echo "🚀 YuvaUpdate Firebase Migration & Deployment Script"
echo "=================================================="
echo ""
echo "Project: yuvaupdate-3762b"
echo "Package: com.nareshkumarbalamurugan.YuvaUpdate"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

echo "📋 Step 1: Login to Firebase (if needed)..."
firebase login --status > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "🔐 Please login to Firebase:"
    firebase login
fi

echo ""
echo "📋 Step 2: Set Firebase project..."
firebase use yuvaupdate-3762b
if [ $? -ne 0 ]; then
    echo "❌ Failed to set Firebase project. Make sure you have access to yuvaupdate-3762b"
    exit 1
fi

echo ""
echo "📋 Step 3: Install function dependencies..."
cd functions
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install function dependencies"
    exit 1
fi
cd ..

echo ""
echo "📋 Step 4: Deploy Firestore rules..."
firebase deploy --only firestore:rules
if [ $? -ne 0 ]; then
    echo "⚠️ Warning: Failed to deploy Firestore rules. You may need to deploy them manually."
fi

echo ""
echo "📋 Step 5: Deploy Cloud Functions..."
firebase deploy --only functions
if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy functions"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "🔧 Function URLs:"
echo "- sendNotificationToTopic: https://us-central1-yuvaupdate-3762b.cloudfunctions.net/sendNotificationToTopic"
echo "- sendExpoArticlePush: https://us-central1-yuvaupdate-3762b.cloudfunctions.net/sendExpoArticlePush"
echo "- healthCheck: https://us-central1-yuvaupdate-3762b.cloudfunctions.net/healthCheck"
echo "- onNewArticleCreated: (Firestore trigger - automatic)"
echo ""

echo "🧪 Testing health check endpoint..."
curl -s https://us-central1-yuvaupdate-3762b.cloudfunctions.net/healthCheck | python -m json.tool 2>/dev/null || curl -s https://us-central1-yuvaupdate-3762b.cloudfunctions.net/healthCheck

echo ""
echo ""
echo "🎯 Next Steps:"
echo "1. Update your app to use the new Firebase project"
echo "2. Test notifications in your app"
echo "3. Verify Firestore rules are working correctly"
echo "4. Monitor function logs: firebase functions:log"
echo ""
echo "📱 Test notification command:"
echo 'curl -X POST https://us-central1-yuvaupdate-3762b.cloudfunctions.net/sendNotificationToTopic \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"topic":"news-updates","notification":{"title":"Test","body":"Migration successful!"}}'"'"''
echo ""
