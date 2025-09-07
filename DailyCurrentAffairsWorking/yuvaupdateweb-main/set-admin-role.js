// Run this script with: node set-admin-role.js
// Requires: npm install firebase-admin

import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const uid = 'l0wJt7l4DxMskrusjbVLYfQ5hsG2'; // Your admin user's UID

async function setAdminRole() {
  try {
    await db.collection('users').doc(uid).set({
      role: 'admin',
      isAdmin: true
    }, { merge: true });
    console.log('✅ Admin role set for user:', uid);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin role:', error);
    process.exit(1);
  }
}

setAdminRole();
