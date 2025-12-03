# Google Play Policy Fix Checklist - December 2025

## App Information
- **App Name:** Yuva Update – News in 60 Words
- **Package:** com.nareshkumarbalamurugan.YuvaUpdate
- **Version Code:** 6 (updated)

---

## ✅ COMPLETED FIXES (Already Done)

### 1. Privacy Policy Updated
- [x] Updated age from "13" to "18" in privacy policy
- [x] In-app: `policies/PrivacyPolicy.tsx`
- [x] Web: `yuvaupdateweb-main/src/pages/Privacy.tsx`
- [x] Static HTML: `yuvaupdateweb-main/public/privacy-policy.html`

### 2. App Configuration Updated
- [x] Version code incremented: 5 → 6
- [x] Added POST_NOTIFICATIONS permission

---

## 🔄 ACTIONS YOU NEED TO DO

### Step 1: Deploy Updated Privacy Policy
Your website is live at `https://www.yuvaupdate.in` but you need to redeploy to update the privacy policy.

```powershell
cd d:\DailyCurrentAffairs\DailyCurrentAffairsWorking\yuvaupdateweb-main
npm run build
netlify deploy --prod
```

**Privacy Policy URL for Play Console:** `https://www.yuvaupdate.in/privacy`

---

### Step 2: Rebuild Android App
```powershell
cd d:\DailyCurrentAffairs\DailyCurrentAffairsWorking
npx expo prebuild --clean
cd android
.\gradlew bundleRelease
```

AAB location: `android\app\build\outputs\bundle\release\app-release.aab`

---

### Step 3: Google Play Console - REQUIRED Settings

#### A. Privacy Policy URL
1. Go to **Play Console** → **Policy** → **App content**
2. Click **Privacy policy**
3. Add URL: `https://www.yuvaupdate.in/privacy`
4. Save

#### B. Data Safety Form (CRITICAL)
1. Go to **App content** → **Data safety**
2. Fill out the form:

| Question | Answer |
|----------|--------|
| Does your app collect or share data? | **Yes** |
| Is all data encrypted in transit? | **Yes** |
| Can users request data deletion? | **Yes** |

**Data Types to Declare:**

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| **Device or other IDs** (FCM tokens) | Yes | No | App functionality (push notifications) |
| **Email address** | Yes | No | Account management |
| **Name** | Yes | No | Account management |
| **App interactions** | Yes | No | Analytics |

#### C. Target Audience (CRITICAL)
1. Go to **App content** → **Target audience and content**
2. Select: **"18 years and over"** ONLY
3. **DO NOT** select any age group under 18
4. Save

#### D. Content Rating
1. Go to **App content** → **Content rating**
2. Complete the questionnaire honestly
3. Your app should get: **Everyone** or **Teen** rating

#### E. Ads Declaration
1. Go to **App content** → **Ads**
2. Select: **"No, my app does not contain ads"**
3. Save

#### F. App Access
1. Go to **App content** → **App access**
2. If app needs login:
   - Select "All or some functionality is restricted"
   - Provide test credentials:
     - Email: (your test email)
     - Password: (your test password)

---

### Step 4: Store Listing Updates

#### A. App Category
- **Category:** News & Magazines
- **Tags:** News, Current Affairs, Daily Updates

#### B. Content Guidelines
Make sure your store listing doesn't:
- ❌ Mention children or students
- ❌ Show children in screenshots
- ❌ Use educational themes targeting minors
- ✅ Target adult news readers

---

## 📋 Pre-Submission Checklist

Before uploading new AAB:

- [ ] Privacy policy deployed and accessible at `https://www.yuvaupdate.in/privacy`
- [ ] Data Safety form completed with FCM tokens declared
- [ ] Target audience set to "18 years and over"
- [ ] Content rating questionnaire completed
- [ ] Ads declaration set to "No ads"
- [ ] App access credentials provided (if needed)
- [ ] New AAB built with version code 6
- [ ] Store listing doesn't target children

---

## 🚨 Common Rejection Reasons

1. **Missing Privacy Policy URL** - URL must be publicly accessible
2. **Data Safety incomplete** - Must declare ALL data types collected
3. **Target audience wrong** - Must NOT include children if app has comments/social features
4. **FCM tokens not declared** - Device IDs must be declared in Data Safety

---

## 📞 Support Contact

If Google requests more information:
- Email: hr.jogenroy@gmail.com
- Phone: +91 80114 18040

---

## Version History
- December 3, 2025: Updated privacy policy age to 18+, version code to 6
- December 1, 2025: App removed from Play Store (appeal successful)
