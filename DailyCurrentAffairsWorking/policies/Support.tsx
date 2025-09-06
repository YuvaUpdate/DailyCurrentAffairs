import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import FastTouchable from '../FastTouchable';

interface SupportProps {
  onClose: () => void;
  isDarkMode: boolean;
}

export default function Support({ onClose, isDarkMode }: SupportProps) {
  const theme = {
    background: isDarkMode ? '#1a1a1a' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#cccccc' : '#666666',
    accent: '#667eea',
    border: isDarkMode ? '#444444' : '#e0e0e0',
    surface: isDarkMode ? '#2d2d2d' : '#f5f5f5',
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:hr.jogenroy@gmail.com?subject=YuvaUpdate Support Request');
  };

  const handlePhoneSupport = () => {
    Linking.openURL('tel:+918011418040');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Support & Help</Text>
        <FastTouchable onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { color: theme.text }]}>×</Text>
        </FastTouchable>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>Get Help</Text>
          {'\n\n'}
          Need assistance with YuvaUpdate? We're here to help! Find answers to common questions below or contact our support team.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {'\n\n'}
          <Text style={styles.faqQuestion}>Q: How do I save articles to read later?</Text>
          {'\n'}
          A: Tap the heart icon on any article card to bookmark it. You can view all saved articles in the sidebar under "Saved".
          {'\n\n'}
          <Text style={styles.faqQuestion}>Q: Can I customize my news categories?</Text>
          {'\n'}
          A: Yes! Use the sidebar to filter articles by categories like Politics, Technology, Sports, and more.
          {'\n\n'}
          <Text style={styles.faqQuestion}>Q: How often is the news updated?</Text>
          {'\n'}
          A: Our news feed is updated continuously throughout the day. Pull down on the main screen to refresh and get the latest articles.
          {'\n\n'}
          <Text style={styles.faqQuestion}>Q: Why am I not receiving notifications?</Text>
          {'\n'}
          A: Make sure notifications are enabled in your device settings for YuvaUpdate. You can also check the app's notification preferences.
          {'\n\n'}
          <Text style={styles.faqQuestion}>Q: How do I switch between light and dark mode?</Text>
          {'\n'}
          A: Tap the theme toggle button (sun/moon icon) in the top right corner of the main screen.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>Contact Us – Yuva Update</Text>
          {'\n\n'}
          If you have any questions, suggestions, or business inquiries, please feel free to reach out to us:
        </Text>

        <FastTouchable 
          style={[styles.contactButton, { backgroundColor: theme.accent }]}
          onPress={handleEmailSupport}
        >
          <Text style={styles.contactButtonText}>Email Us</Text>
        </FastTouchable>

        <FastTouchable 
          style={[styles.contactButton, { backgroundColor: theme.accent, marginTop: 8 }]}
          onPress={handlePhoneSupport}
        >
          <Text style={styles.contactButtonText}>Call Us</Text>
        </FastTouchable>

        <Text style={[styles.contactInfo, { color: theme.subText }]}>
          Email: hr.jogenroy@gmail.com
          {'\n'}
          Phone: +918011418040
          {'\n'}
          Address: Tezpur, Assam, India
          {'\n\n'}
          Response time: Within 24 hours
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>App Information</Text>
          {'\n\n'}
          • Version: 1.0.0
          {'\n\n'}
          • Developer: YuvaUpdate Team
          {'\n\n'}
          • Platform: iOS & Android
          {'\n\n'}
          • Last Updated: September 2025
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>Feedback</Text>
          {'\n\n'}
          Your feedback helps us improve YuvaUpdate. Share your suggestions, report bugs, or let us know what features you'd like to see next.
          {'\n\n'}
          We read every message and appreciate your input in making YuvaUpdate the best news app for current affairs.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          {'\n\n'}
          <Text style={styles.faqQuestion}>App is running slowly:</Text>
          {'\n'}
          • Close and restart the app
          {'\n'}
          • Check your internet connection
          {'\n'}
          • Free up device storage space
          {'\n\n'}
          <Text style={styles.faqQuestion}>Articles not loading:</Text>
          {'\n'}
          • Pull down to refresh the feed
          {'\n'}
          • Check your internet connection
          {'\n'}
          • Try switching between WiFi and mobile data
          {'\n\n'}
          <Text style={styles.faqQuestion}>Login issues:</Text>
          {'\n'}
          • Verify your email and password
          {'\n'}
          • Check for typing errors
          {'\n'}
          • Use the "Forgot Password" option if needed
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
  section: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  faqQuestion: {
    fontWeight: '600',
  },
  contactButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  bottomPadding: {
    height: 40,
  },
});
