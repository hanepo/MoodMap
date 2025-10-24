// src/config/socialAuth.js
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import {
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

// Get these from your Firebase Console and GoogleService-Info.plist / google-services.json
const EXPO_CLIENT_ID = '951366682380-d4l8bbmou3cgqv6fe4thgkril69bqdkn.apps.googleusercontent.com'; // Expo web client ID
const IOS_CLIENT_ID = '951366682380-2tujme2g56cumvoprrg7r76jh827o82l.apps.googleusercontent.com'; // From GoogleService-Info.plist
const ANDROID_CLIENT_ID = '951366682380-dkr9t1956mru8sfd1ovp3i9ao8527i0f.apps.googleusercontent.com'; // From google-services.json
const WEB_CLIENT_ID = '951366682380-jchk6cca98qkh79jj3pq3se2g0ug2umd.apps.googleusercontent.com'; // Firebase web client ID

// Configure Google Sign-In (no-op for Expo)
export const configureGoogleSignIn = () => {
  // Configuration is handled by expo-auth-session
};

// Create Google Auth Config
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: EXPO_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
  });

  return { request, response, promptAsync };
};

// Google Sign-In Handler - now requires the idToken to be passed
export const handleGoogleSignIn = async (idToken) => {
  try {
    if (!idToken) {
      throw new Error('No ID token provided');
    }

    // Create a Google credential with the token
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Sign in to Firebase with the Google credential
    const userCredential = await signInWithCredential(auth, googleCredential);
    const user = userCredential.user;

    // Check if user document exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Create new user document for first-time users
      await setDoc(userRef, {
        displayName: user.displayName || '',
        email: user.email,
        phoneNumber: user.phoneNumber || null,
        photoURL: user.photoURL || null,
        createdAt: new Date(),
        lastLogin: new Date(),
        totalMoodEntries: 0,
        totalTasks: 0,
        completedTasks: 0,
        preferences: {
          notificationsEnabled: true,
          reminderTime: '09:00'
        },
        authProvider: 'google'
      });
      return { user, isNewUser: true };
    } else {
      // Update last login for existing users
      await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
      return { user, isNewUser: false };
    }
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

// Apple Sign-In Handler
export const handleAppleSignIn = async () => {
  try {
    // Check if Apple Authentication is available (iOS only)
    const isAvailable = await AppleAuthentication.isAvailableAsync();

    if (!isAvailable) {
      throw new Error('Apple Sign-In is not available on this device');
    }

    // Request Apple Authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Create an OAuth credential for Firebase
    const provider = new OAuthProvider('apple.com');
    const oauthCredential = provider.credential({
      idToken: credential.identityToken,
    });

    // Sign in to Firebase with the Apple credential
    const userCredential = await signInWithCredential(auth, oauthCredential);
    const user = userCredential.user;

    // Check if user document exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // For Apple Sign-In, user might not provide name/email on subsequent logins
      const displayName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : user.displayName || 'User';

      // Create new user document for first-time users
      await setDoc(userRef, {
        displayName,
        email: user.email || credential.email || '',
        phoneNumber: user.phoneNumber || null,
        photoURL: user.photoURL || null,
        createdAt: new Date(),
        lastLogin: new Date(),
        totalMoodEntries: 0,
        totalTasks: 0,
        completedTasks: 0,
        preferences: {
          notificationsEnabled: true,
          reminderTime: '09:00'
        },
        authProvider: 'apple'
      });
      return { user, isNewUser: true };
    } else {
      // Update last login for existing users
      await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
      return { user, isNewUser: false };
    }
  } catch (error) {
    console.error('Apple Sign-In Error:', error);
    throw error;
  }
};

// Check if Apple Sign-In is available on the current device
export const isAppleSignInAvailable = async () => {
  if (Platform.OS !== 'ios') {
    return false;
  }
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.error('Error checking Apple availability:', error);
    return false;
  }
};
