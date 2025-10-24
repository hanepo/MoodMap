# Social Authentication Setup Guide
## Google, Apple, and Twitter Sign-In for MoodMap

This guide will walk you through setting up Google Sign-In, Apple Sign-In, and Twitter (X) authentication for your MoodMap React Native application.

---

## 📋 Prerequisites

- Firebase project set up
- Expo account
- Google Cloud Platform account
- Apple Developer account (for Apple Sign-In)
- Twitter Developer account (for Twitter/X Sign-In)

---

## 🔧 Part 1: Google Sign-In Setup

### Step 1: Configure Firebase Console

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your MoodMap project**
3. **Navigate to**: Authentication → Sign-in method
4. **Enable Google**:
   - Click on "Google"
   - Toggle "Enable"
   - Set Project support email
   - Save

### Step 2: Set up Google Cloud Console

1. **Go to**: https://console.cloud.google.com/
2. **Select your Firebase project** (same project)
3. **Navigate to**: APIs & Services → Credentials

4. **Create OAuth 2.0 Client IDs** (you need 3):

   **A. Web Client ID (for Firebase)**
   - Click "+ CREATE CREDENTIALS" → OAuth client ID
   - Application type: **Web application**
   - Name: "MoodMap Web Client"
   - Authorized JavaScript origins: (leave empty)
   - Authorized redirect URIs: (leave empty)
   - Click **CREATE**
   - **COPY THE CLIENT ID** - This is your `WEB_CLIENT_ID`

   **B. Android Client ID**
   - Click "+ CREATE CREDENTIALS" → OAuth client ID
   - Application type: **Android**
   - Name: "MoodMap Android"
   - Package name: Get from `app.json` → `expo.android.package` (e.g., `com.yourcompany.moodmap`)
   - SHA-1 certificate fingerprint:
     ```bash
     # For development, run:
     cd android/app
     keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android

     # For production, use your release keystore
     ```
   - Click **CREATE**
   - **COPY THE CLIENT ID** - This is your `ANDROID_CLIENT_ID`

   **C. iOS Client ID**
   - Click "+ CREATE CREDENTIALS" → OAuth client ID
   - Application type: **iOS**
   - Name: "MoodMap iOS"
   - Bundle ID: Get from `app.json` → `expo.ios.bundleIdentifier` (e.g., `com.yourcompany.moodmap`)
   - Click **CREATE**
   - **COPY THE CLIENT ID** - This is your `IOS_CLIENT_ID`

### Step 3: Download Configuration Files

**For Android:**
1. In Firebase Console → Project Settings → Your apps
2. Select your Android app or add one if not exists
3. Download `google-services.json`
4. **Place it in**: `MoodMap/android/app/google-services.json` (you already have this)

**For iOS:**
1. In Firebase Console → Project Settings → Your apps
2. Select your iOS app or add one if not exists
3. Download `GoogleService-Info.plist`
4. **Place it in**: `MoodMap/ios/` (you already have this at root, move to ios folder)

### Step 4: Update app.json

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json",
      "package": "com.yourcompany.moodmap"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist",
      "bundleIdentifier": "com.yourcompany.moodmap"
    },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "expo-apple-authentication"
    ]
  }
}
```

### Step 5: Update socialAuth.js with Your Client IDs

Edit `src/config/socialAuth.js`:

```javascript
const EXPO_CLIENT_ID = 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com';
const IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID_HERE.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID_HERE.apps.googleusercontent.com';
const WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com';
```

### Step 6: Build Development Client

Google Sign-In **DOES NOT WORK** in Expo Go. You MUST use a development build:

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build development client for Android
eas build --profile development --platform android

# Build development client for iOS
eas build --profile development --platform ios
```

---

## 🍎 Part 2: Apple Sign-In Setup

### Step 1: Configure Apple Developer Account

