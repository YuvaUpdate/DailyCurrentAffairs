@echo off
echo Building Android App Bundle for Google Play Store...

REM Update version
echo Updating version...
eas build --platform android --profile production --auto-submit

REM Check build status
echo Build completed! Check EAS dashboard for download link.
echo https://expo.dev/accounts/nareshkumarbalamurugan/projects/DailyCurrentAffairsWorking/builds

pause
