import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform, Linking, SafeAreaView } from 'react-native';
// Import WebView lazily only on native platforms where it's supported
let NativeWebView: any = null;
if (Platform.OS !== 'web') {
  try { NativeWebView = require('react-native-webview').WebView; } catch (e) { NativeWebView = null; }
}

// Enable WebView remote debugging on Android so we can inspect the WebView from chrome://inspect
try {
  if (Platform.OS === 'android' && NativeWebView && typeof NativeWebView.setWebContentsDebuggingEnabled === 'function') {
    try { NativeWebView.setWebContentsDebuggingEnabled(true); } catch (e) { /* non-fatal */ }
  }
} catch (e) {
  // ignore
}

let opener: ((url: string) => void) | null = null;

export function showInApp(url: string) {
  // On web platform, open links externally instead of in-app
  if (Platform.OS === 'web') {
    // Open in new tab/window for web
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback if window is not available
      Linking.openURL(url).catch(err => console.warn('Failed to open URL:', err));
    }
    return;
  }
  
  // For native platforms (Android/iOS), use the in-app browser
  if (opener) opener(url);
}

export default function InAppBrowserHost() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const loadTimeout = useRef<any | null>(null);
  const didFallback = useRef(false);

  useEffect(() => {
    mounted.current = true;
    opener = (u: string) => {
      if (!mounted.current) return;
      // For web platform, links are handled externally in showInApp function
      if (Platform.OS === 'web') {
        return;
      }
      
      // Reset state for new URL
      didFallback.current = false;
      setLoading(true);
      setError(null);
      setUrl(u);
      
      // Shorter timeout for faster UX - reduce to 1.5s for quick loading perception
      if (loadTimeout.current) {
        clearTimeout(loadTimeout.current);
        loadTimeout.current = null;
      }
      loadTimeout.current = setTimeout(() => {
        try {
          if (!mounted.current) return;
          // Hide loading after short delay even if page still loading for better perceived performance
          setLoading(false);
          console.log('InAppBrowser quick load timeout for faster UX:', u);
        } catch (e) {}
      }, 1500); // 1.5 seconds for faster perceived loading
    };
    return () => {
      mounted.current = false;
      opener = null;
      if (loadTimeout.current) { clearTimeout(loadTimeout.current); loadTimeout.current = null; }
    };
  }, []);

  return Platform.OS === 'web' ? null : (
    <Modal visible={!!url} animationType="slide" onRequestClose={() => setUrl(null)}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          // clear any pending load timeout to avoid a delayed fallback opening the external browser
          if (loadTimeout.current) { clearTimeout(loadTimeout.current); loadTimeout.current = null; }
          setUrl(null);
        }} style={styles.headerBtn} accessibilityLabel="Close in-app browser">
          <Text style={styles.headerText}>Close</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {url && (
          <TouchableOpacity onPress={() => {
            // Refresh the current page
            setLoading(true);
            setError(null);
            const currentUrl = url;
            setUrl(null);
            setTimeout(() => { if (mounted.current) setUrl(currentUrl); }, 50);
          }} style={styles.headerBtn} accessibilityLabel="Refresh page">
            <Text style={styles.headerText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
      <SafeAreaView style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            {/* Faster, smaller loading indicator for better UX */}
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
        {url && NativeWebView && (
          <NativeWebView
            style={{ flex: 1 }}
            source={{ uri: url }}
            onLoadStart={() => { 
              setLoading(true); 
              setError(null); 
            }}
            onLoadProgress={(event: any) => {
              // Hide loading when page is 30% loaded for faster perceived performance
              if (event.nativeEvent.progress >= 0.3) {
                setLoading(false);
                // Clear timeout since we're showing content
                if (loadTimeout.current) { 
                  clearTimeout(loadTimeout.current); 
                  loadTimeout.current = null; 
                }
              }
            }}
            onLoadEnd={() => {
              setLoading(false);
              // clear any pending timeout now that load finished
              if (loadTimeout.current) { clearTimeout(loadTimeout.current); loadTimeout.current = null; }
            }}
            onError={(e: any) => { 
              setLoading(false); 
              // Just log errors, don't show them to user for better UX
              console.warn('InAppBrowser WebView error', e?.nativeEvent?.description); 
            }}
            onHttpError={(e: any) => { 
              setLoading(false); 
              // Just log HTTP errors, don't show them to user
              console.warn('InAppBrowser WebView httpError', e?.nativeEvent?.statusCode); 
            }}
            // Optimized settings for faster loading
            startInLoadingState={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            cacheEnabled={true}
            allowsBackForwardNavigationGestures={true}
            mixedContentMode={"always"}
            originWhitelist={["*"]}
            // Performance optimizations
            androidHardwareAccelerationDisabled={false}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            // Better rendering
            useWebKit={true}
            bounces={false}
            scrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1, borderColor: 'rgba(0,0,0,0.06)' },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  headerText: { fontWeight: '700', color: '#007AFF' },
  loadingOverlay: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    top: 0, 
    bottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.9)', // Semi-transparent background
    zIndex: 50 
  },
});
