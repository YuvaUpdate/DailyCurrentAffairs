const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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
const ADMIN_PASSWORD = 'YuvaAdmin2025!';

async function verifyAdminSetup() {
  try {
    console.log('🔍 Verifying admin user setup...');
    console.log('📧 Testing login with:', ADMIN_EMAIL);
    console.log('');

    // Test login
    console.log('🔐 Testing Firebase Auth login...');
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    const user = userCredential.user;
    
    console.log('✅ Firebase Auth login successful!');
    console.log('   UID:', user.uid);
    console.log('   Email:', user.email);
    console.log('   Email Verified:', user.emailVerified);

    // Check Firestore profile
    console.log('📝 Checking Firestore profile...');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      const profile = userDoc.data();
      console.log('✅ Firestore profile found!');
      console.log('   Role:', profile.role);
      console.log('   isAdmin:', profile.isAdmin);
      console.log('   Display Name:', profile.displayName);
      console.log('   Joined At:', profile.joinedAt?.toDate?.() || profile.joinedAt);
      console.log('   Bio:', profile.bio);

      // Verify admin status
      const isAdmin = profile.role === 'admin' || profile.isAdmin === true;
      if (isAdmin) {
        console.log('✅ Admin status verified!');
      } else {
        console.log('❌ Admin status NOT verified - user is not an admin');
      }
    } else {
      console.log('❌ Firestore profile NOT found');
    }

    // Sign out
    await signOut(auth);
    console.log('🚪 Signed out successfully');

    console.log('');
    console.log('🎉 Admin verification completed!');
    console.log('');
    console.log('📱 Your app is ready to use with admin access:');
    console.log('   1. Open your YuvaUpdate app');
    console.log('   2. Login with admin@yuvaupdate.com');
    console.log('   3. Use password: YuvaAdmin2025!');
    console.log('   4. You should see the Admin button in the header');
    console.log('   5. Tap the Admin button to access the admin panel');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('   Error code:', error.code);
    
    if (error.code === 'auth/user-not-found') {
      console.log('💡 Suggestion: Run create-admin-simple.js first to create the admin user');
    } else if (error.code === 'auth/wrong-password') {
      console.log('💡 Suggestion: The admin user exists but password is different');
    }
    
    process.exit(1);
  }
}

// Run the verification
verifyAdminSetup();
