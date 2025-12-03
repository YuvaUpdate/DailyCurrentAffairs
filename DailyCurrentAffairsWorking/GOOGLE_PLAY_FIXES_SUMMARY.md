# Google Play Policy Fixes - Summary

## Issues Found & Fixes Applied

### ✅ Issue 1: Data Safety - Device IDs (FIXED)
**Problem:** App collects Device IDs (FCM tokens) but didn't declare it in Data Safety form.

**Solution:** Updated Data Safety declaration in Google Play Console to include:
- Device or other IDs → Collected & Shared
- Purpose: App functionality + Developer communications
- Optional data collection (users can deny permissions)

---

### ⚠️ Issue 2: Families Policy - Social Features (NEEDS ACTION)
**Problem:** App has commenting feature but lacks child safety protections required by Families Policy.

**Options:**
1. **RECOMMENDED:** Change target audience to 18+ (removes Families Policy requirements)
2. Remove commenting feature entirely
3. Implement full child safety features (complex)

**Action Required:** Go to Play Console → App content → Target audience → Change to "18 and older"

---

### ✅ Issue 3: Foreground Service Permission (FIXED)
**Problem:** App requested FOREGROUND_SERVICE_MEDIA_PLAYBACK but doesn't use background audio.

**Solution Applied:**
1. Updated `app.json`:
   - Set `androidForegroundService: false` for expo-audio
   - Incremented versionCode to 5

2. Created `android/local.properties` with Android SDK path

3. Ran `npx expo prebuild --clean` to regenerate AndroidManifest

4. Verified permission removed from AndroidManifest.xml

**Current Status:** Building new APK with version code 5

---

## Build Status

**Building:** `build-apk-local.bat` is running
**Output Location:** `android\app\build\outputs\apk\release\app-release.apk`
**New Version Code:** 5

---

## Next Steps After Build Completes

### 1. Verify Permission Removed
Check the built APK doesn't have the permission:
```bash
# Extract APK and check manifest
unzip -p app-release.apk AndroidManifest.xml
```

### 2. Upload to Google Play Console
- Go to Play Console → Production → Create new release
- Upload the new APK (version code 5)
- In release notes, mention: "Removed unused foreground service permission"

### 3. Respond to Foreground Service Question
In the "Foreground service permissions" section:

**Option A:** If you can indicate "Not using this permission":
- Select: "My app does not use this permission"

**Option B:** If required to provide explanation:
```
This permission was automatically added by expo-audio library but is not used.
Audio playback stops when the app is minimized (no background playback).
Permission has been removed in version code 5.
```

### 4. Fix Families Policy Issue
Go to: Play Console → App content → Target audience
- Change from current target to **"18 and older"** OR **"13-17"**
- DO NOT include "Under 13"
- Save changes

### 5. Resubmit for Review
- Go to Publishing overview
- Click "Send changes for review"
- Review typically takes 1-7 days

---

## Files Modified

1. `app.json`
   - Added `androidForegroundService: false` to expo-audio config
   - Changed versionCode from 1 to 5

2. `android/local.properties` (created)
   - Set SDK location for Gradle builds

3. `android/app/src/main/AndroidManifest.xml` (regenerated)
   - FOREGROUND_SERVICE permissions removed

4. `app-config-plugin.js` (created but not used)
   - Can be deleted if not needed

---

## Important Notes

- **Build is currently in progress** - Wait for it to complete
- **Check for build errors** - If any occur, we'll need to fix them
- **Test the new APK** before uploading to Play Store
- **Don't forget to fix the Families Policy issue** (change target audience)

---

## Contact if Needed

If build fails or you encounter issues:
1. Check terminal output for errors
2. Verify Android SDK is properly installed
3. Make sure Java/JDK is configured
4. Check Gradle version compatibility

---

Last Updated: October 24, 2025
Status: Building APK (version code 5)
