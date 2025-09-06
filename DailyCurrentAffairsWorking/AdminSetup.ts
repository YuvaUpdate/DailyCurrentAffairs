import { auth, db } from './firebase.config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

/**
 * Admin Setup Utility for YuvaUpdate
 * Creates admin user in Firebase Auth and Firestore
 */

const ADMIN_EMAIL = 'admin@yuvaupdate.com';
const ADMIN_DISPLAY_NAME = 'YuvaUpdate Admin';

interface AdminSetupResult {
  success: boolean;
  message: string;
  uid?: string;
  error?: string;
}

export async function createAdminUser(password: string): Promise<AdminSetupResult> {
  try {
    console.log('🚀 Creating admin user...');
    
    if (password.length < 6) {
      return {
        success: false,
        message: 'Password must be at least 6 characters long'
      };
    }

    // Try to create the user in Firebase Auth
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      console.log('✅ Admin user created in Firebase Auth');
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-in-use') {
        // User already exists, try to sign in to get UID
        try {
          userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
          console.log('⚠️  Admin user already exists, updating profile...');
        } catch (signInError: any) {
          return {
            success: false,
            message: 'Admin email already exists with different password',
            error: signInError.message
          };
        }
      } else {
        return {
          success: false,
          message: 'Failed to create admin user in Firebase Auth',
          error: authError.message
        };
      }
    }

    const user = userCredential.user;

    // Create/update admin profile in Firestore
    const adminProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: ADMIN_DISPLAY_NAME,
      joinedAt: new Date(),
      isVerified: true,
      role: 'admin' as const,
      isAdmin: true,
      bio: 'YuvaUpdate Administrator',
      photoURL: null
    };

    await setDoc(doc(db, 'users', user.uid), adminProfile, { merge: true });
    console.log('✅ Admin profile created/updated in Firestore');

    return {
      success: true,
      message: 'Admin user created successfully',
      uid: user.uid
    };

  } catch (error: any) {
    console.error('❌ Error in admin setup:', error);
    return {
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    };
  }
}

export async function verifyAdminUser(email: string, password: string): Promise<AdminSetupResult> {
  try {
    console.log('🔍 Verifying admin user...');
    
    // Try to sign in
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check Firestore profile
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      return {
        success: false,
        message: 'User profile not found in Firestore'
      };
    }

    const profile = userDoc.data();
    const isAdmin = profile.role === 'admin' || profile.isAdmin === true;

    if (!isAdmin) {
      return {
        success: false,
        message: 'User is not an admin'
      };
    }

    return {
      success: true,
      message: 'Admin user verified successfully',
      uid: user.uid
    };

  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to verify admin user',
      error: error.message
    };
  }
}

export async function updateUserToAdmin(userEmail: string): Promise<AdminSetupResult> {
  try {
    console.log('🔧 Updating user to admin...');
    
    // This requires the user to be signed in first
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        message: 'No user is currently signed in'
      };
    }

    // Check if current user is admin
    const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!currentUserDoc.exists()) {
      return {
        success: false,
        message: 'Current user profile not found'
      };
    }

    const currentProfile = currentUserDoc.data();
    const isCurrentUserAdmin = currentProfile.role === 'admin' || currentProfile.isAdmin === true;

    if (!isCurrentUserAdmin) {
      return {
        success: false,
        message: 'Only admin users can promote other users to admin'
      };
    }

    // This function would need additional implementation to find user by email
    // For now, it's a placeholder for the admin panel functionality
    
    return {
      success: true,
      message: 'User admin status updated (feature not fully implemented yet)'
    };

  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to update user admin status',
      error: error.message
    };
  }
}

// Export admin configuration
export const ADMIN_CONFIG = {
  EMAIL: ADMIN_EMAIL,
  DISPLAY_NAME: ADMIN_DISPLAY_NAME,
  REQUIRED_ADMIN_EMAILS: ['admin@yuvaupdate.com', 'admin@dailycurrentaffairs.com']
};
