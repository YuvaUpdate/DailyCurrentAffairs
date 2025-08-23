import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationSettings } from '../../types';
import NotificationService from '../../services/notificationService';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>({
    breakingNews: true,
    dailyDigest: true,
    digestTime: '08:00',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userSettings = await NotificationService.getNotificationSettings();
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean | string) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await NotificationService.updateNotificationSettings(newSettings);
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
      // Revert the change
      setSettings(settings);
    }
  };

  const selectDigestTime = () => {
    Alert.alert(
      'Daily Digest Time',
      'Choose when to receive your daily news digest',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '6:00 AM', onPress: () => updateSetting('digestTime', '06:00') },
        { text: '8:00 AM', onPress: () => updateSetting('digestTime', '08:00') },
        { text: '10:00 AM', onPress: () => updateSetting('digestTime', '10:00') },
        { text: '6:00 PM', onPress: () => updateSetting('digestTime', '18:00') },
        { text: '8:00 PM', onPress: () => updateSetting('digestTime', '20:00') },
      ]
    );
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached articles and force refresh from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const { StorageService } = await import('../../services/storage');
              await StorageService.clearCache();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const formatTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    return `${displayHour}:${minute} ${period}`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={24} color="#007AFF" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Breaking News</Text>
              <Text style={styles.settingDescription}>
                Get instant alerts for important news
              </Text>
            </View>
          </View>
          <Switch
            value={settings.breakingNews}
            onValueChange={(value) => updateSetting('breakingNews', value)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={settings.breakingNews ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="newspaper" size={24} color="#007AFF" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Daily Digest</Text>
              <Text style={styles.settingDescription}>
                Daily summary of top stories
              </Text>
            </View>
          </View>
          <Switch
            value={settings.dailyDigest}
            onValueChange={(value) => updateSetting('dailyDigest', value)}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor={settings.dailyDigest ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        {settings.dailyDigest && (
          <TouchableOpacity style={styles.settingItem} onPress={selectDigestTime}>
            <View style={styles.settingInfo}>
              <Ionicons name="time" size={24} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Digest Time</Text>
                <Text style={styles.settingDescription}>
                  {formatTime(settings.digestTime)}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      {/* App Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={clearCache}>
          <View style={styles.settingInfo}>
            <Ionicons name="refresh" size={24} color="#007AFF" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Clear Cache</Text>
              <Text style={styles.settingDescription}>
                Remove cached articles and data
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('App Info', 'Daily Current Affairs v1.0.0\nYour trusted news companion')}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>About</Text>
              <Text style={styles.settingDescription}>
                App version and information
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Feedback', 'Feature coming soon!')}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="chatbubble" size={24} color="#007AFF" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Send Feedback</Text>
              <Text style={styles.settingDescription}>
                Help us improve the app
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => Alert.alert('Privacy Policy', 'Privacy policy details would be shown here.')}
        >
          <View style={styles.settingInfo}>
            <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
              <Text style={styles.settingDescription}>
                How we protect your data
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  bottomSpacing: {
    height: 100,
  },
});
