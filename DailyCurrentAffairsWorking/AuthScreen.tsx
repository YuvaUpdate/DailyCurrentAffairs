import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { authService } from './AuthService';

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  mode: 'login' | 'register';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  onSwitchMode,
  mode
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (mode === 'register') {
      if (!formData.displayName.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await authService.login(formData.email, formData.password);
      } else {
        await authService.register(
          formData.email,
          formData.password,
          formData.displayName
        );
      }
      
      onAuthSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      console.log('🔄 Attempting password reset for:', formData.email);
      await authService.resetPassword(formData.email.trim());
      Alert.alert(
        'Password Reset Email Sent', 
        `A password reset email has been sent to ${formData.email}. Please check your inbox and spam folder.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      let errorMessage = 'Failed to send reset email';
      
      if (error.message.includes('user-not-found')) {
        errorMessage = 'No account found with this email address. Please check your email or create a new account.';
      } else if (error.message.includes('invalid-email')) {
        errorMessage = 'Invalid email address format. Please enter a valid email.';
      } else if (error.message.includes('too-many-requests')) {
        errorMessage = 'Too many reset attempts. Please wait a few minutes before trying again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Password Reset Failed', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'login' 
                ? 'Sign in to continue reading' 
                : 'Join YuvaUpdate community'
              }
            </Text>
          </View>

          <View style={styles.form}>
            {mode === 'register' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={formData.displayName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, displayName: text }))}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text.toLowerCase().trim() }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {mode === 'register' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.authButton, loading && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.authButtonText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.switchText}>
              {mode === 'login' 
                ? "Don't have an account? " 
                : "Already have an account? "
              }
            </Text>
            <TouchableOpacity
              onPress={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
            >
              <Text style={styles.switchButtonText}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    color: '#1A1A1A',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  showPasswordButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  showPasswordText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  authButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  authButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  switchText: {
    fontSize: 16,
    color: '#666666',
  },
  switchButtonText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
});
