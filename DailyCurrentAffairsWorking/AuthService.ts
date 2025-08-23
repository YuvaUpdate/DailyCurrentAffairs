import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase.config';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  joinedAt: Date;
  isVerified: boolean;
  role?: 'user' | 'admin'; // Add role field
  isAdmin?: boolean; // Add admin flag for backward compatibility
}

class AuthService {
  // Register new user
  async register(email: string, password: string, displayName: string): Promise<UserProfile> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, { displayName });

      // Check if this is an admin email
      const adminEmails = ['admin@yuvaupdate.com', 'admin@dailycurrentaffairs.com'];
      const isAdminEmail = adminEmails.includes(email.toLowerCase());

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName,
        joinedAt: new Date(),
        isVerified: false,
        role: isAdminEmail ? 'admin' : 'user',
        isAdmin: isAdminEmail
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      console.log('✅ User registered successfully:', userProfile);
      return userProfile;
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Login user
  async login(email: string, password: string): Promise<UserProfile> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user profile from Firestore
      const userProfile = await this.getUserProfile(user.uid);
      
      console.log('✅ User logged in successfully:', userProfile);
      return userProfile;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // If it's admin credentials and account doesn't exist, create it
      if (error.code === 'auth/invalid-credential' && email === 'admin@yuvaupdate.com') {
        console.log('🔧 Admin account not found. Creating admin account...');
        try {
          const adminUser = await this.register(email, password, 'Admin User');
          console.log('✅ Admin account created successfully');
          return adminUser;
        } catch (registerError: any) {
          console.error('❌ Failed to create admin account:', registerError);
          throw new Error('Failed to create admin account: ' + this.getErrorMessage(registerError.code));
        }
      }
      
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      console.log('✅ User logged out successfully');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      throw new Error('Failed to logout');
    }
  }

  // Get user profile
  async getUserProfile(uid: string): Promise<UserProfile> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        
        // Check if user should have admin role based on email
        const adminEmails = ['admin@yuvaupdate.com', 'admin@dailycurrentaffairs.com'];
        const isAdminEmail = adminEmails.includes(userData.email.toLowerCase());
        
        // Update admin status if needed
        if (isAdminEmail && (!userData.role || userData.role !== 'admin')) {
          const updates = {
            role: 'admin' as const,
            isAdmin: true
          };
          await this.updateUserProfile(uid, updates);
          return { ...userData, ...updates };
        }
        
        return userData;
      } else {
        throw new Error('User profile not found');
      }
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      throw error;
    }
  }

  // Check if user has admin access
  isAdminUser(userProfile: UserProfile | null): boolean {
    if (!userProfile) return false;
    return userProfile.role === 'admin' || userProfile.isAdmin === true;
  }

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), updates);
      console.log('✅ User profile updated successfully');
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Check if username is available
  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'users'),
        where('displayName', '==', username)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('❌ Error checking username availability:', error);
      return false;
    }
  }

  // Auth state listener
  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Error message helper
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Email is already registered. Please use a different email or login.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

export const authService = new AuthService();
