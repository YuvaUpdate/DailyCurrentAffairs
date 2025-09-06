#!/usr/bin/env node

/**
 * Admin User Setup Script for YuvaUpdate Firebase Project
 * This script creates an admin user in Firebase Auth and Firestore
 */

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');
const readline = require('readline');

// Firebase configuration for yuvaupdate-3762b
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

// Admin configuration
const ADMIN_EMAIL = 'admin@yuvaupdate.com';
const ADMIN_DISPLAY_NAME = 'YuvaUpdate Admin';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function askPassword(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    process.stdin.on('data', function(char) {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

async function checkIfAdminExists() {
  try {
    console.log('🔍 Checking if admin user already exists...');
    
    // Try to sign in with the admin email to check if it exists
    try {
      const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, 'temp-password');
      // If we get here, the user exists but password might be wrong
      console.log('⚠️  Admin user already exists in Firebase Auth');
      return true;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('✅ Admin user does not exist yet');
        return false;
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        console.log('⚠️  Admin user exists but password check failed');
        return true;
      } else {
        console.log('❌ Error checking admin user:', error.message);
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Error during admin check:', error);
    return false;
  }
}

async function createAdminUser(password) {
  try {
    console.log('🚀 Creating admin user in Firebase Auth...');
    
    const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, password);
    const user = userCredential.user;
    
    console.log('✅ Admin user created in Firebase Auth');
    console.log('   UID:', user.uid);
    console.log('   Email:', user.email);
    
    return user;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️  Admin email already exists in Firebase Auth');
      console.log('   Please use the existing account or delete it first');
      return null;
    } else {
      console.error('❌ Error creating admin user:', error.message);
      throw error;
    }
  }
}

async function createAdminProfile(user) {
  try {
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
    
    await setDoc(doc(db, 'users', user.uid), adminProfile);
    
    console.log('✅ Admin profile created in Firestore');
    console.log('   Document path: users/' + user.uid);
    console.log('   Role:', adminProfile.role);
    console.log('   isAdmin:', adminProfile.isAdmin);
    
    return adminProfile;
  } catch (error) {
    console.error('❌ Error creating admin profile:', error);
    throw error;
  }
}

async function updateExistingAdminProfile(uid) {
  try {
    console.log('🔄 Updating existing admin profile in Firestore...');
    
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const updates = {
        role: 'admin',
        isAdmin: true,
        displayName: ADMIN_DISPLAY_NAME,
        bio: 'YuvaUpdate Administrator',
        isVerified: true
      };
      
      await setDoc(userRef, updates, { merge: true });
      console.log('✅ Admin profile updated in Firestore');
    } else {
      // Create new profile
      const adminProfile = {
        uid: uid,
        email: ADMIN_EMAIL,
        displayName: ADMIN_DISPLAY_NAME,
        joinedAt: new Date(),
        isVerified: true,
        role: 'admin',
        isAdmin: true,
        bio: 'YuvaUpdate Administrator'
      };
      
      await setDoc(userRef, adminProfile);
      console.log('✅ New admin profile created in Firestore');
    }
  } catch (error) {
    console.error('❌ Error updating admin profile:', error);
    throw error;
  }
}

async function verifyAdminSetup() {
  try {
    console.log('🔍 Verifying admin setup...');
    
    // Test login with admin credentials
    const loginTest = await askQuestion('Do you want to test admin login? (y/n): ');
    if (loginTest.toLowerCase() === 'y') {
      const testPassword = await askPassword('Enter admin password to test: ');
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, testPassword);
        console.log('✅ Admin login test successful!');
        
        // Check Firestore profile
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          console.log('✅ Admin profile verified:');
          console.log('   Role:', profile.role);
          console.log('   isAdmin:', profile.isAdmin);
          console.log('   Display Name:', profile.displayName);
        } else {
          console.log('⚠️  Admin profile not found in Firestore');
        }
      } catch (error) {
        console.log('❌ Admin login test failed:', error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

async function main() {
  console.log('🔧 YuvaUpdate Admin Setup Script');
  console.log('================================');
  console.log('Firebase Project: yuvaupdate-3762b');
  console.log('Admin Email: ' + ADMIN_EMAIL);
  console.log('');
  
  try {
    // Check if admin already exists
    const adminExists = await checkIfAdminExists();
    
    if (adminExists) {
      console.log('');
      const choice = await askQuestion('Admin user already exists. What would you like to do?\n1. Update existing admin profile in Firestore\n2. Exit\nChoice (1-2): ');
      
      if (choice === '1') {
        // For existing user, we need to get their UID
        console.log('⚠️  To update an existing user, please provide their UID from Firebase Console');
        const uid = await askQuestion('Enter the existing admin user UID: ');
        if (uid.trim()) {
          await updateExistingAdminProfile(uid.trim());
          console.log('✅ Admin setup completed!');
        } else {
          console.log('❌ Invalid UID provided');
        }
      } else {
        console.log('👋 Exiting...');
      }
    } else {
      // Create new admin user
      console.log('');
      const password = await askPassword('Enter password for admin user (min 6 characters): ');
      
      if (password.length < 6) {
        console.log('❌ Password must be at least 6 characters long');
        return;
      }
      
      const user = await createAdminUser(password);
      if (user) {
        await createAdminProfile(user);
        
        console.log('');
        console.log('🎉 Admin user setup completed successfully!');
        console.log('');
        console.log('📋 Admin Details:');
        console.log('   Email: ' + ADMIN_EMAIL);
        console.log('   UID: ' + user.uid);
        console.log('   Role: admin');
        console.log('   Display Name: ' + ADMIN_DISPLAY_NAME);
        console.log('');
        console.log('🔐 You can now login to your app using:');
        console.log('   Email: ' + ADMIN_EMAIL);
        console.log('   Password: [the password you just set]');
        
        await verifyAdminSetup();
      }
    }
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n👋 Setup cancelled by user');
  rl.close();
  process.exit(0);
});

// Run the setup
main().catch(console.error);
