// src/screens/LoginScreen.js
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
  ActivityIndicator,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

    // Load saved credentials if Remember Me was checked
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('rememberedEmail');
      const savedPassword = await AsyncStorage.getItem('rememberedPassword');
      const savedRememberMe = await AsyncStorage.getItem('rememberMe');

      if (savedRememberMe === 'true' && savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

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

  const handleForgotPassword = () => {
    Alert.prompt(
      'Reset Password',
      'Enter your email address to receive a password reset link',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send',
          onPress: async (emailInput) => {
            if (!emailInput || !emailInput.trim()) {
              Alert.alert('Error', 'Please enter your email address');
              return;
            }

            try {
              await sendPasswordResetEmail(auth, emailInput.trim());
              Alert.alert(
                'Success',
                'Password reset email sent! Please check your inbox.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Password reset error:', error);
              let errorMessage = 'Failed to send reset email.';

              switch (error.code) {
                case 'auth/user-not-found':
                  errorMessage = 'No account found with this email address.';
                  break;
                case 'auth/invalid-email':
                  errorMessage = 'Please enter a valid email address.';
                  break;
                case 'auth/too-many-requests':
                  errorMessage = 'Too many requests. Please try again later.';
                  break;
                default:
                  errorMessage = error.message;
              }

              Alert.alert('Error', errorMessage);
            }
          }
        }
      ],
      'plain-text',
      email
    );
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      console.log('Attempting login with:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { lastLogin: new Date() });
      console.log('Login successful for user:', user.uid);

      // Save credentials if Remember Me is checked
      if (rememberMe) {
        await AsyncStorage.setItem('rememberedEmail', email);
        await AsyncStorage.setItem('rememberedPassword', password);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
        await AsyncStorage.removeItem('rememberedPassword');
        await AsyncStorage.removeItem('rememberMe');
      }

      // Check if user is admin
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (userData && userData.role === 'admin') {
        console.log('Admin user detected, redirecting to AdminHome');
        navigation.replace('AdminHome');
      } else {
        navigation.replace('Home');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password.'; break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.'; break;
        case 'auth/too-many-requests':
           errorMessage = 'Too many failed attempts. Please try again later.'; break;
        default: errorMessage = error.message;
      }
      Alert.alert('Login Error', errorMessage);
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

      if (result.isNewUser) {
        navigation.replace('Onboarding');
      } else {
        // Check if user is admin
        const userRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        if (userData && userData.role === 'admin') {
          console.log('Admin user detected, redirecting to AdminHome');
          navigation.replace('AdminHome');
        } else {
          navigation.replace('Home');
        }
      }
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

      if (result.isNewUser) {
        navigation.replace('Onboarding');
      } else {
        // Check if user is admin
        const userRef = doc(db, 'users', result.user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        if (userData && userData.role === 'admin') {
          console.log('Admin user detected, redirecting to AdminHome');
          navigation.replace('AdminHome');
        } else {
          navigation.replace('Home');
        }
      }
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
          {/* Header Image Placeholder */}
          <View style={styles.headerImage}>
            <Image 
              source={require('../assets/newlogo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Sign In</Text>
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}><Text>👤</Text></View>
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}><Text>🔒</Text></View>
              <TextInput
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {/* Options Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity style={styles.rememberMe} onPress={() => setRememberMe(!rememberMe)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} />
            </View>
            {/* Social Buttons */}
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
            </View>
            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account yet? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signUpLink}>Sign Up</Text>
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
  logoImage: { width: 220, height: 220 },
  imagePlaceholder: { width: 200, height: 150, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
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
  forgotText: { fontSize: 14, color: '#7B287D', fontWeight: '600' },
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
