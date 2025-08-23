# 📱 Building APK for YuvaUpdate App

## 🛠️ Your Current Setup

- **Framework**: Expo SDK 53
- **Build System**: EAS Build (configured)
- **Package Name**: `com.nareshkumarbalamurugan.YuvaUpdate`
- **EAS Project ID**: `eb4eb9b3-ba6a-410b-aec4-83a429779add`

## 🚀 Method 1: EAS Build (Recommended)

### Step 1: Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```

### Step 3: Configure Build Profile
Create `eas.json` in your project root:
```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Step 4: Build APK
```bash
# For testing/preview APK
eas build --platform android --profile preview

# For production AAB (Google Play Store)
eas build --platform android --profile production
```

## 🔧 Method 2: Expo Build (Legacy)

### Step 1: Install Expo CLI
```bash
npm install -g expo-cli
```

### Step 2: Build APK
```bash
expo build:android -t apk
```

## ⚡ Method 3: Local Development Build

### Step 1: Setup Android Studio
1. Install Android Studio
2. Setup Android SDK
3. Add platform-tools to PATH

### Step 2: Create Development Build
```bash
eas build --platform android --profile development --local
```

## 📋 Pre-Build Checklist

### ✅ Required Files
- [x] `app.json` - ✅ Configured
- [x] `google-services.json` - ✅ Present
- [x] `package.json` - ✅ Valid
- [ ] `eas.json` - ⚠️ Need to create

### ✅ App Configuration
- [x] App name: "YuvaUpdate"
- [x] Package: com.nareshkumarbalamurugan.YuvaUpdate
- [x] Version: 1.0.0
- [x] Icons: Present in assets/

### ✅ Dependencies
- [x] Firebase configured
- [x] File upload working
- [x] All features tested

## 🎯 Recommended Build Command

For your current setup, I recommend using **EAS Build**:

```bash
# 1. Install EAS CLI
npm install -g @expo/eas-cli

# 2. Login
eas login

# 3. Build preview APK
eas build --platform android --profile preview
```

## 📱 Build Process

1. **Upload**: Code uploaded to Expo servers
2. **Build**: APK compiled in cloud
3. **Download**: APK link provided
4. **Install**: Transfer APK to Android device

## 🔍 Build Status

You can monitor builds at:
- Expo Dashboard: https://expo.dev
- CLI: `eas build:list`

## 📦 Output Files

- **APK**: For direct installation (`preview` profile)
- **AAB**: For Google Play Store (`production` profile)
- **Development**: For debugging (`development` profile)

## 🚨 Common Issues

### Issue: "Expo account required"
**Solution**: `eas login` with your Expo account

### Issue: "Android keystore required"
**Solution**: EAS will generate one automatically

### Issue: "Build failed"
**Solution**: Check `eas build:list` for error details

## 🎉 Next Steps

1. **Create EAS account** (if needed)
2. **Run build command**
3. **Download APK** when ready
4. **Test on Android device**
5. **Publish to Play Store** (optional)

---

**Ready to build?** Let me know if you want me to create the `eas.json` file for you!
