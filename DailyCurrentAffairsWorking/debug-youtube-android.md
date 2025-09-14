# 🔍 YouTube Video Player Android Debug Guide

## How to Debug YouTube Video Player on Android

### 1. **Using React Native Debugger**
```bash
# Open Metro bundler (if not already running)
npx expo start

# Then in the app:
# - Shake the device
# - Select "Debug with Chrome" or "Remote JS Debugging"
# - Open Chrome DevTools to see console logs
```

### 2. **Using Flipper (Recommended)**
```bash
# Install Flipper if not already installed
# Download from: https://fbflipper.com/

# Then:
# - Open Flipper
# - Connect your Android device
# - Look for "React DevTools" and "Console" plugins
```

### 3. **Manual Android Logcat**
```bash
# If you have Android Studio or SDK tools:
adb logcat | grep -E "ReactNativeJS|YouTubePlayer|VideoFeed"

# Or use Android Studio:
# Tools > Android > Logcat
# Filter by "ReactNativeJS"
```

## 📱 What to Look For in Logs

### ✅ Successful YouTube Video Player Logs:
```
✅ [YouTubePlayer] Native YouTube player loaded successfully
🔍 [VideoFeed] URL check: https://youtube.com/... -> YouTube: true
🎬 [VideoItem] "Sample Video..." - YouTube: true, Active: true, Loading: false, Platform: android
🎥 [YouTubePlayer] Rendering player - Video ID: abc123, Platform: android, isActive: true
📱 [YouTubePlayer] Using Mobile YouTube Player for: abc123, YoutubePlayer available: true
📱 [MobileYouTube] Player Ready for video: abc123, isActive: true
📱 [VideoItem] YouTube onReady for: Sample Video...
```

### ❌ Error Logs to Watch For:
```
❌ [YouTubePlayer] Failed to load react-native-youtube-iframe: [error]
❌ [YouTubePlayer] Mobile YouTube player not available! Install react-native-youtube-iframe
📱 [MobileYouTube] Player Error for video: abc123, Error: [error details]
📱 [VideoItem] YouTube onError for: Sample Video..., [error]
```

## 🚀 Quick Test Steps

1. **Open the app** and navigate to video feed
2. **Look for YouTube videos** in the feed 
3. **Check console logs** for the patterns above
4. **Test video playback** - tap play/pause, seek, etc.
5. **Test UI elements** - close button, like/share buttons, video details

## 🔧 Common Issues & Solutions

### Issue: "YoutubePlayer available: false"
**Solution**: Install the package
```bash
npm install react-native-youtube-iframe
npx expo run:android
```

### Issue: YouTube videos not playing
**Solution**: Check video URL format and network connection

### Issue: Controls not working
**Solution**: Check overlay styles and pointerEvents settings

### Issue: App crashes on YouTube videos
**Solution**: Check native YouTube player initialization logs

## 📊 Debug Data Collection

When reporting issues, please include:
- **Platform**: Android version
- **Console logs**: Copy the logs showing the error patterns above
- **Video URL**: Example of YouTube URL that's not working
- **Expected behavior**: What should happen
- **Actual behavior**: What's happening instead

---
*This debug guide will help track down any YouTube video player issues on Android!* 🎯