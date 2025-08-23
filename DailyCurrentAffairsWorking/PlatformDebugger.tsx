import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';

export default function PlatformDebugger() {
  const [debugInfo, setDebugInfo] = useState<string>('');

  const runPlatformTest = () => {
    const info = {
      platform: Platform.OS,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      isWeb: Platform.OS === 'web',
      timestamp: new Date().toISOString(),
      location: typeof window !== 'undefined' ? window.location.href : 'N/A',
    };

    console.log('🔍 Platform Debug Info:', info);
    setDebugInfo(JSON.stringify(info, null, 2));
    
    Alert.alert(
      '🔍 Platform Info', 
      `Platform: ${info.platform}\nIs Web: ${info.isWeb}\nCheck console for full details`
    );
  };

  const testConsoleLogging = () => {
    console.log('🟢 INFO: This is an info log');
    console.warn('🟡 WARN: This is a warning log');
    console.error('🔴 ERROR: This is an error log');
    console.debug('🔵 DEBUG: This is a debug log');
    
    Alert.alert(
      '📝 Console Test', 
      'Check your browser console (F12) or terminal for colored log messages!'
    );
  };

  const testWebSpecificFeatures = () => {
    if (Platform.OS === 'web') {
      try {
        // Test if we can access web-specific APIs
        const hasFile = typeof File !== 'undefined';
        const hasFileReader = typeof FileReader !== 'undefined';
        const hasFormData = typeof FormData !== 'undefined';
        const hasBlob = typeof Blob !== 'undefined';
        
        const webFeatures = {
          File: hasFile,
          FileReader: hasFileReader,
          FormData: hasFormData,
          Blob: hasBlob,
          localStorage: typeof localStorage !== 'undefined',
          sessionStorage: typeof sessionStorage !== 'undefined',
        };
        
        console.log('🌐 Web Features Available:', webFeatures);
        
        Alert.alert(
          '🌐 Web Features',
          `File: ${hasFile}\nFileReader: ${hasFileReader}\nFormData: ${hasFormData}\nBlob: ${hasBlob}`
        );
        
      } catch (error) {
        console.error('❌ Web feature test error:', error);
        Alert.alert('❌ Error', 'Web feature test failed - check console');
      }
    } else {
      Alert.alert('📱 Mobile Platform', 'This test is for web platform only');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Platform Debugger</Text>
      
      <TouchableOpacity style={styles.button} onPress={runPlatformTest}>
        <Text style={styles.buttonText}>🔍 Test Platform Info</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={testConsoleLogging}>
        <Text style={styles.buttonText}>📝 Test Console Logs</Text>
      </TouchableOpacity>
      
      {Platform.OS === 'web' && (
        <TouchableOpacity style={[styles.button, styles.webButton]} onPress={testWebSpecificFeatures}>
          <Text style={styles.buttonText}>🌐 Test Web Features</Text>
        </TouchableOpacity>
      )}
      
      {debugInfo ? (
        <View style={styles.debugInfo}>
          <Text style={styles.debugTitle}>Debug Info:</Text>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
  webButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  debugInfo: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 5,
  },
  debugTitle: {
    color: '#10b981',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
  },
});
