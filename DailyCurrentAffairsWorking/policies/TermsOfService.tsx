import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import FastTouchable from '../FastTouchable';

interface TermsOfServiceProps {
  onClose: () => void;
  isDarkMode: boolean;
}

export default function TermsOfService({ onClose, isDarkMode }: TermsOfServiceProps) {
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Terms of Service</Text>
        <FastTouchable onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { color: theme.text }]}>×</Text>
        </FastTouchable>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lastUpdated, { color: theme.subText }]}>
          Last updated: September 6, 2025
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          {'\n\n'}
          By downloading, installing, or using the YuvaUpdate mobile application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          {'\n\n'}
          YuvaUpdate is a news aggregation mobile application that provides current affairs and news content to users. We curate and present news from various sources to keep you informed about current events.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          {'\n\n'}
          • You may create an account to access additional features
          {'\n\n'}
          • You are responsible for maintaining the confidentiality of your account credentials
          {'\n\n'}
          • You must provide accurate and complete information when creating an account
          {'\n\n'}
          • You are responsible for all activities that occur under your account
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>4. Acceptable Use</Text>
          {'\n\n'}
          You agree not to:
          {'\n\n'}
          • Use the service for any unlawful purpose or in violation of these terms
          {'\n\n'}
          • Attempt to gain unauthorized access to our systems or networks
          {'\n\n'}
          • Interfere with or disrupt the service or servers
          {'\n\n'}
          • Use automated systems to access the service without permission
          {'\n\n'}
          • Violate any applicable local, state, national, or international law
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>5. Content and Intellectual Property</Text>
          {'\n\n'}
          • News content is sourced from third-party providers and remains the property of the respective publishers
          {'\n\n'}
          • The YuvaUpdate application design, features, and functionality are owned by us
          {'\n\n'}
          • You may not reproduce, distribute, or create derivative works from our content without permission
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>6. Third-Party Content</Text>
          {'\n\n'}
          Our service displays content from third-party news sources. We do not endorse or take responsibility for the accuracy, completeness, or reliability of third-party content. Users access external links at their own discretion.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>7. Privacy</Text>
          {'\n\n'}
          Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>8. Disclaimers</Text>
          {'\n\n'}
          • The service is provided "as is" without warranties of any kind
          {'\n\n'}
          • We do not guarantee the accuracy, completeness, or timeliness of news content
          {'\n\n'}
          • We are not responsible for any decisions made based on information from our service
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          {'\n\n'}
          To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>10. Termination</Text>
          {'\n\n'}
          We may terminate or suspend your access to the service at any time, with or without cause, and with or without notice. You may also terminate your account at any time.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
          {'\n\n'}
          We reserve the right to modify these terms at any time. We will notify users of significant changes through the app or by email. Continued use of the service after changes constitutes acceptance of the new terms.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>12. Governing Law</Text>
          {'\n\n'}
          These terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved through appropriate legal channels.
        </Text>

        <Text style={[styles.section, { color: theme.text }]}>
          <Text style={styles.sectionTitle}>13. Contact Us – Yuva Update</Text>
          {'\n\n'}
          If you have any questions, suggestions, or business inquiries about these Terms of Service, please feel free to reach out to us:
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
