// Admin Setup Script
// Run this once to create the admin account in Firebase

import { authService } from './AuthService';

export const setupAdminAccount = async () => {
  try {
    // Create admin account
    const adminUser = await authService.register(
      'admin@yuvaupdate.com',
      'admin@yuvaupdate', // You can change this password
      'Admin User'
    );
    
    console.log('✅ Admin account created successfully:', adminUser);
    return adminUser;
  } catch (error: any) {
    if (error.message.includes('email-already-in-use')) {
      console.log('ℹ️ Admin account already exists');
    } else {
      console.error('❌ Error creating admin account:', error);
    }
  }
};

// Uncomment and run this line once to create the admin account
// setupAdminAccount();
