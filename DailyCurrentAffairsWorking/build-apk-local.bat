@echo off
echo ============================================
echo    Building Android APK (Testing)
echo ============================================
echo.

REM Check if Android SDK is configured
if not defined ANDROID_HOME (
    echo Error: ANDROID_HOME environment variable not set!
    echo Please install Android Studio and set ANDROID_HOME
    pause
    exit /b 1
)

echo Starting APK build...
echo.

REM Clean previous builds
echo Cleaning previous builds...
cd android
call gradlew.bat clean
echo.

REM Build the signed APK
echo Building signed APK...
call gradlew.bat assembleRelease

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Build failed! Check the error messages above.
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.
echo APK file location:
echo %CD%\app\build\outputs\apk\release\app-release.apk
echo.
echo File size:
for %%A in (app\build\outputs\apk\release\app-release.apk) do echo %%~zA bytes
echo.
echo This APK is signed and ready for testing!
echo You can install it directly on Android devices.
echo.

cd..
pause
