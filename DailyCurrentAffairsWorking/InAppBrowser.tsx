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
  // reset one-time fallback flag for each new open attempt
  didFallback.current = false;
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
          // set an error but do not auto-open the external browser; allow the user
          // to decide by tapping 'Open in Browser' in the header.
          setError(msg);
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
        <TouchableOpacity onPress={() => {
          // clear any pending load timeout to avoid a delayed fallback opening the external browser
          if (loadTimeout.current) { clearTimeout(loadTimeout.current); loadTimeout.current = null; }
          setUrl(null);
        }} style={styles.headerBtn} accessibilityLabel="Close in-app browser">
          <Text style={styles.headerText}>Close</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {/* Removed external 'Open in Browser' button to keep links inside the app only */}
      </View>
      <SafeAreaView style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            {/* Make the loading overlay opaque so underlying UI doesn't bleed through */}
            <ActivityIndicator size="large" />
          </View>
        )}
        {error && (
          <View style={styles.errorOverlay} pointerEvents="box-none">
            <Text style={styles.errorText}>Failed to load page: {error}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity onPress={() => {
                // retry by re-setting the url which re-initializes the WebView/iframe
                setError(null);
                setLoading(true);
                // trigger a reload by toggling the url briefly
                const tmp = url;
                setUrl(null);
                setTimeout(() => { if (mounted.current) setUrl(tmp); }, 50);
              }} style={styles.errorBtn}>
                <Text style={styles.headerText}>Retry</Text>
              </TouchableOpacity>
              {/* External open removed: keep interaction inside the app only */}
            </View>
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
              onError={() => { setLoading(false); setError('iframe failed to load'); console.warn('InAppBrowser iframe onError', url); /* do not auto-open external browser */ }}
            />
          ) : (
              (NativeWebView && (
                <NativeWebView
                  style={{ flex: 1 }}
                  source={{ uri: url }}
                onLoadStart={() => { setLoading(true); setError(null); }}
                onLoadEnd={() => {
                  setLoading(false);
                  // clear any pending timeout now that load finished
                  if (loadTimeout.current) { clearTimeout(loadTimeout.current); loadTimeout.current = null; }
                }}
                onError={(e: any) => { setLoading(false); const desc = e?.nativeEvent?.description || JSON.stringify(e?.nativeEvent); console.warn('InAppBrowser WebView error', desc); setError(desc); /* do not auto-open external browser */ }}
                onHttpError={(e: any) => { setLoading(false); const desc = e?.nativeEvent?.statusCode ? `HTTP ${e.nativeEvent.statusCode}` : JSON.stringify(e?.nativeEvent); console.warn('InAppBrowser WebView httpError', desc); setError(desc); /* do not auto-open external browser */ }}
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
  ,
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  errorBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  }
});
