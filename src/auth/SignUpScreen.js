// src/screens/SignUpScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import {
  handleGoogleSignIn,
  handleAppleSignIn,
  configureGoogleSignIn,
  isAppleSignInAvailable
} from '../config/socialAuth';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Google Auth Request using expo-auth-session
  // Note: This doesn't work in Expo Go due to Google's OAuth policy
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '951366682380-d4l8bbmou3cgqv6fe4thgkril69bqdkn.apps.googleusercontent.com',
    iosClientId: '951366682380-d4l8bbmou3cgqv6fe4thgkril69bqdkn.apps.googleusercontent.com',
    androidClientId: '951366682380-d4l8bbmou3cgqv6fe4thgkril69bqdkn.apps.googleusercontent.com',
    webClientId: '951366682380-d4l8bbmou3cgqv6fe4thgkril69bqdkn.apps.googleusercontent.com',
  });

  useEffect(() => {
    // Configure Google Sign-In
    configureGoogleSignIn();

    // Check if Apple Sign-In is available
    checkAppleAvailability();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      onGoogleSignInComplete(authentication?.idToken);
    }
  }, [response]);

  const checkAppleAvailability = async () => {
    const available = await isAppleSignInAvailable();
    setAppleAvailable(available);
  };

  const handleSignUp = async () => {
    if (!displayName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match'); return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters'); return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        email: user.email,
        phoneNumber: null,
        photoURL: null,
        createdAt: new Date(),
        lastLogin: new Date(),
        totalMoodEntries: 0,
        totalTasks: 0,
        completedTasks: 0,
        preferences: {
            notificationsEnabled: true,
            reminderTime: '09:00'
        }
      });
      await updateProfile(user, { displayName });

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'Continue', onPress: () => navigation.replace('Onboarding') }
      ]);
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'Signup failed. Please try again.';
      switch (error.code) {
        case 'auth/email-already-in-use': errorMessage = 'An account with this email already exists.'; break;
        case 'auth/invalid-email': errorMessage = 'Please enter a valid email address.'; break;
        case 'auth/weak-password': errorMessage = 'Password must be at least 6 characters.'; break;
        default: errorMessage = error.message;
      }
      Alert.alert('Signup Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await promptAsync();
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      Alert.alert('Google Sign-In Error', 'Failed to initiate Google Sign-In');
      setGoogleLoading(false);
    }
  };

  const onGoogleSignInComplete = async (idToken) => {
    try {
      const result = await handleGoogleSignIn(idToken);
      console.log('Google sign-in successful:', result.user.uid);
      navigation.replace('Onboarding');
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      let errorMessage = 'Google Sign-In failed. Please try again.';

      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Google Sign-In Error', errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  const onAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const result = await handleAppleSignIn();
      console.log('Apple sign-in successful:', result.user.uid);
      navigation.replace('Onboarding');
    } catch (error) {
      console.error('Apple Sign-In Error:', error);

      if (error.code === 'ERR_REQUEST_CANCELED') {
        return;
      }

      let errorMessage = 'Apple Sign-In failed. Please try again.';

      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Apple Sign-In Error', errorMessage);
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerImage}>
            <View style={styles.imagePlaceholder}><Text style={styles.placeholderText}>Logo</Text></View>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}><Text>👤</Text></View>
              <TextInput placeholder="Full Name" value={displayName} onChangeText={setDisplayName} style={styles.input} />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}><Text>✉️</Text></View>
              <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}><Text>🔒</Text></View>
              <TextInput placeholder="Password" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} style={styles.input} />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}><Text>🔒</Text></View>
              <TextInput placeholder="Confirm Password" secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} style={styles.input} />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Text style={styles.eyeIconText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.optionsRow}>
              <TouchableOpacity style={styles.rememberMe} onPress={() => setRememberMe(!rememberMe)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>{rememberMe && <Text style={styles.checkmark}>✓</Text>}</View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.signInButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
            <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} /></View>
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[styles.socialButton, styles.googleButton, (googleLoading || !request) && styles.buttonDisabled]}
                onPress={onGoogleSignIn}
                disabled={googleLoading || !request}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#4285F4" size="small" />
                ) : (
                  <View style={styles.socialButtonContent}>
                    <View style={styles.googleIconContainer}>
                      <Text style={styles.googleG}>G</Text>
                    </View>
                    <Text style={styles.socialButtonText}>Google</Text>
                  </View>
                )}
              </TouchableOpacity>
              {appleAvailable && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.appleButton, appleLoading && styles.buttonDisabled]}
                  onPress={onAppleSignIn}
                  disabled={appleLoading}
                >
                  {appleLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <View style={styles.socialButtonContent}>
                      <Text style={styles.appleIcon}></Text>
                      <Text style={styles.appleButtonText}>Apple</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signUpLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30 },
  headerImage: { alignItems: 'center', marginTop: 40, marginBottom: 30 },
  imagePlaceholder: { width: 200, height: 70, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  placeholderText: { color: '#9CA3AF', fontSize: 16 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: '#330C2F' },
  form: { flex: 1 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 5 },
  eyeIconText: { fontSize: 20 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  rememberMe: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#D1D5DB', borderRadius: 4, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#7B287D', borderColor: '#7B287D' },
  checkmark: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  rememberText: { fontSize: 14, color: '#6B7280' },
  signInButton: { backgroundColor: '#330C2F', padding: 16, borderRadius: 25, marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  buttonDisabled: { backgroundColor: '#9CA3AF' },
  signInButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 15, color: '#9CA3AF', fontSize: 14 },
  socialButtons: { flexDirection: 'column', gap: 12, marginBottom: 30 },
  socialButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleG: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  signUpContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  signUpText: { fontSize: 14, color: '#6B7280' },
  signUpLink: { fontSize: 14, color: '#330C2F', fontWeight: 'bold' },
  googleButton: {
    backgroundColor: '#FFF',
    borderColor: '#E5E7EB',
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  appleIcon: {
    fontSize: 22,
    color: '#FFF',
    marginRight: 12,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
