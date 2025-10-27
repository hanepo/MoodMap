import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Image,
  Alert,
  TextInput,
  Modal,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signOut, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { doc, updateDoc, collection, getDocs, query, orderBy, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { Share } from 'react-native';
// Use legacy API to avoid deprecation warning in this Expo SDK
import * as FileSystem from 'expo-file-system/legacy';
import PDFExportService from '../services/PDFExportService';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { state,dispatch } = useApp();
  const { theme, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  const [emailPrefsModalVisible, setEmailPrefsModalVisible] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState({ news: false, updates: false });
  const [exporting, setExporting] = useState(false);
  
  // Contact & Feedback states
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    if (state.user?.displayName) {
      setNewDisplayName(state.user.displayName);
    }
    if (state.user?.email) {
      setNewEmail(state.user.email);
    }
    if (state.user?.phoneNumber) {
      setNewPhoneNumber(state.user.phoneNumber);
    }
    // Load notification preference
    loadNotificationPreference();
  }, [state.user]);

  const loadNotificationPreference = async () => {
    if (!state.user?.uid) return;

    try {
      const userRef = doc(db, 'users', state.user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData?.preferences?.notificationsEnabled !== undefined) {
          setNotificationsEnabled(userData.preferences.notificationsEnabled);
        }
      }
    } catch (error) {
      console.error('Error loading notification preference:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!newDisplayName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    // Validate email format
    if (newEmail && !newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate phone number format (optional, basic validation)
    if (newPhoneNumber && !newPhoneNumber.match(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: newDisplayName.trim()
      });

      // Prepare update data for Firestore
      const updateData = {
        displayName: newDisplayName.trim(),
        phoneNumber: newPhoneNumber.trim() || null
      };

      // Note: Email update in Firebase Auth requires re-authentication
      // We'll only update it in Firestore for now
      if (newEmail !== state.user.email) {
        updateData.email = newEmail.trim();
        // Show a warning about email change
        Alert.alert(
          'Email Update',
          'Email has been updated in your profile. Note: To update your login email, please use "Change Email" option from account settings.',
          [{ text: 'OK' }]
        );
      }

      // Update Firestore user document
      const userRef = doc(db, 'users', state.user.uid);
      await updateDoc(userRef, updateData);

      dispatch({
        type: 'SET_USER',
        payload: {
          ...auth.currentUser,
          displayName: newDisplayName.trim(),
          email: newEmail.trim(),
          phoneNumber: newPhoneNumber.trim() || null
        }
      });

      Alert.alert('Success', 'Profile updated successfully!');
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleNotificationToggle = async (value) => {
    setNotificationsEnabled(value);
    
    try {
      const userRef = doc(db, 'users', state.user.uid);
      await updateDoc(userRef, {
        'preferences.notificationsEnabled': value
      });
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              console.log('✅ Signed out, resetting nav');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Ask for password confirmation
            Alert.prompt(
              'Confirm Deletion',
              'Please enter your password to confirm account deletion:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Account',
                  style: 'destructive',
                  onPress: async (password) => {
                    if (!password) {
                      Alert.alert('Error', 'Password is required');
                      return;
                    }

                    try {
                      const user = auth.currentUser;
                      if (!user || !user.email) {
                        Alert.alert('Error', 'No user logged in');
                        return;
                      }

                      // Re-authenticate user
                      const credential = EmailAuthProvider.credential(user.email, password);
                      await reauthenticateWithCredential(user, credential);

                      // Delete all user data from Firestore
                      console.log('Deleting user data from Firestore...');

                      // Delete mood entries
                      const moodEntriesRef = collection(db, 'users', user.uid, 'moodEntries');
                      const moodSnapshot = await getDocs(moodEntriesRef);
                      for (const moodDoc of moodSnapshot.docs) {
                        await deleteDoc(doc(db, 'users', user.uid, 'moodEntries', moodDoc.id));
                      }

                      // Delete tasks
                      const tasksRef = collection(db, 'users', user.uid, 'tasks');
                      const tasksSnapshot = await getDocs(tasksRef);
                      for (const taskDoc of tasksSnapshot.docs) {
                        await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskDoc.id));
                      }

                      // Delete self-care completions
                      const selfCareRef = collection(db, 'users', user.uid, 'selfCareCompletions');
                      const selfCareSnapshot = await getDocs(selfCareRef);
                      for (const selfCareDoc of selfCareSnapshot.docs) {
                        await deleteDoc(doc(db, 'users', user.uid, 'selfCareCompletions', selfCareDoc.id));
                      }

                      // Delete check-ins
                      const checkInsRef = collection(db, 'users', user.uid, 'checkIns');
                      const checkInsSnapshot = await getDocs(checkInsRef);
                      for (const checkInDoc of checkInsSnapshot.docs) {
                        await deleteDoc(doc(db, 'users', user.uid, 'checkIns', checkInDoc.id));
                      }

                      // Delete user document
                      await deleteDoc(doc(db, 'users', user.uid));

                      // Delete Firebase Auth user
                      await deleteUser(user);

                      Alert.alert(
                        'Account Deleted',
                        'Your account and all associated data have been permanently deleted.',
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              // Navigate to Welcome screen
                              navigation.reset({
                                index: 0,
                                routes: [{ name: 'Welcome' }],
                              });
                            }
                          }
                        ]
                      );
                    } catch (error) {
                      console.error('Account deletion error:', error);
                      let errorMessage = 'Failed to delete account.';

                      if (error.code === 'auth/wrong-password') {
                        errorMessage = 'Incorrect password. Please try again.';
                      } else if (error.code === 'auth/too-many-requests') {
                        errorMessage = 'Too many attempts. Please try again later.';
                      } else if (error.message) {
                        errorMessage = error.message;
                      }

                      Alert.alert('Error', errorMessage);
                    }
                  }
                }
              ],
              'secure-text'
            );
          }
        }
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPasswordInput) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPasswordInput.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPasswordInput);
      Alert.alert('Success', 'Password updated successfully');
      setChangePasswordModalVisible(false);
      setCurrentPassword('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', error.message || 'Failed to change password');
    }
  };

  const handleSaveEmailPreferences = async () => {
    try {
      const userRef = doc(db, 'users', state.user.uid);
      await updateDoc(userRef, {
        'preferences.email': emailPrefs
      });
      dispatch({ type: 'SET_USER', payload: { ...state.user, preferences: { ...(state.user?.preferences || {}), email: emailPrefs } } });
      Alert.alert('Success', 'Email preferences saved');
      setEmailPrefsModalVisible(false);
    } catch (error) {
      console.error('Error saving email prefs:', error);
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  const handleExportData = async () => {
    if (!state.user?.uid) {
      Alert.alert('Error', 'User not available');
      return;
    }
    setExporting(true);
    try {
      // Automatically generate and download PDF
      const result = await PDFExportService.generateAndDownloadPDF(state.user.uid, state.user);

      // Show success message with statistics
      const { stats } = result;
      Alert.alert(
        'PDF Report Generated! 📊',
        `Your wellness report has been generated successfully!\n\n` +
        `📈 Statistics:\n` +
        `• ${stats.mood.total} mood entries\n` +
        `• ${stats.tasks.total} tasks (${stats.tasks.completionRate}% completed)\n` +
        `• ${stats.checkIns.currentStreak} day streak\n\n` +
        `The PDF is now ready to download or share!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', error.message || 'Failed to generate PDF report');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0) {
      Alert.alert('Rating Required', 'Please provide a rating (1-5 stars)');
      return;
    }
    if (!feedbackText.trim()) {
      Alert.alert('Feedback Required', 'Please write your comments or suggestions');
      return;
    }

    try {
      // Here you would normally save feedback to Firestore
      // For now, we'll just show a success message
      Alert.alert(
        'Thank You! 🙏',
        'Your feedback has been submitted successfully. We appreciate your input and will use it to improve MoodMap!',
        [{ text: 'OK', onPress: () => {
          setFeedbackModalVisible(false);
          setFeedbackRating(0);
          setFeedbackText('');
        }}]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  const formatLastLogin = () => {
    if (!state.user?.metadata?.lastSignInTime) return 'Recently';
    
    const lastLogin = new Date(state.user.metadata.lastSignInTime);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return lastLogin.toLocaleDateString('en-US', options);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backIcon, { color: theme.colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container}>
        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.profileCircle, { backgroundColor: theme.colors.primary }]}>
            {state.user?.photoURL ? (
              <Image source={{ uri: state.user.photoURL }} style={styles.profileImage} />
            ) : (
              <Text style={styles.profileIcon}>{state.user?.displayName?.charAt(0) || 'U'}</Text>
            )}
          </View>
          <Text style={[styles.profileName, { color: theme.colors.text }]}>{state.user?.displayName || 'User'}</Text>
          <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>{state.user?.email}</Text>
          <Text style={[styles.profileLastLogin, { color: theme.colors.textSecondary }]}>Last login: {formatLastLogin()}</Text>

          <TouchableOpacity
            style={[styles.editProfileButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setEditModalVisible(true)}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>

          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            onPress={() => setChangePasswordModalVisible(true)}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>🔒</Text>
              <View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>Change Password</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>Update your password</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              setEmailPrefs(state.user?.preferences?.email || { news: false, updates: false });
              setEmailPrefsModalVisible(true);
            }}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>📧</Text>
              <View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>Email Preferences</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>Manage email settings</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preferences</Text>

          <View style={[styles.item, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>🔔</Text>
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>Notifications</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>Daily mood reminders</Text>
              </View>
            </View>
            <Switch
              onValueChange={handleNotificationToggle}
              value={notificationsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#B7C0EE' }}
              thumbColor={notificationsEnabled ? theme.colors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Data & Privacy Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Data & Privacy</Text>


          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            onPress={handleExportData}
            disabled={exporting}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>📊</Text>
              <View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>Download PDF Report</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>{exporting ? 'Generating PDF...' : 'Generate wellness report with statistics & charts'}</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            onPress={() => Alert.alert(
              'Privacy Policy',
              'MoodMap respects your privacy. Your mood and task data is stored securely and never shared with third parties. We only use your data to provide you with personalized recommendations and insights.'
            )}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>🔐</Text>
              <View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>Privacy Policy</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>How we protect your data</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Support</Text>


          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            onPress={() => setFaqModalVisible(true)}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>❓</Text>
              <View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>FAQ</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>Frequently asked questions</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            onPress={() => Alert.alert(
              'Report a Problem',
              'Please email us at support@moodmap.com with details about the issue you encountered.'
            )}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>🐛</Text>
              <View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>Report a Problem</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>Let us know about issues</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            onPress={() => Alert.alert(
              'About MoodMap',
              'MoodMap v1.0.0\n\nYour daily companion for mood tracking and mental wellness.\n\nDeveloped with care to help you understand your emotional patterns and improve your wellbeing.'
            )}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>ℹ️</Text>
              <View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>About</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>App version and info</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Contact & Feedback Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact & Feedback</Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.textSecondary }]}>
            Your feedback helps us improve MoodMap!
          </Text>

          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            onPress={() => setFeedbackModalVisible(true)}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>💬</Text>
              <View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>Provide Feedback</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>Rate and share your thoughts</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              Linking.openURL('mailto:support.moodmap@iukl.edu.my?subject=MoodMap Support Request');
            }}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>📧</Text>
              <View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>Email Support</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>support.moodmap@iukl.edu.my</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            onPress={() => Alert.alert(
              'Stay Connected 🌟',
              '• Follow development updates\n• Participate in user surveys\n• Join our beta testing program\n\nDuring Presentation: Use the feedback QR code to share your thoughts!'
            )}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>🔔</Text>
              <View>
                <Text style={[styles.itemText, { color: theme.colors.text }]}>Stay Connected</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>Updates and beta program</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        </View>


        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>

          <TouchableOpacity
            style={[styles.item, styles.dangerItem, { backgroundColor: theme.colors.surface }]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemIcon}>⚠️</Text>
              <View>
                <Text style={[styles.itemText, styles.dangerText]}>Delete Account</Text>
                <Text style={[styles.itemDescription, { color: theme.colors.textSecondary }]}>Permanently delete all data</Text>
              </View>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.colors.primary }]} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Profile</Text>

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Display Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newDisplayName}
                onChangeText={setNewDisplayName}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textSecondary}
              />

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Phone Number (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={newPhoneNumber}
                onChangeText={setNewPhoneNumber}
                placeholder="Enter your phone number"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: theme.colors.primary }]}
                  onPress={handleUpdateProfile}
                >
                  <Text style={styles.modalButtonTextSave}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Change Password</Text>

            <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Current Password</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
            />

            <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>New Password</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
              value={newPasswordInput}
              onChangeText={setNewPasswordInput}
              placeholder="New password"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
            />

            <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Confirm New Password</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
              value={confirmPasswordInput}
              onChangeText={setConfirmPasswordInput}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setChangePasswordModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: theme.colors.primary }]}
                onPress={handleChangePassword}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Preferences Modal */}
      <Modal
        visible={emailPrefsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmailPrefsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Email Preferences</Text>

            <View style={styles.emailPrefsRow}>
              <View style={styles.emailPrefItem}>
                <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>News & Promotions</Text>
                <Switch
                  value={emailPrefs.news}
                  onValueChange={(v) => setEmailPrefs(prev => ({ ...prev, news: v }))}
                  trackColor={{ false: '#D1D5DB', true: '#B7C0EE' }}
                  thumbColor={emailPrefs.news ? theme.colors.primary : '#f4f3f4'}
                />
              </View>
              <View style={styles.emailPrefItem}>
                <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Product Updates</Text>
                <Switch
                  value={emailPrefs.updates}
                  onValueChange={(v) => setEmailPrefs(prev => ({ ...prev, updates: v }))}
                  trackColor={{ false: '#D1D5DB', true: '#B7C0EE' }}
                  thumbColor={emailPrefs.updates ? theme.colors.primary : '#f4f3f4'}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEmailPrefsModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveEmailPreferences}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FAQ Modal */}
      <Modal
        visible={faqModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFaqModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.faqModalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.faqHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Frequently Asked Questions</Text>
              <TouchableOpacity onPress={() => setFaqModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.faqScroll}>
              <View style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>How often should I log my mood?</Text>
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  We recommend logging your mood at least once daily, ideally at the same time each day. This helps you track patterns and trends more effectively.
                </Text>
              </View>

              <View style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>What do the task difficulty levels mean?</Text>
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  Easy tasks require minimal energy and time (5-15 minutes). Medium tasks need moderate effort (15-30 minutes). Hard tasks are more demanding and may take 30+ minutes.
                </Text>
              </View>

              <View style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>How is my data stored?</Text>
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  Your data is securely stored in Firebase and is only accessible to you. We never share your personal information or mood data with third parties.
                </Text>
              </View>

              <View style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>Can I export my mood history?</Text>
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  Yes! Go to Settings → Data & Privacy → Export Data to download your mood entries and tasks as a CSV file.
                </Text>
              </View>

              <View style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>What should I do if I'm experiencing a mental health crisis?</Text>
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  MoodMap is a wellness tool, not a replacement for professional help. If you're in crisis, please contact a mental health professional or crisis hotline immediately. National Crisis Hotline: 988 (US)
                </Text>
              </View>

              <View style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>How do I delete my account?</Text>
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  Go to Settings → Danger Zone → Delete Account. Please note this action is permanent and cannot be undone.
                </Text>
              </View>

              <View style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>Can I track multiple moods in one day?</Text>
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  Yes! You can log your mood multiple times throughout the day. This helps you see how your mood changes and identify patterns or triggers.
                </Text>
              </View>

              <View style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>What are check-ins and how do they work?</Text>
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  Daily check-ins help you build a habit of self-reflection. Simply tap on today's day in the calendar to mark it complete. Keep your streak going to stay motivated!
                </Text>
              </View>

              <View style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>How are task recommendations personalized?</Text>
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  MoodMap analyzes your recent mood entries and suggests activities that match your current energy levels and emotional state. Tasks are tailored to help you feel better or maintain your positive mood.
                </Text>
              </View>

              <View style={[styles.faqItem, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>Is MoodMap free to use?</Text>
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                  Yes! MoodMap is completely free to use. All core features including mood tracking, task management, and analytics are available at no cost.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Provide Feedback</Text>
            
            <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Rate Your Experience</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setFeedbackRating(star)}
                  style={styles.starButton}
                >
                  <Text style={styles.starIcon}>
                    {star <= feedbackRating ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>Comments or Suggestions</Text>
            <TextInput
              style={[styles.feedbackInput, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border 
              }]}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Share your thoughts with us..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel, { backgroundColor: theme.colors.background }]}
                onPress={() => {
                  setFeedbackModalVisible(false);
                  setFeedbackRating(0);
                  setFeedbackText('');
                }}
              >
                <Text style={[styles.modalButtonTextCancel, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: theme.colors.primary }]}
                onPress={handleSubmitFeedback}
              >
                <Text style={styles.modalButtonTextSave}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
    marginLeft: -2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  container: { 
    flex: 1 
  },
  profileSection: { 
    alignItems: 'center', 
    padding: 30, 
    backgroundColor: 'white', 
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  profileCircle: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#7B287D', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  profileIcon: { 
    fontSize: 40,
    color: 'white',
    fontWeight: 'bold'
  },
  profileName: { 
    fontSize: 22, 
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 5
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 3
  },
  profileLastLogin: { 
    fontSize: 13, 
    color: '#9CA3AF',
    marginBottom: 15
  },
  editProfileButton: {
    backgroundColor: '#7B287D',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10
  },
  editProfileText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  section: { 
    marginHorizontal: 20,
    marginTop: 25
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 12,
    marginLeft: 5
  },
  dangerTitle: {
    fontSize: 16, 
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 12,
    marginLeft: 5
  },
  item: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16, 
    backgroundColor: 'white', 
    borderRadius: 12, 
    marginBottom: 10, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2 
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: '#FEE2E2'
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 15
  },
  itemTextContainer: {
    flex: 1
  },
  itemText: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#330C2F'
  },
  dangerText: {
    color: '#EF4444'
  },
  itemDescription: { 
    fontSize: 13, 
    color: '#6B7280',
    marginTop: 2
  },
  itemArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    marginLeft: 10
  },
  logoutContainer: { 
    padding: 20,
    paddingBottom: 40
  },
  logoutButton: { 
    backgroundColor: '#330C2F', 
    padding: 16, 
    borderRadius: 12,
    alignItems: 'center'
  },
  logoutButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 450
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 20
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6'
  },
  modalButtonSave: {
    backgroundColor: '#7B287D'
  },
  modalButtonTextCancel: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600'
  },
  modalButtonTextSave: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  // FAQ Modal
  faqModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%'
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280'
  },
  faqScroll: {
    flex: 1
  },
  faqItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 8
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  },
  emailPrefsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
    marginBottom: 20
  },
  emailPrefItem: {
    flex: 1,
    alignItems: 'center',
    gap: 10
  },
  // Contact & Feedback Section
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    marginLeft: 15,
    marginRight: 15
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
    gap: 10
  },
  starButton: {
    padding: 8
  },
  starIcon: {
    fontSize: 36,
    color: '#FFD700'
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: 20
  }
});

export default SettingsScreen;