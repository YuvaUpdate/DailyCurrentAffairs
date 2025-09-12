# Google Play Store Release Checklist

## Pre-Release Checklist

### 1. Version Management
- [ ] Update version in `app.json` (increment version number)
- [ ] Update `versionCode` in `app.json` (increment by 1 for each release)
- [ ] Ensure version follows semantic versioning (e.g., 1.0.1, 1.1.0, 2.0.0)

### 2. Build Configuration
- [ ] Verify `eas.json` is configured for `app-bundle` build type
- [ ] Ensure production environment variables are set
- [ ] Confirm signing credentials are properly configured
- [ ] Test the app thoroughly on different devices

### 3. Google Play Console Setup
- [ ] Create app listing in Google Play Console
- [ ] Complete store listing information:
  - App title: YuvaUpdate - Daily Current Affairs
  - Short description (80 characters max)
  - Full description (4000 characters max)
  - App screenshots (at least 2 phone screenshots)
  - Feature graphic (1024 x 500 px)
  - App icon (512 x 512 px)
- [ ] Set up content rating
- [ ] Configure pricing and distribution
- [ ] Add privacy policy URL

## Build Process

### Step 1: Build AAB
```bash
# Build production AAB
eas build --platform android --profile production

# Alternative: Build and submit automatically
eas build --platform android --profile production --auto-submit
```

### Step 2: Download AAB
1. Go to [EAS Build Dashboard](https://expo.dev/accounts/nareshkumarbalamurugan/projects/DailyCurrentAffairsWorking/builds)
2. Download the `.aab` file when build completes
3. Keep the file secure (it's signed and ready for Play Store)

### Step 3: Upload to Google Play Console
1. Go to Google Play Console
2. Navigate to your app → Production → Create new release
3. Upload the `.aab` file
4. Add release notes
5. Review and rollout

## Important Information

### App Bundle Details
- **Package Name**: com.nareshkumarbalamurugan.YuvaUpdate
- **Build Type**: Android App Bundle (.aab)
- **Signing**: Managed by EAS Build with your keystore
- **Target SDK**: Latest Android API level

### Keystore Information (KEEP SECURE)
- **Keystore Type**: JKS
- **Key Alias**: 0b312ef8d1aacdba63b59a86301c012a
- **SHA1 Fingerprint**: E8:EA:B4:E8:D8:E4:4D:F4:21:7D:98:D2:D4:BD:B7:4D:5A:41:FD:96
- **SHA256 Fingerprint**: 93:75:36:22:29:D9:95:01:54:63:2C:31:BD:DF:2E:11:77:99:1B:3B:0C:D3:D6:8C:1B:AD:5F:7D:FA:6F:B0:F6

### Firebase Configuration
- Ensure `google-services.json` is properly configured
- Verify Firebase project is set to production settings
- Test push notifications before release

## Post-Release Steps

### 1. Monitor Release
- [ ] Check crash reports in Google Play Console
- [ ] Monitor user reviews and ratings
- [ ] Track download and usage statistics
- [ ] Verify all features work correctly

### 2. Update Process for Future Releases
1. Increment version numbers in `app.json`
2. Test thoroughly
3. Build new AAB with `eas build --platform android --profile production`
4. Upload to Google Play Console
5. Add release notes describing changes
6. Rollout gradually (10% → 50% → 100%)

## Troubleshooting

### Common Issues
1. **Build Fails**: Check expo CLI version and dependencies
2. **Upload Rejected**: Verify AAB is signed and version code is incremented
3. **App Crashes**: Test on multiple devices and check logs
4. **Push Notifications Not Working**: Verify Firebase configuration

### Support Resources
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Expo Support](https://expo.dev/support)

## Commands Reference

```bash
# Check EAS CLI version
eas --version

# Login to Expo
eas login

# Configure credentials
eas credentials

# Build production AAB
eas build --platform android --profile production

# Check build status
eas build:list

# Submit to Play Store (requires service account setup)
eas submit --platform android --profile production
```
