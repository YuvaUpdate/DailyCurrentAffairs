import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, SafeAreaView, Linking } from 'react-native';
import FastTouchable from './FastTouchable';
import PrivacyPolicy from './policies/PrivacyPolicy';
import TermsOfService from './policies/TermsOfService';
import About from './policies/About';
import Support from './policies/Support';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function Sidebar({
  visible,
  onClose,
  isDarkMode
}: SidebarProps) {
  const [activePolicyView, setActivePolicyView] = useState<'menu' | 'privacy' | 'terms' | 'support' | 'about'>('menu');

  const handlePlayStorePress = () => {
    // TODO: Replace with actual Play Store URL when available
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.yuvaupdate';
    Linking.openURL(playStoreUrl).catch(err => {
      console.warn('Failed to open Play Store URL:', err);
    });
  };

  const theme = {
    background: isDarkMode ? '#1a1a1a' : '#ffffff',
    surface: isDarkMode ? '#2d2d2d' : '#f5f5f5',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#cccccc' : '#666666',
    border: isDarkMode ? '#404040' : '#e0e0e0',
    accent: '#007AFF',
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.sidebar, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Policies</Text>
            <FastTouchable style={styles.closeButton} onPress={onClose}>
              <Text style={[styles.closeButtonText, { color: theme.text }]}>×</Text>
            </FastTouchable>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.policiesContainer}>
              {activePolicyView === 'menu' ? (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.policiesMenu}>
                  {/* Play Store Link */}
                  <FastTouchable
                    style={[styles.playStoreButton, { backgroundColor: theme.accent, borderColor: theme.border }]}
                    onPress={handlePlayStorePress}
                  >
                    <View style={styles.playStoreTextContainer}>
                      <Text style={[styles.playStoreText]}>Download on</Text>
                      <Text style={[styles.playStoreTitle]}>Google Play</Text>
                    </View>
                    <Text style={[styles.playStoreArrow]}>→</Text>
                  </FastTouchable>

                  <Text style={[styles.policiesSectionTitle, { color: theme.text }]}>
                    Legal & Support
                  </Text>
                  <Text style={[styles.policiesSectionSubtitle, { color: theme.subText }]}>
                    Important information about our app and services
                  </Text>
                  
                  <FastTouchable
                    style={[styles.policyMenuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => setActivePolicyView('privacy')}
                  >
                    <Text style={[styles.policyMenuText, { color: theme.text }]}>Privacy Policy</Text>
                    <Text style={[styles.policyMenuArrow, { color: theme.subText }]}>→</Text>
                  </FastTouchable>

                  <FastTouchable
                    style={[styles.policyMenuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => setActivePolicyView('terms')}
                  >
                    <Text style={[styles.policyMenuText, { color: theme.text }]}>Terms of Service</Text>
                    <Text style={[styles.policyMenuArrow, { color: theme.subText }]}>→</Text>
                  </FastTouchable>

                  <FastTouchable
                    style={[styles.policyMenuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => setActivePolicyView('about')}
                  >
                    <Text style={[styles.policyMenuText, { color: theme.text }]}>About YuvaUpdate</Text>
                    <Text style={[styles.policyMenuArrow, { color: theme.subText }]}>→</Text>
                  </FastTouchable>

                  <FastTouchable
                    style={[styles.policyMenuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => setActivePolicyView('support')}
                  >
                    <Text style={[styles.policyMenuText, { color: theme.text }]}>Support & Help</Text>
                    <Text style={[styles.policyMenuArrow, { color: theme.subText }]}>→</Text>
                  </FastTouchable>
                </ScrollView>
              ) : activePolicyView === 'privacy' ? (
                <PrivacyPolicy onClose={() => setActivePolicyView('menu')} isDarkMode={isDarkMode} />
              ) : activePolicyView === 'terms' ? (
                <TermsOfService onClose={() => setActivePolicyView('menu')} isDarkMode={isDarkMode} />
              ) : activePolicyView === 'support' ? (
                <Support onClose={() => setActivePolicyView('menu')} isDarkMode={isDarkMode} />
              ) : activePolicyView === 'about' ? (
                <About onClose={() => setActivePolicyView('menu')} isDarkMode={isDarkMode} />
              ) : null}
            </View>
          </View>
        </SafeAreaView>
        
        {/* Background overlay to close */}
        <FastTouchable 
          style={styles.backgroundOverlay} 
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 9000,
  },
  sidebar: {
    width: '80%',
    maxWidth: 320,
    height: '100%',
    ...(typeof navigator !== 'undefined' && navigator.product === 'ReactNative' ? {
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    } : {
      boxShadow: '2px 0px 10px rgba(0,0,0,0.25)'
    }),
  },
  backgroundOverlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  policiesContainer: {
    flex: 1,
  },
  policiesMenu: {
    flex: 1,
    padding: 20,
  },
  policiesSectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  policiesSectionSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  policyMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  policyMenuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  policyMenuArrow: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  playStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  playStoreTextContainer: {
    flex: 1,
  },
  playStoreText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '400',
  },
  playStoreTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  playStoreArrow: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
