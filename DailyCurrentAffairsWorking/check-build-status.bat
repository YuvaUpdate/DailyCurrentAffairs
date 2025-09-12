@echo off
echo Checking EAS Build Status...
echo.

REM Check current builds
eas build:list --platform android --limit 5

echo.
echo ==========================================
echo Google Play Store Deployment Instructions
echo ==========================================
echo.
echo 1. Wait for the build to complete
echo 2. Download the .aab file from EAS dashboard
echo 3. Go to Google Play Console
echo 4. Upload the .aab file
echo 5. Fill in store listing details
echo 6. Submit for review
echo.
echo Build Dashboard: https://expo.dev/accounts/nareshkumarbalamurugan/projects/DailyCurrentAffairsWorking/builds
echo Google Play Console: https://play.google.com/console
echo.
pause