1. **Go to**: https://developer.apple.com/account/
2. **Navigate to**: Certificates, Identifiers & Profiles → Identifiers
3. **Select your App ID** (or create one)
4. **Enable "Sign In with Apple"**:
   - Check "Sign In with Apple"
   - Click "Edit"
   - Configure: Enable as primary App ID
   - Save

### Step 2: Configure Firebase Console

1. **Go to Firebase Console** → Authentication → Sign-in method
2. **Enable Apple**:
   - Click on "Apple"
   - Toggle "Enable"
   - Services ID: (optional, for web)
   - Save

### Step 3: Update app.json

Add Apple capability to `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.moodmap",
      "entitlements": {
        "com.apple.developer.applesignin": ["Default"]
      }
    },
    "plugins": [
      "expo-apple-authentication"
    ]
  }
}
```

### Step 4: Install Required Package (Already Installed)

```bash
# Already in package.json
"expo-apple-authentication": "^8.0.7"
```

### Step 5: Test on Physical iOS Device

Apple Sign-In **ONLY works on**:
- Physical iOS devices (iOS 13+)
- NOT on iOS Simulator
- NOT on Android

---

## 🐦 Part 3: Twitter (X) Sign-In Setup

### Step 1: Create Twitter Developer Account

1. **Go to**: https://developer.twitter.com/
2. **Apply for developer access** (if you haven't)
3. **Create a new project**

### Step 2: Create Twitter App

1. **In Developer Portal** → Projects & Apps
2. **Click "Create App"**
3. **Fill in details**:
   - App name: "MoodMap"
   - Description: "Mental wellness tracking app"
   - Website: Your app website
   - Callback URLs:
     ```
     https://auth.expo.io/@your-expo-username/moodmap
     exp://localhost:8081/--/redirect
     ```
4. **Save API Key and API Secret**

### Step 3: Enable Firebase Twitter Auth

1. **Firebase Console** → Authentication → Sign-in method
2. **Enable Twitter**:
   - API Key: (from Twitter app)
   - API Secret: (from Twitter app)
   - Save
3. **Copy the callback URL** shown by Firebase
4. **Add it to Twitter App** → Authentication settings → Callback URLs

### Step 4: Install Twitter Auth Package

```bash
npm install @expo/firebase-twitter
```

### Step 5: Create Twitter Auth Handler

Create `src/config/twitterAuth.js`:

```javascript
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

WebBrowser.maybeCompleteAuthSession();

export const handleTwitterSignIn = async () => {
  try {
    const provider = new OAuthProvider('twitter.com');

    // Use popup for web, redirect for mobile
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Get Twitter access token
    const credential = OAuthProvider.credentialFromResult(userCredential);
    const accessToken = credential.accessToken;
    const secret = credential.secret;

    // Check if user document exists
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userRef, {
        displayName: user.displayName || 'User',
        email: user.email || '',
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
        authProvider: 'twitter'
      });
      return { user, isNewUser: true };
    } else {
      await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
      return { user, isNewUser: false };
    }
  } catch (error) {
    console.error('Twitter Sign-In Error:', error);
    throw error;
  }
};
```

### Step 6: Add Twitter Button to Login/SignUp Screens

Add to `LoginScreen.js` and `SignUpScreen.js`:

```javascript
// Add state
const [twitterLoading, setTwitterLoading] = useState(false);

// Add import
import { handleTwitterSignIn } from '../config/twitterAuth';

// Add handler
const onTwitterSignIn = async () => {
  setTwitterLoading(true);
  try {
    const result = await handleTwitterSignIn();
    console.log('Twitter sign-in successful:', result.user.uid);

    if (result.isNewUser) {
      navigation.replace('Onboarding');
    } else {
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (userData && userData.role === 'admin') {
        navigation.replace('AdminHome');
      } else {
        navigation.replace('Home');
      }
    }
  } catch (error) {
    console.error('Twitter Sign-In Error:', error);
    Alert.alert('Twitter Sign-In Error', error.message || 'Failed to sign in with Twitter');
  } finally {
    setTwitterLoading(false);
  }
};

// Add button in JSX (after Apple button)
<TouchableOpacity
  style={[styles.socialButton, styles.twitterButton, twitterLoading && styles.buttonDisabled]}
  onPress={onTwitterSignIn}
  disabled={twitterLoading}
>
  {twitterLoading ? (
    <ActivityIndicator color="#1DA1F2" size="small" />
  ) : (
    <View style={styles.socialButtonContent}>
      <Text style={styles.twitterIcon}>𝕏</Text>
      <Text style={styles.twitterButtonText}>Twitter</Text>
    </View>
  )}
</TouchableOpacity>

// Add styles
twitterButton: {
  backgroundColor: '#000',
  borderColor: '#000',
},
twitterIcon: {
  fontSize: 22,
  color: '#FFF',
  marginRight: 12,
},
twitterButtonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFF',
},
```

---

## 🧪 Testing

### Google Sign-In
1. **Run development build** (not Expo Go)
2. **Test on both Android and iOS** physical devices or emulators
3. **Check Firebase Console** → Authentication → Users to verify

### Apple Sign-In
1. **Must test on physical iOS device** (iOS 13+)
2. **Sign in with Apple ID**
3. **Grant permissions**

### Twitter Sign-In
1. **Test on both platforms**
2. **Authorize app in browser**
3. **Check redirection back to app**

---

## ⚠️ Common Errors and Solutions

### Google Sign-In Errors

**Error: "Sign in with Google temporarily disabled for this app"**
- **Solution**: You're using Expo Go. Build a development client with `eas build --profile development`

**Error: "Invalid client ID"**
- **Solution**: Make sure client IDs in `socialAuth.js` match those in Google Cloud Console
- Verify you're using the correct client ID for the platform (iOS/Android/Web)

**Error: "API key not valid"**
- **Solution**: Check that `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are in correct locations
- Rebuild the app after adding these files

### Apple Sign-In Errors

**Error: "Apple authentication is not available"**
- **Solution**: Only works on physical iOS devices with iOS 13+
- Cannot test on simulator or Android

**Error: "Capability not found"**
- **Solution**: Update `app.json` with Apple entitlements, then rebuild:
  ```bash
  eas build --profile development --platform ios
  ```

### Twitter Sign-In Errors

**Error: "Redirect URI mismatch"**
- **Solution**: Add all callback URLs in Twitter Developer Portal:
  - Expo auth URL: `https://auth.expo.io/@your-username/moodmap`
  - Local dev URL: `exp://localhost:8081/--/redirect`
  - Firebase callback URL (from Firebase console)

---

## 🚀 Deployment Checklist

Before going to production:

### Google
- [ ] Create production OAuth client IDs
- [ ] Update SHA-1 fingerprints with release keystore
- [ ] Update client IDs in production build

### Apple
- [ ] Configure production App ID with Sign In with Apple
- [ ] Test on TestFlight
- [ ] Submit for App Store review

### Twitter
- [ ] Move to Twitter App production mode
- [ ] Update production callback URLs
- [ ] Request elevated access if needed

---

## 📱 Build Commands

```bash
# Development builds (with social auth)
eas build --profile development --platform android
eas build --profile development --platform ios

# Production builds
eas build --profile production --platform android
eas build --profile production --platform ios

# Run development build
npx expo start --dev-client
```

---

## 🔗 Useful Links

- **Firebase Console**: https://console.firebase.google.com/
- **Google Cloud Console**: https://console.cloud.google.com/
- **Apple Developer**: https://developer.apple.com/account/
- **Twitter Developer**: https://developer.twitter.com/
- **Expo Docs**: https://docs.expo.dev/
- **Firebase Auth Docs**: https://firebase.google.com/docs/auth

---

## 📞 Support

If you encounter issues:
1. Check Firebase Console logs
2. Check Expo build logs
3. Review platform-specific documentation
4. Test on physical devices (not simulators for Apple)

---

**Last Updated**: January 2025
