import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import FastTouchable from '../FastTouchable';

interface AboutProps {
  onClose: () => void;
  isDarkMode: boolean;
}

export default function About({ onClose, isDarkMode }: AboutProps) {
  const theme = {
    background: isDarkMode ? '#1a1a1a' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#cccccc' : '#666666',
    accent: '#667eea',
    border: isDarkMode ? '#444444' : '#e0e0e0',
    surface: isDarkMode ? '#2d2d2d' : '#f5f5f5',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>About YuvaUpdate</Text>
        <FastTouchable onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { color: theme.text }]}>×</Text>
        </FastTouchable>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoWrapper, { backgroundColor: isDarkMode ? '#ffffff' : 'transparent' }]}>
            <Image 
              source={require('../assets/favicon.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>YuvaUpdate</Text>
          <Text style={[styles.version, { color: theme.subText }]}>Version 1.0.0</Text>
        </View>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          {'\n\n'}
          YuvaUpdate is dedicated to keeping young minds informed about current affairs and important news that shapes our world. We believe that staying informed is the first step toward making a positive impact in society.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>What We Offer</Text>
          {'\n\n'}
          • <Text style={styles.highlight}>Curated News:</Text> Hand-picked articles from reliable sources across various categories
          {'\n\n'}
          • <Text style={styles.highlight}>Current Affairs:</Text> Stay updated with the latest developments in politics, technology, sports, and more
          {'\n\n'}
          • <Text style={styles.highlight}>Clean Interface:</Text> Distraction-free reading experience with intuitive navigation
          {'\n\n'}
          • <Text style={styles.highlight}>Personalization:</Text> Save articles, filter by categories, and customize your news feed
          {'\n\n'}
          • <Text style={styles.highlight}>Real-time Updates:</Text> Get the latest news as it happens with push notifications
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          {'\n\n'}
          📱 <Text style={styles.featureTitle}>Cross-platform:</Text> Available on both iOS and Android
          {'\n\n'}
          🌙 <Text style={styles.featureTitle}>Dark Mode:</Text> Easy on the eyes with light and dark themes
          {'\n\n'}
          💾 <Text style={styles.featureTitle}>Offline Reading:</Text> Save articles to read even without internet
          {'\n\n'}
          🔔 <Text style={styles.featureTitle}>Smart Notifications:</Text> Get notified about breaking news and updates
          {'\n\n'}
          🏷️ <Text style={styles.featureTitle}>Category Filters:</Text> Focus on topics that matter to you
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>Our Values</Text>
          {'\n\n'}
          • <Text style={styles.highlight}>Accuracy:</Text> We prioritize reliable and fact-checked information
          {'\n\n'}
          • <Text style={styles.highlight}>Transparency:</Text> Clear sourcing and attribution for all content
          {'\n\n'}
          • <Text style={styles.highlight}>Privacy:</Text> Your data is protected and never shared without consent
          {'\n\n'}
          • <Text style={styles.highlight}>Accessibility:</Text> News should be accessible to everyone, everywhere
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>Technology</Text>
          {'\n\n'}
          YuvaUpdate is built with modern technology to ensure a fast, secure, and reliable experience:
          {'\n\n'}
          • React Native for cross-platform compatibility
          {'\n\n'}
          • Firebase for real-time data and authentication
          {'\n\n'}
          • Optimized performance for smooth scrolling and quick loading
          {'\n\n'}
          • Secure data transmission and storage
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>Contact Us – Yuva Update</Text>
          {'\n\n'}
          If you have any questions, suggestions, or business inquiries, please feel free to reach out to us:
          {'\n\n'}
          Email: hr.jogenroy@gmail.com
          {'\n'}
          Phone: +918011418040
          {'\n'}
          Address: Tezpur, Assam, India
          {'\n\n'}
          We typically respond within 24 hours and value every piece of feedback from our users.
        </Text>

        <Text style={[styles.copyright, { color: theme.subText }]}>
          © 2025 YuvaUpdate. All rights reserved.
          {'\n\n'}
          Thank you for choosing YuvaUpdate to stay informed about the world around you. Together, let's build a more informed and engaged community.
        </Text>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    padding: 8,
    marginBottom: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
  },
  section: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  highlight: {
    fontWeight: '600',
  },
  featureTitle: {
    fontWeight: '600',
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
    marginBottom: 10,
  },
  bottomPadding: {
    height: 40,
  },
});
