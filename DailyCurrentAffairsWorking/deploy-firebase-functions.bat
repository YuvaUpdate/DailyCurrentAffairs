@echo off
echo ====================================
echo Firebase Functions Deployment
echo ====================================
echo.

echo Checking Node.js version...
node --version

echo.
echo ====================================
echo IMPORTANT: Firebase CLI requires Node.js version 20.0.0 or higher
echo Your current version is 18.20.4
echo.
echo Please upgrade Node.js first:
echo 1. Go to https://nodejs.org/
echo 2. Download and install Node.js 20.x LTS
echo 3. Restart your terminal
echo 4. Run this script again
echo ====================================
echo.
pause
exit

echo Step 1: Installing Firebase CLI globally...
npm install -g firebase-tools

echo.
echo Step 2: Logging into Firebase...
firebase login

echo.
echo Step 3: Setting up Firebase project...
firebase use soullink-96d4b

echo.
echo Step 4: Installing function dependencies...
cd firebase-functions
npm install

echo.
echo Step 5: Deploying functions...
firebase deploy --only functions

echo.
echo ====================================
echo Deployment Complete!
echo ====================================
echo.
echo Your functions are now available at:
echo - https://us-central1-soullink-96d4b.cloudfunctions.net/sendNotificationToTopic
echo - https://us-central1-soullink-96d4b.cloudfunctions.net/sendNotificationOnNewArticle
echo.
echo The automatic trigger will now send notifications when you upload articles!
echo.
pause
