@echo off
echo 🚀 Deploying YuvaUpdate Firebase Functions...
echo.
echo Project: yuvaupdate-3762b
echo.

echo 📋 Step 1: Installing function dependencies...
cd functions
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 📋 Step 2: Building functions...
cd ..

echo.
echo 📋 Step 3: Deploying to Firebase...
call firebase deploy --only functions --project yuvaupdate-3762b
if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    pause
    exit /b 1
)

echo.
echo ✅ Deployment successful!
echo.
echo 🔧 Function URLs:
echo - sendNotificationToTopic: https://us-central1-yuvaupdate-3762b.cloudfunctions.net/sendNotificationToTopic
echo - sendExpoArticlePush: https://us-central1-yuvaupdate-3762b.cloudfunctions.net/sendExpoArticlePush
echo - healthCheck: https://us-central1-yuvaupdate-3762b.cloudfunctions.net/healthCheck
echo.
echo 📱 Test health check:
curl -s https://us-central1-yuvaupdate-3762b.cloudfunctions.net/healthCheck
echo.
echo.
pause
