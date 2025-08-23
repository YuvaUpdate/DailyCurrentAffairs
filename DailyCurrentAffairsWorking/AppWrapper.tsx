import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import App from './App';
import { AuthScreen } from './AuthScreen';
import { authService } from './AuthService';

// Custom Loading Component with animated dots
const LoadingDots = () => {
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, { opacity }]} />
      <Animated.View style={[styles.dot, { opacity, transform: [{ scale: animatedValue }] }]} />
      <Animated.View style={[styles.dot, { opacity }]} />
    </View>
  );
};

import { getTheme } from './theme';

export default function AppWrapper() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showAuth, setShowAuth] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isDarkMode] = useState(false);

  const theme = getTheme(isDarkMode);

  useEffect(() => {
    checkFirstLaunch();
    
    // Set up Firebase auth state listener
    const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('🔥 Firebase auth state changed:', firebaseUser ? { email: firebaseUser.email, uid: firebaseUser.uid } : 'null');
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('🔥 Current states - user:', !!user, 'showAuth:', showAuth, 'loading:', loading);
      
      if (firebaseUser) {
        // User is logged in - save auth state to AsyncStorage as backup
        saveAuthState(firebaseUser);
        setUser(firebaseUser);
        setShowAuth(false);
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[SUCCESS] User authenticated, hiding auth screen');
      } else {
        // User is logged out - clear auth state from AsyncStorage
        clearAuthState();
        setUser(null);
        setShowAuth(true);
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[INFO] User logged out, showing auth screen');
      }
      setLoading(false);
      
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('🔥 After update - user:', !!firebaseUser, 'showAuth:', !firebaseUser);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasLaunchedBefore = await AsyncStorage.getItem('hasLaunchedBefore');
      if (!hasLaunchedBefore) {
        setIsFirstLaunch(true);
        setShowAuth(true); // Force authentication on first launch
        await AsyncStorage.setItem('hasLaunchedBefore', 'true');
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('🆕 First launch detected, showing auth screen');
      } else {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('🔄 Not first launch, auth state will be handled by listener');
      }
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[ERROR] Error checking first launch:', error);
    }
  };

  // Save auth state to AsyncStorage as backup
  const saveAuthState = async (user: any) => {
    try {
      await AsyncStorage.setItem('authState', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        timestamp: Date.now()
      }));
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('💾 Auth state saved to AsyncStorage');
    } catch (error) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[ERROR] Error saving auth state:', error);
    }
  };

  // Clear auth state from AsyncStorage
  const clearAuthState = async () => {
    try {
      await AsyncStorage.removeItem('authState');
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('🗑️ Auth state cleared from AsyncStorage');
    } catch (error) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[ERROR] Error clearing auth state:', error);
    }
  };

  const checkAuthState = async () => {
    try {
      const currentUser = authService.getCurrentUser();
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[DEBUG] AppWrapper - checkAuthState - currentUser:', currentUser);
      setUser(currentUser);
      
      // If no user is logged in, show auth screen
      if (!currentUser) {
        setShowAuth(true);
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('👤 No user found, showing auth screen');
      } else {
        setShowAuth(false);
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('✅ User found, hiding auth screen');
      }
    } catch (error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('❌ Error checking auth state:', error);
      setUser(null);
      setShowAuth(true); // Always show auth on error
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    setIsFirstLaunch(false); // Reset first launch flag after successful auth
    checkAuthState();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('🔄 Starting logout process...');
              
              // Clear auth state from AsyncStorage first
              await clearAuthState();
              
              // Then logout from Firebase
              await authService.logout();
              
              // Force update the UI state immediately
              setUser(null);
              setShowAuth(true);
              
              if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('✅ Firebase logout completed, forced UI update');
              // Auth state listener will also handle UI updates
            } catch (error: any) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', error.message || 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }] }>
          <View style={[styles.brandCard, { backgroundColor: theme.surface, shadowColor: theme.subtleShadow }]}> 
            <Text style={[styles.brandTitle, { color: theme.text }]}>YuvaUpdate</Text>
            <Text style={[styles.brandSubtitle, { color: theme.subText }]}>Latest news, simply delivered</Text>
          </View>
          <LoadingDots />
          <Text style={[styles.loadingText, { color: theme.subText }]}>Loading YuvaUpdate...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (showAuth) {
    return (
      <SafeAreaProvider>
        <View style={[styles.authContainer, { backgroundColor: theme.background }] }>
          {isFirstLaunch && (
            <View style={[styles.welcomeMessage, { backgroundColor: theme.accent }] }>
              <Text style={[styles.welcomeTitle, { color: '#fff' }]}>Welcome to YuvaUpdate!</Text>
              <Text style={[styles.welcomeText, { color: '#fff' }]}>Please create an account or login to get started with the latest news and updates.</Text>
            </View>
          )}
          <AuthScreen
            mode={authMode}
            onAuthSuccess={handleAuthSuccess}
            onSwitchMode={setAuthMode}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
  {/* Main App - Pass user and logout function */}
  <App currentUser={user} onLogout={handleLogout} />
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  userHeader: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#C8E6C9',
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  guestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2E7D32',
    marginHorizontal: 4,
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  welcomeMessage: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
  },
  brandCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    width: '80%'
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
});
