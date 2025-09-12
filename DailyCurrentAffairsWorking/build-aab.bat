@echo off
echo ============================================
echo    Building Android App Bundle (AAB)
echo    for Google Play Store
echo ============================================
echo.

REM Check if Android SDK is configured
if not defined ANDROID_HOME (
    echo Error: ANDROID_HOME environment variable not set!
    echo Please install Android Studio and set ANDROID_HOME
    pause
    exit /b 1
)

echo Starting AAB build...
echo.

REM Clean previous builds
echo Cleaning previous builds...
cd android
call gradlew.bat clean
echo.

REM Build the signed AAB
echo Building signed Android App Bundle...
call gradlew.bat bundleRelease

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Build failed! Check the error messages above.
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.
echo AAB file location:
echo %CD%\app\build\outputs\bundle\release\app-release.aab
echo.
echo File size:
for %%A in (app\build\outputs\bundle\release\app-release.aab) do echo %%~zA bytes
echo.
echo Next steps:
echo 1. Upload app-release.aab to Google Play Console
echo 2. Fill in store listing details
echo 3. Submit for review
echo.
echo Google Play Console: https://play.google.com/console
echo.

cd..
pause
