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
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const loadTimeout = useRef<any | null>(null);
  const didFallback = useRef(false);

  useEffect(() => {
    mounted.current = true;
    opener = (u: string) => {
      if (!mounted.current) return;
      setLoading(true);
  setError(null);
      setUrl(u);
      // start a fallback timeout: if WebView doesn't report load end within 8s, show error
      if (loadTimeout.current) {
        clearTimeout(loadTimeout.current);
        loadTimeout.current = null;
      }
      loadTimeout.current = setTimeout(() => {
        try {
          if (!mounted.current) return;
          setLoading(false);
          const msg = 'Load timed out';
          console.warn('InAppBrowser load timeout for', u);
          setError(msg);
          // One-time fallback: open external browser if in-app fails
          if (!didFallback.current) {
            didFallback.current = true;
            try { Linking.openURL(u).catch(()=>{}); } catch (e) {}
            setUrl(null);
          }
        } catch (e) {}
      }, 8000);
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
        <TouchableOpacity onPress={() => setUrl(null)} style={styles.headerBtn} accessibilityLabel="Close in-app browser">
          <Text style={styles.headerText}>Close</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
  <TouchableOpacity onPress={() => { if (url) { Linking.openURL(url).catch(()=>{}); } }} style={styles.headerBtn} accessibilityLabel="Open in browser">
          <Text style={styles.headerText}>Open in Browser</Text>
        </TouchableOpacity>
      </View>
      <SafeAreaView style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" />
          </View>
        )}
        {error && (
          <View style={styles.errorOverlay} pointerEvents="box-none">
            <Text style={styles.errorText}>Failed to load page: {error}</Text>
          </View>
        )}
        {url ? (
          Platform.OS === 'web' ? (
            // iframe fallback for web (Metro / npm start)
            // add onLoad/onError and key so load events reliably fire and hide the spinner
            <iframe
              key={url}
              src={url}
              style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
              title="In-App Browser"
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError('iframe failed to load'); console.warn('InAppBrowser iframe onError', url); if (!didFallback.current) { didFallback.current = true; Linking.openURL(url!).catch(()=>{}); setUrl(null); } }}
            />
          ) : (
              (NativeWebView && (
                <NativeWebView
                  style={{ flex: 1 }}
                  source={{ uri: url }}
                onLoadStart={() => { setLoading(true); setError(null); }}
                onLoadEnd={() => setLoading(false)}
                onError={(e: any) => { setLoading(false); const desc = e?.nativeEvent?.description || JSON.stringify(e?.nativeEvent); console.warn('InAppBrowser WebView error', desc); setError(desc); if (!didFallback.current) { didFallback.current = true; try { Linking.openURL(url!).catch(()=>{}); } catch (er) {} setUrl(null); } }}
                onHttpError={(e: any) => { setLoading(false); const desc = e?.nativeEvent?.statusCode ? `HTTP ${e.nativeEvent.statusCode}` : JSON.stringify(e?.nativeEvent); console.warn('InAppBrowser WebView httpError', desc); setError(desc); if (!didFallback.current) { didFallback.current = true; try { Linking.openURL(url!).catch(()=>{}); } catch (er) {} setUrl(null); } }}
                  startInLoadingState={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  mixedContentMode={"always"}
                  originWhitelist={["*"]}
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
  header: { height: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1, borderColor: 'rgba(0,0,0,0.06)' },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  headerText: { fontWeight: '700', color: '#007AFF' },
  loadingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  errorOverlay: { position: 'absolute', left: 12, right: 12, top: 12, padding: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 60 },
  errorText: { color: '#b00020', fontWeight: '600' }
});
