# 🔍 Platform-Specific Debugging Guide

## 📱 **Android (Working) vs 🌐 Web (Not Working)**

### 🔍 **How to Check Logs by Platform**

#### 🌐 **Web Browser Logs:**
1. **Open in browser**: http://localhost:8081
2. **Open Developer Tools**: Press `F12` or `Ctrl+Shift+I`
3. **Go to Console tab**
4. **Try uploading article**
5. **Look for error messages** (red text)

#### 📱 **Android Device Logs:**
1. **Enable USB Debugging** on Android
2. **Connect to computer**
3. **Use ADB**: `adb logcat | grep -i expo`
4. **Or use Expo DevTools** in terminal

#### 💻 **Expo Development Logs:**
1. **Check your terminal** where `npm start` is running
2. **Look for error messages** after attempting upload
3. **Press `j` in terminal** to open debugger

## 🐛 **Web-Specific Issues**

### Issue 1: CORS (Cross-Origin) Problems
**Symptoms**: Works on mobile, fails on web
**Solution**: Firebase rules or domain configuration

### Issue 2: Web File Upload Differences
**Symptoms**: File picker works differently on web vs mobile
**Solution**: Check our web-compatible file picker

### Issue 3: Firebase Web SDK Issues
**Symptoms**: Different behavior between platforms
**Solution**: Platform-specific Firebase initialization

## 🛠️ **Quick Web Debug Steps**

### Step 1: Open Web App
```bash
# Make sure server is running
npm start

# Then open: http://localhost:8081
```

### Step 2: Open Browser Console
- **Chrome**: F12 → Console
- **Firefox**: F12 → Console  
- **Safari**: Cmd+Opt+I → Console

### Step 3: Try Upload & Check Console
1. **Go to Admin Panel**
2. **Try uploading article** 
3. **Watch console for errors**
4. **Look for red error messages**

### Step 4: Common Web Errors to Look For
```
❌ CORS error
❌ "Failed to fetch"
❌ "Network request failed"
❌ "Permission denied"
❌ "Invalid configuration"
```

## 🎯 **Immediate Action Plan**

1. **Open web app in browser**
2. **Open developer console (F12)**
3. **Try the upload that's failing**
4. **Copy the exact error message**
5. **Tell me what you see!**

---

**Open your web browser console now and try the upload - what error do you see?** 🔍
