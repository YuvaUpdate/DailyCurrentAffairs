import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import FastTouchable from '../FastTouchable';

interface PrivacyPolicyProps {
  onClose: () => void;
  isDarkMode: boolean;
}

export default function PrivacyPolicy({ onClose, isDarkMode }: PrivacyPolicyProps) {
  const theme = {
    background: isDarkMode ? '#1a1a1a' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#cccccc' : '#666666',
    accent: '#667eea',
    border: isDarkMode ? '#444444' : '#e0e0e0',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy Policy</Text>
        <FastTouchable onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { color: theme.text }]}>×</Text>
        </FastTouchable>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: theme.subText }]}>
          Last updated: September 6, 2025
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          {'\n\n'}
          YuvaUpdate collects information to provide better services to our users. We collect information in the following ways:
          {'\n\n'}
          • Account Information: When you create an account, we collect your email address and display name.
          {'\n\n'}
          • Usage Information: We collect information about how you use our app, including articles you read and categories you prefer.
          {'\n\n'}
          • Device Information: We collect device-specific information such as your device model, operating system version, and unique device identifiers.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>2. How We Use Information</Text>
          {'\n\n'}
          We use the information we collect to:
          {'\n\n'}
          • Provide, maintain, and improve our services
          {'\n\n'}
          • Personalize content based on your interests
          {'\n\n'}
          • Send you relevant notifications about news updates
          {'\n\n'}
          • Ensure the security and integrity of our services
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          {'\n\n'}
          We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following cases:
          {'\n\n'}
          • To comply with legal obligations
          {'\n\n'}
          • To protect and defend our rights and property
          {'\n\n'}
          • With your explicit consent
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          {'\n\n'}
          We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes internal reviews of our data collection, storage, and processing practices.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>5. Third-Party Services</Text>
          {'\n\n'}
          Our app uses Firebase for authentication and data storage. Firebase's privacy policy applies to their handling of your data. We also use external news sources for content, and their respective privacy policies apply when you visit their websites.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          {'\n\n'}
          You have the right to:
          {'\n\n'}
          • Access your personal information
          {'\n\n'}
          • Correct inaccurate information
          {'\n\n'}
          • Delete your account and associated data
          {'\n\n'}
          • Opt-out of notifications
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
          {'\n\n'}
          Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
          {'\n\n'}
          We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>9. Contact Us – Yuva Update</Text>
          {'\n\n'}
          If you have any questions, suggestions, or business inquiries about this privacy policy, please feel free to reach out to us:
          {'\n\n'}
          Email: hr.jogenroy@gmail.com
          {'\n'}
          Phone: +918011418040
          {'\n'}
          Address: Tezpur, Assam, India
          {'\n\n'}
          We will respond to your inquiry within 24 hours.
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
  lastUpdated: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 16,
    marginBottom: 24,
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
  bottomPadding: {
    height: 40,
  },
});
