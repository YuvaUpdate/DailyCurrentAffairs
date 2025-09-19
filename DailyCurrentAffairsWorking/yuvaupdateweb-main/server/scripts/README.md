# Migration scripts

This folder contains small one-off scripts to help migrate data when backend/URL schemes change.

## fix-video-urls.js

Purpose: Convert stored video URLs that point to relative proxy paths or direct Cloudflare R2 public URLs into absolute proxied playback URLs that mobile and web clients can stream via the backend.

Usage (dry-run):

```powershell
cd server
# Place your Firebase service account JSON at server/serviceAccount.json or set SERVICE_ACCOUNT_PATH
$env:API_BASE = "https://api.yourdomain.com"
node scripts/fix-video-urls.js --dry
```

If the output looks correct, run without `--dry` to apply updates:

```powershell
node scripts/fix-video-urls.js
```

Environment variables:
- `API_BASE` or `VITE_API_BASE_URL` — base URL of your backend (required)
- `SERVICE_ACCOUNT_PATH` — optional path to Firebase service account JSON. Defaults to `server/serviceAccount.json`.

Notes:
- The script updates documents in the `video_reels` Firestore collection (the repository's code uses this collection name).
- Always run with `--dry` first to preview changes.
- Keep your service account JSON secure and do not commit it to source control.
