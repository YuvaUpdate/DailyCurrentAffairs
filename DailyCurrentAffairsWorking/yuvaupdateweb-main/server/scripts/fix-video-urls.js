#!/usr/bin/env node
/**
 * Migration script to fix stored video URLs in Firestore so mobile clients
 * receive absolute playback URLs. It supports two fixes:
 *  - If videoUrl starts with '/api', prefix it with API_BASE
 *  - If videoUrl points directly to Cloudflare R2 public host, convert it to
 *    a proxied playback URL: `${API_BASE}/api/r2/media?path=<objectKey>`
 *
 * Usage:
 *   API_BASE="https://api.yourdomain.com" node fix-video-urls.js --dry
 *   API_BASE="https://api.yourdomain.com" node fix-video-urls.js
 *
 * Requirements:
 *  - A Firebase service account JSON available at the path specified by
 *    SERVICE_ACCOUNT_PATH env var (or at ./serviceAccount.json)
 *  - The script will connect to Firestore and update documents in the
 *    `video_reels` collection (the codebase uses this collection name).
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry') || process.argv.includes('-n');
const SERVICE_ACCOUNT_PATH = process.env.SERVICE_ACCOUNT_PATH || path.resolve(__dirname, '..', 'serviceAccount.json');
const API_BASE = (process.env.API_BASE || process.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

if (!API_BASE) {
  console.error('ERROR: API_BASE (or VITE_API_BASE_URL) environment variable must be set to your backend base URL, e.g. https://api.yourdomain.com');
  process.exit(2);
}

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('ERROR: Firebase service account JSON not found at', SERVICE_ACCOUNT_PATH);
  console.error('Set SERVICE_ACCOUNT_PATH env var or place the file at server/serviceAccount.json');
  process.exit(2);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTION = 'video_reels';

async function main() {
  console.log('Starting migration. DRY RUN =', DRY);
  console.log('Using API_BASE =', API_BASE);
  console.log('Checking collection:', COLLECTION);

  const snapshot = await db.collection(COLLECTION).get();
  console.log('Total documents fetched:', snapshot.size);

  const updates = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const vid = data.videoUrl || data.videoURL || '';
    if (!vid || typeof vid !== 'string') return;

    let newUrl = null;

    // Case 1: relative proxy path
    if (vid.startsWith('/api/')) {
      newUrl = `${API_BASE}${vid}`;
    }

    // Case 2: Cloudflare R2 public URL pattern: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
    else if (vid.includes('.r2.cloudflarestorage.com')) {
      try {
        const u = new URL(vid);
        const segments = u.pathname.split('/').filter(Boolean);
        if (segments.length >= 2) {
          // remove bucket and keep key
          const objectKey = segments.slice(1).join('/');
          newUrl = `${API_BASE}/api/r2/media?path=${encodeURIComponent(objectKey)}`;
        }
      } catch (e) {
        // if URL parsing fails, skip
      }
    }

    if (newUrl && newUrl !== vid) {
      updates.push({ id: doc.id, old: vid, new: newUrl });
    }
  });

  console.log('Documents to update:', updates.length);
  if (updates.length === 0) {
    console.log('Nothing to do. Exiting.');
    process.exit(0);
  }

  for (const u of updates) {
    console.log(`${DRY ? '[DRY]' : '[APPLY]'} doc ${u.id}:`);
    console.log('   FROM:', u.old);
    console.log('   TO:  ', u.new);
    if (!DRY) {
      try {
        await db.collection(COLLECTION).doc(u.id).update({ videoUrl: u.new });
        console.log('   Updated');
      } catch (e) {
        console.error('   Failed to update', e);
      }
    }
  }

  console.log('Migration complete. Updated', DRY ? 0 : updates.length, 'documents.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
