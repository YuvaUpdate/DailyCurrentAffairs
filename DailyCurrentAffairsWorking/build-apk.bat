@echo off
echo 🚀 Building YuvaUpdate APK...
echo 📱 App: YuvaUpdate News App
echo 📦 Package: com.nareshkumarbalamurugan.YuvaUpdate
echo.

echo Step 1: Installing EAS CLI...
call npm install -g @expo/eas-cli

echo.
echo Step 2: Login to Expo (you'll need to create account if you don't have one)
call eas login

echo.
echo Step 3: Building APK...
echo Choose build type:
echo 1. Preview APK (for testing)
echo 2. Production APK (for distribution)
echo.

echo Building Preview APK...
call eas build --platform android --profile preview

echo.
echo ✅ Build started!
echo 📱 You can monitor progress at: https://expo.dev
echo 🔗 APK download link will be provided when build completes
echo ⏱️ Build typically takes 10-15 minutes
pause
