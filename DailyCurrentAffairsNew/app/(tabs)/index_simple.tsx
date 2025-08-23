import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Daily Current Affairs
        </ThemedText>
        
        <View style={styles.newsCard}>
          <ThemedText type="subtitle" style={styles.headline}>
            Breaking: Sample News Article
          </ThemedText>
          <ThemedText style={styles.summary}>
            This is a sample news article for testing purposes. Your Daily Current Affairs app is now running successfully!
          </ThemedText>
          <ThemedText style={styles.date}>
            August 16, 2025
          </ThemedText>
        </View>

        <View style={styles.newsCard}>
          <ThemedText type="subtitle" style={styles.headline}>
            Technology: App Development Complete
          </ThemedText>
          <ThemedText style={styles.summary}>
            The Daily Current Affairs app has been successfully built with all core features including news feed, bookmarking, sharing, and audio mode.
          </ThemedText>
          <ThemedText style={styles.date}>
            August 16, 2025
          </ThemedText>
        </View>

        <View style={styles.newsCard}>
          <ThemedText type="subtitle" style={styles.headline}>
            Features Available
          </ThemedText>
          <ThemedText style={styles.summary}>
            • Swipe-up news feed interface{'\n'}
            • Bookmark articles for later{'\n'}
            • Share articles with others{'\n'}
            • Audio mode with text-to-speech{'\n'}
            • Push notifications{'\n'}
            • Beautiful dark/light themes
          </ThemedText>
          <ThemedText style={styles.date}>
            August 16, 2025
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 28,
    fontWeight: 'bold',
  },
  newsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headline: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
    opacity: 0.8,
  },
  date: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
  },
});
