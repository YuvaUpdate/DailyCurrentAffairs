import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { firebaseNewsService } from './FirebaseNewsService';

export default function FirebaseTest() {
  const testFirebaseConnection = async () => {
    try {
      console.log('[TESTING] Testing Firebase connection...');
      
      const testArticle = {
        headline: 'Test Article',
        description: 'This is a test article to verify Firebase connection',
        image: 'https://via.placeholder.com/400x300/667eea/ffffff?text=Test',
        category: 'General',
        readTime: '1 min read',
        sourceUrl: 'https://example.com/test-article'
      };
      
      console.log('[TESTING] Attempting to add test article:', testArticle);
      
      const docId = await firebaseNewsService.addArticle(testArticle);
      
      console.log('[SUCCESS] Test article added successfully with ID:', docId);
      Alert.alert('[SUCCESS]', `Firebase is working! Document ID: ${docId}`);
      
    } catch (error: any) {
      console.error('[ERROR] Firebase test failed:', error);
      Alert.alert('[ERROR]', `Firebase test failed: ${error.message || error.toString()}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Test</Text>
      <TouchableOpacity style={styles.button} onPress={testFirebaseConnection}>
        <Text style={styles.buttonText}>Test Firebase</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
