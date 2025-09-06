import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import FastTouchable from './FastTouchable';
import { createAdminUser, verifyAdminUser, ADMIN_CONFIG } from './AdminSetup';

interface AdminSetupComponentProps {
  onClose: () => void;
  isDarkMode?: boolean;
}

export default function AdminSetupComponent({ onClose, isDarkMode = false }: AdminSetupComponentProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'verify'>('create');

  const theme = {
    background: isDarkMode ? '#1a1a1a' : '#ffffff',
    surface: isDarkMode ? '#2d2d2d' : '#f5f5f5',
    text: isDarkMode ? '#ffffff' : '#000000',
    subText: isDarkMode ? '#cccccc' : '#666666',
    accent: '#667eea',
    border: isDarkMode ? '#444444' : '#e0e0e0',
    error: '#ff6b6b',
    success: '#51cf66'
  };

  const handleCreateAdmin = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const result = await createAdminUser(password);
      
      if (result.success) {
        Alert.alert(
          'Success',
          `Admin user created successfully!\n\nEmail: ${ADMIN_CONFIG.EMAIL}\nUID: ${result.uid}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setPassword('');
                setConfirmPassword('');
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to create admin user');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAdmin = async () => {
    if (!verifyEmail || !verifyPassword) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyAdminUser(verifyEmail, verifyPassword);
      
      if (result.success) {
        Alert.alert(
          'Success',
          `Admin user verified successfully!\n\nUID: ${result.uid}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setVerifyEmail('');
                setVerifyPassword('');
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to verify admin user');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Admin Setup</Text>
        <FastTouchable onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { color: theme.text }]}>×</Text>
        </FastTouchable>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
        <FastTouchable
          style={[
            styles.tab,
            { backgroundColor: activeTab === 'create' ? theme.accent : 'transparent' }
          ]}
          onPress={() => setActiveTab('create')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'create' ? '#ffffff' : theme.text }
          ]}>
            Create Admin
          </Text>
        </FastTouchable>
        <FastTouchable
          style={[
            styles.tab,
            { backgroundColor: activeTab === 'verify' ? theme.accent : 'transparent' }
          ]}
          onPress={() => setActiveTab('verify')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'verify' ? '#ffffff' : theme.text }
          ]}>
            Verify Admin
          </Text>
        </FastTouchable>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'create' ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Create Admin User
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>
              This will create an admin user with email: {ADMIN_CONFIG.EMAIL}
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter admin password (min 6 characters)"
                placeholderTextColor={theme.subText}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm admin password"
                placeholderTextColor={theme.subText}
              />
            </View>

            <FastTouchable
              style={[styles.button, { backgroundColor: theme.accent }]}
              onPress={handleCreateAdmin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Create Admin User</Text>
              )}
            </FastTouchable>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Verify Admin User
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.subText }]}>
              Test admin credentials and verify profile
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={verifyEmail}
                onChangeText={setVerifyEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter admin email"
                placeholderTextColor={theme.subText}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                value={verifyPassword}
                onChangeText={setVerifyPassword}
                secureTextEntry
                placeholder="Enter admin password"
                placeholderTextColor={theme.subText}
              />
            </View>

            <FastTouchable
              style={[styles.button, { backgroundColor: theme.success }]}
              onPress={handleVerifyAdmin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Verify Admin</Text>
              )}
            </FastTouchable>
          </View>
        )}

        <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>ℹ️ Information</Text>
          <Text style={[styles.infoText, { color: theme.subText }]}>
            • Admin users have access to the admin panel{'\n'}
            • Only specific emails can be created as admin users{'\n'}
            • Admin users can manage news, categories, and users{'\n'}
            • This setup tool is for development purposes only
          </Text>
        </View>
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    marginTop: 30,
    marginBottom: 30,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
