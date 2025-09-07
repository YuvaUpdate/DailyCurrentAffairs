// Run this script with: node setup-admin.js
// Make sure you have installed firebase-admin: npm install firebase-admin

const admin = require('firebase-admin');

// Path to your Firebase service account key JSON file
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const email = 'jogen1349@gmail.com';
const password = 'ucrjO90h';
const displayName = 'YuvaUpdate Admin';

async function createAdminUser() {
  try {
    // Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      console.log('✅ Admin user created:', userRecord.uid);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(email);
        console.log('⚠️  User already exists:', userRecord.uid);
      } else {
        throw err;
      }
    }

    // Set admin profile in Firestore
    const adminProfile = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName,
      joinedAt: new Date(),
      isVerified: true,
      role: 'admin',
      isAdmin: true,
      bio: 'YuvaUpdate Administrator',
      photoURL: null,
    };
    await db.collection('users').doc(userRecord.uid).set(adminProfile, { merge: true });
    console.log('✅ Admin profile set in Firestore');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
