import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native';
// Runtime shim: some compiled JS (bundle) may pass an object/map for the `edges` prop
// to the native RNCSafeAreaView which expects an array. Patch the module export at
// startup to coerce a map -> array so the native view manager receives the right
// shape and the app doesn't crash at runtime.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _safeAreaContext = require('react-native-safe-area-context');
  if (_safeAreaContext && _safeAreaContext.SafeAreaView) {
    const OriginalSafeAreaView = _safeAreaContext.SafeAreaView;
    _safeAreaContext.SafeAreaView = (props: any) => {
      try {
        const edges = props && props.edges;
        if (edges && typeof edges === 'object' && !Array.isArray(edges)) {
          // Convert map like { top: true, bottom: true } -> ['top','bottom']
          const order = ['top', 'right', 'bottom', 'left'];
          const arr = order.filter((k) => Boolean(edges[k]));
          return React.createElement(OriginalSafeAreaView, { ...props, edges: arr });
        }
      } catch (e) {
        // swallow shim errors — don't block app startup
        // console.warn('safe-area shim inner error', e);
      }
      return React.createElement(OriginalSafeAreaView, props);
    };
  }
} catch (e) {
  // If the module isn't present or something fails, ignore — nothing to patch
  // console.warn('safe-area shim failed', e);
}
import App from './App';
import { AuthScreen } from './AuthScreen';
import { authService } from './AuthService';
import { LoadingSpinner } from './LoadingSpinner';

// Custom Loading Component with animated dots
const LoadingDots = () => {
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: typeof navigator !== 'undefined' && (navigator.product !== 'ReactNative'),
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: typeof navigator !== 'undefined' && (navigator.product !== 'ReactNative'),
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

export default function AppWrapper() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // startup overlay removed to avoid duplicate logo screen.
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [articlesReady, setArticlesReady] = useState(false);

  // Track when the startup overlay was shown so we can guarantee a
  // minimum visible duration to avoid flicker when articles load very fast.
  const startupShownAt = useRef<number>(Date.now());
  const MIN_VISIBLE_MS = 1200; // keep overlay for at least 1.2s
  // We no longer force a public login flow. App will run for guests and
  // read local bookmarks from AsyncStorage. Admins can sign in via the
  // small Admin button which opens the AuthScreen as a modal.
  const [showAuth, setShowAuth] = useState(false); // kept for admin modal
  const [adminAuthVisible, setAdminAuthVisible] = useState(false);

  // Toggle to show the admin login entry in the UI. Set to false to hide.
  // You can flip this to true for debugging or admin access.
  const SHOW_ADMIN_BUTTON = false;

  useEffect(() => {
    // Start auth state observer so components (like App) can react to
    // admin sign-in events. We don't force authentication here.
    checkAuthState();
    // Extend startup fallback timeout: wait up to 15s for articles to arrive
    const fallback = setTimeout(() => {
      if (!articlesReady) setLoading(false);
    }, 15000);
    return () => clearTimeout(fallback);
  }, []);

  const checkAuthState = async () => {
    // Use the auth state listener so we reliably observe persisted sessions
    try {
      console.log('AppWrapper.checkAuthState: attaching onAuthStateChanged listener');
      const unsubscribe = authService.onAuthStateChanged((u: any) => {
        console.log('AppWrapper.onAuthStateChanged callback, user=', u);
        // Also log persisted keys for extra visibility
        AsyncStorage.getItem('ya_logged_in').then(v => console.log('AsyncStorage.ya_logged_in=', v)).catch(()=>{});
        AsyncStorage.getItem('ya_user_uid').then(v => console.log('AsyncStorage.ya_user_uid=', v)).catch(()=>{});

        // Update local user state. We won't present the public login UI
        // from this wrapper; admin login is handled via the Admin button.
        setUser(u);
        setShowAuth(false); // don't show standard auth flow here

        // IMPORTANT: do NOT hide the startup overlay here. The overlay should
        // only be dismissed when articles are available (onArticlesReady) or
        // when the global 15s fallback fires. Hiding on auth causes the
        // loader to disappear before articles are rendered on slower devices.

        // Unsubscribe immediately; re-registering is unnecessary for this wrapper
        try { if (typeof unsubscribe === 'function') unsubscribe(); } catch (e) {}
      });
    } catch (error) {
      console.log('AppWrapper.checkAuthState: Error observing auth state:', error);
      setUser(null);
      // Don't show the public auth UI from the wrapper on errors; keep guest mode
      setShowAuth(false);
      // Don't force-hide the loader here; keep waiting for articles or fallback.
    }
  };

  const handleAuthSuccess = () => {
  // Close any admin auth modal and refresh listener state
  setAdminAuthVisible(false);
  setShowAuth(false);
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
              await authService.logout();
              setUser(null);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  // Always render the main App so background fetching (cached articles,
  // Firebase subscription and auto-refresh) can run while we show a
  // startup overlay. This ensures articles are fetched even when the
  // loading spinner is visible.
  return (
    <SafeAreaView style={styles.container}>
      <App currentUser={user} onArticlesReady={() => {
        setArticlesReady(true);
        // Ensure we keep a minimum visible duration to avoid flicker,
        // then hide the wrapper-level loading state. The wrapper no
        // longer renders a logo overlay so this simply toggles loading.
        const elapsed = Date.now() - (startupShownAt.current || Date.now());
        const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
        setTimeout(() => {
          setLoading(false);
        }, remaining);
      }} />

  {/* Wrapper-level startup overlay removed to avoid duplicate logo screen. */}

      {/* Admin shortcut - hidden by default. Toggle SHOW_ADMIN_BUTTON to true to enable. */}
      {SHOW_ADMIN_BUTTON && (
        <TouchableOpacity
          style={{ position: 'absolute', right: 16, bottom: 24, backgroundColor: '#2E7D32', padding: 10, borderRadius: 24, elevation: 6 }}
          onPress={() => setAdminAuthVisible(true)}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>🔒 Admin</Text>
        </TouchableOpacity>
      )}

      {SHOW_ADMIN_BUTTON && adminAuthVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <AuthScreen
            mode={authMode}
            onAuthSuccess={handleAuthSuccess}
            onSwitchMode={setAuthMode}
          />
        </View>
      )}
    </SafeAreaView>
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 9999,
  },
  welcomeMessage: {
  backgroundColor: '#2E7D32',
  padding: 14,
  paddingTop: 24,
  paddingBottom: 14,
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
});
