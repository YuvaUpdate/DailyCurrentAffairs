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
  if (opener) opener(url);
}

export default function InAppBrowserHost() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [useProxy, setUseProxy] = useState(false);
  const mounted = useRef(true);
  const loadTimeout = useRef<any | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Check if URL can be embedded in iframe
  const canEmbedUrl = (urlToCheck: string) => {
    try {
      const url = new URL(urlToCheck);
      // Known domains that don't allow iframe embedding
      const blockedDomains = [
        'aljazeera.com',
        'cnn.com',
        'bbc.com',
        'nytimes.com',
        'washingtonpost.com',
        'guardian.com',
        'reuters.com',
        'bloomberg.com',
        'google.com',
        'facebook.com',
        'twitter.com',
        'youtube.com'
      ];
      
      return !blockedDomains.some(domain => url.hostname.includes(domain));
    } catch {
      return false;
    }
  };

  useEffect(() => {
    mounted.current = true;
    opener = (u: string) => {
      if (!mounted.current) return;
      setLoading(true);
      setIframeError(false);
      
      // For web, always try to load directly in iframe
      if (Platform.OS === 'web') {
        // Don't pre-check for blocked domains, let iframe try to load
        setUseProxy(false);
      }
      
      setUrl(u);
      // Extended timeout for better loading success - 15 seconds instead of 8
      if (loadTimeout.current) {
        clearTimeout(loadTimeout.current);
        loadTimeout.current = null;
      }
      loadTimeout.current = setTimeout(() => {
        try {
          if (!mounted.current) return;
          setLoading(false);
          // Just finish loading without showing error, even if it takes time
        } catch (e) {}
      }, 20000);
    };
    return () => {
      mounted.current = false;
      opener = null;
      if (loadTimeout.current) { clearTimeout(loadTimeout.current); loadTimeout.current = null; }
    };
  }, []);

  return (
    <Modal visible={!!url} animationType="slide" onRequestClose={() => setUrl(null)}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          // Clear any pending load timeout
          if (loadTimeout.current) { 
            clearTimeout(loadTimeout.current); 
            loadTimeout.current = null; 
          }
          setUrl(null);
          setLoading(true);
        }} style={styles.headerBtn} accessibilityLabel="Close in-app browser">
          <Text style={styles.headerText}>✕ Close</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {url && (
            <Text style={styles.urlText} numberOfLines={1} ellipsizeMode="middle">
              {url}
            </Text>
          )}
        </View>
        {Platform.OS === 'web' && url && (
          <TouchableOpacity 
            onPress={() => window.open(url, '_blank')} 
            style={styles.headerBtn}
            accessibilityLabel="Open in new tab"
          >
            <Text style={styles.headerText}>↗ New Tab</Text>
          </TouchableOpacity>
        )}
      </View>
      <SafeAreaView style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
        {url ? (
          Platform.OS === 'web' ? (
            !iframeError ? (
              // Try iframe first, with error handling for X-Frame-Options
              <iframe
                ref={iframeRef}
                key={url}
                src={url}
                style={{ 
                  flex: 1, 
                  width: '100%', 
                  height: '100%', 
                  border: 'none',
                  backgroundColor: '#ffffff',
                  borderRadius: '0px'
                }}
                title="In-App Browser"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads allow-modals"
                loading="eager"
                allowFullScreen
                onLoad={(e) => {
                  setLoading(false);
                  if (loadTimeout.current) { 
                    clearTimeout(loadTimeout.current); 
                    loadTimeout.current = null; 
                  }
                  
                  // Check if iframe actually loaded content
                  try {
                    const iframe = e.target as HTMLIFrameElement;
                    // If we can't access the iframe content, it might be blocked
                    setTimeout(() => {
                      try {
                        if (iframe.contentDocument === null) {
                          setIframeError(true);
                        }
                      } catch (error) {
                        // Cross-origin restriction - this is expected for external sites
                        // Don't treat this as an error
                      }
                    }, 1000);
                  } catch (error) {
                    // Silently handle - this is normal for cross-origin iframes
                  }
                }}
                onError={() => { 
                  setLoading(false);
                  setIframeError(true);
                  if (loadTimeout.current) { 
                    clearTimeout(loadTimeout.current); 
                    loadTimeout.current = null; 
                  }
                }}
              />
            ) : (
              // Enhanced fallback with multiple options
              <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackTitle}>🔗 External Link</Text>
                <Text style={styles.fallbackMessage}>
                  This website cannot be displayed within the app due to security restrictions.
                </Text>
                <Text style={styles.fallbackUrl} numberOfLines={2} ellipsizeMode="middle">
                  {url}
                </Text>
                
                <View style={styles.fallbackButtons}>
                  <TouchableOpacity 
                    style={styles.fallbackButton}
                    onPress={() => {
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <Text style={styles.fallbackButtonText}>🚀 Open in New Tab</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.fallbackButton, styles.fallbackButtonSecondary]}
                    onPress={() => {
                      navigator.clipboard?.writeText(url);
                      // You could show a toast here if you have a toast component
                    }}
                  >
                    <Text style={[styles.fallbackButtonText, styles.fallbackButtonSecondaryText]}>📋 Copy Link</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.fallbackButton, styles.fallbackButtonSecondary]}
                    onPress={() => {
                      // Try to reload iframe
                      setIframeError(false);
                      setLoading(true);
                      setUseProxy(false);
                    }}
                  >
                    <Text style={[styles.fallbackButtonText, styles.fallbackButtonSecondaryText]}>🔄 Try Again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : (
              (NativeWebView && (
                <NativeWebView
                  style={{ flex: 1 }}
                  source={{ uri: url }}
                  onLoadStart={() => { setLoading(true); }}
                  onLoadEnd={() => {
                    setLoading(false);
                    // Clear timeout on successful load
                    if (loadTimeout.current) { 
                      clearTimeout(loadTimeout.current); 
                      loadTimeout.current = null; 
                    }
                  }}
                  onError={(e: any) => { 
                    setLoading(false); 
                    // Silently handle errors without showing error message
                  }}
                  onHttpError={(e: any) => { 
                    setLoading(false); 
                    // Silently handle HTTP errors without showing error message
                  }}
                  // Performance optimizations
                  startInLoadingState={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  mixedContentMode={"always"}
                  originWhitelist={["*"]}
                  cacheEnabled={true}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  allowsFullscreenVideo={true}
                  // Additional performance settings
                  androidHardwareAccelerationDisabled={false}
                  androidLayerType="hardware"
                  scalesPageToFit={true}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  // Faster rendering
                  renderToHardwareTextureAndroid={true}
                  overScrollMode="never"
                />
              ))
          )
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    height: 56, 
    paddingHorizontal: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1, 
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerBtn: { 
    paddingHorizontal: 8, 
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(0,122,255,0.1)'
  },
  headerText: { 
    fontWeight: '600', 
    color: '#007AFF',
    fontSize: 14
  },
  urlText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    maxWidth: '90%'
  },
  loadingOverlay: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    top: 0, 
    bottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 50,
    backgroundColor: 'rgba(255,255,255,0.95)'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500'
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa'
  },
  fallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
    textAlign: 'center'
  },
  fallbackMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22
  },
  fallbackUrl: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
    fontFamily: 'monospace'
  },
  fallbackButtons: {
    width: '100%',
    maxWidth: 300,
    gap: 12
  },
  fallbackButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center'
  },
  fallbackButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  fallbackButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  fallbackButtonSecondaryText: {
    color: '#007AFF'
  }
});
