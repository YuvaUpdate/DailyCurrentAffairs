const https = require('https');
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAr0-reXFa5nLRAv2AdNbHMC9w-1LAtgsk",
  authDomain: "yuvaupdate-3762b.firebaseapp.com",
  projectId: "yuvaupdate-3762b",
  storageBucket: "yuvaupdate-3762b.firebasestorage.app",
  messagingSenderId: "970590845048",
  appId: "1:970590845048:android:2d51c7c3fcae508edbd58d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = 'admin@yuvaupdate.com';
const ADMIN_PASSWORD = 'YuvaAdmin2025!'; // Strong default password
const ADMIN_DISPLAY_NAME = 'YuvaUpdate Admin';

async function createAdminUser() {
  try {
    console.log('🚀 Starting admin user creation...');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔐 Password:', ADMIN_PASSWORD);
    console.log('');

    // Try to create the user
    let userCredential;
    try {
      console.log('👤 Creating user in Firebase Auth...');
      userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log('✅ Admin user created successfully!');
      console.log('   UID:', userCredential.user.uid);
    } catch (authError) {
      if (authError.code === 'auth/email-already-in-use') {
        console.log('⚠️  Email already exists, trying to sign in...');
        try {
          userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
          console.log('✅ Signed in with existing account');
          console.log('   UID:', userCredential.user.uid);
        } catch (signInError) {
          console.log('❌ Failed to sign in. The admin user exists but has a different password.');
          console.log('   Please manually reset the password in Firebase Console or use a different password.');
          process.exit(1);
        }
      } else {
        throw authError;
      }
    }

    const user = userCredential.user;

    // Create admin profile in Firestore
    console.log('📝 Creating admin profile in Firestore...');
    const adminProfile = {
      uid: user.uid,
      email: user.email,
      displayName: ADMIN_DISPLAY_NAME,
      joinedAt: new Date(),
      isVerified: true,
      role: 'admin',
      isAdmin: true,
      bio: 'YuvaUpdate Administrator',
      photoURL: null
    };

    await setDoc(doc(db, 'users', user.uid), adminProfile, { merge: true });
    console.log('✅ Admin profile created in Firestore');

    console.log('');
    console.log('🎉 Admin setup completed successfully!');
    console.log('');
    console.log('📋 Admin Details:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   UID:', user.uid);
    console.log('   Role: admin');
    console.log('   Display Name:', ADMIN_DISPLAY_NAME);
    console.log('');
    console.log('🔐 You can now login to your app using these credentials');
    console.log('💡 Remember to change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error('   Error code:', error.code);
    process.exit(1);
  }
}

// Run the setup
createAdminUser();
