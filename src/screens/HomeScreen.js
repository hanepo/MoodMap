import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
  Platform,
  StatusBar,
  Animated,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');
// Removed signOut import as it's not used directly here
import { auth } from '../config/firebase'; // Keep auth if needed elsewhere later
import { useApp } from '../contexts/AppContext';
import CheckInService from '../services/CheckInService';
import { getMostFrequent } from '../utils/helpers'; // Import the helper function

export default function HomeScreen({ navigation }) {
  const { state, dispatch } = useApp();
  // console.log('HomeScreen rendered'); // Keep for debugging if needed
  // console.log('User state:', state.user?.uid);
  // console.log('Tasks in state:', state.tasks); // Log tasks
  // console.log('Moods in state:', state.moods); // Log moods
  const { user, moods, tasks, taskSummary, supportResources, loading, error } = state;

  const [checkIns, setCheckIns] = useState({});
  const [checkInDates, setCheckInDates] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [activeTab, setActiveTab] = useState('Home'); // Keep track of active tab
  const [notificationsEnabled, setNotificationsEnabled] = useState(true); // Assuming default is true

  // Animated values for wave effect
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load check-ins when user is available
    if (state.user?.uid) {
      loadCheckIns();
      loadNotificationPreference();
    }
    // Start wave animation
    startWaveAnimation();
  }, [state.user]); // Rerun when user changes

  const loadNotificationPreference = async () => {
    if (!state.user?.uid) return;

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');

      const userRef = doc(db, 'users', state.user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const notifEnabled = userData?.preferences?.notificationsEnabled ?? true;
        setNotificationsEnabled(notifEnabled);
      }
    } catch (error) {
      console.error('Error loading notification preference:', error);
    }
  };

  const startWaveAnimation = () => {
    // Wave 1 animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave1, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(wave1, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Wave 2 animation (offset)
    Animated.loop(
      Animated.sequence([
        Animated.timing(wave2, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(wave2, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadCheckIns = async () => {
    if (!state.user?.uid) return;

    try {
      const { checkInsByDay, checkInDates, currentStreak } = await CheckInService.getWeekCheckIns(state.user.uid);
      setCheckIns(checkInsByDay);
      setCheckInDates(checkInDates);
      setCurrentStreak(currentStreak);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    }
  };

  const handleProfileTasks = () => {
    // Navigate to the combined ProfileScreen which shows tasks
    navigation.navigate('Profile'); 
    console.log('Navigate to Profile + Tasks Screen');
  };

  const handleNotifications = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');

      const userRef = doc(db, 'users', state.user.uid);
      await updateDoc(userRef, {
        'preferences.notificationsEnabled': newValue
      });

      Alert.alert(
        'Notifications',
        `Notifications ${newValue ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      console.error('Error updating notification preference:', error);
      // Revert on error
      setNotificationsEnabled(!newValue);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  // --- Functions to get derived data from state ---
  
  // Gets the latest mood entry for today
  const getTodaysMood = () => {
    const today = new Date().toISOString().split('T')[0];
    // Find the mood entry matching today's date
    // Assumes moods array is reasonably small or sorted by date
    const todaysEntry = state.moods.find(mood => mood.date === today);
    // console.log("Today's mood entry:", todaysEntry); // Debug log
    return todaysEntry; 
  };

  // Calculates task completion rate from tasks in state
  const getCompletionRate = () => {
    if (!state.tasks || state.tasks.length === 0) return 0;
    const completed = state.tasks.filter(task => task.completed).length;
    // console.log(`Completion: ${completed} / ${state.tasks.length}`); // Debug log
    return Math.round((completed / state.tasks.length) * 100);
  };
  
  // Gets the most frequent mood label from recent moods
  const getMostFrequentMood = () => {
    if (!state.moods || state.moods.length === 0) return 'N/A';
    // Use the helper function, assuming moodLabel exists
    const mostFrequent = getMostFrequent(state.moods, 'moodLabel'); 
    return mostFrequent ? mostFrequent.key : 'N/A';
  };
  
  // --- End Derived Data Functions ---

  const handleCheckIn = async (dayIndex) => {
    // ... (keep existing check-in logic) ...
    if (!state.user?.uid) {
      Alert.alert('Error', 'Please log in first');
      return;
    }
    
    const today = new Date().getDay(); // 0 for Sunday, 6 for Saturday
    if (dayIndex !== today) {
      Alert.alert('Not Available', 'You can only check in for today!');
      return;
    }
    
    // Prevent double check-in visually immediately
    if (checkIns[dayIndex]) {
        Alert.alert('Already Checked In', 'You already checked in today!');
        return;
    }

    try {
      const result = await CheckInService.recordCheckIn(state.user.uid);

      if (result.alreadyCheckedIn) {
        Alert.alert('Already Checked In', 'You already checked in today!');
        // Ensure UI reflects the state just in case
        setCheckIns(prev => ({ ...prev, [dayIndex]: true }));
      } else {
        // Reload all check-ins to update the UI and streak
        await loadCheckIns();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        Alert.alert('Success', `Checked in for ${dayNames[dayIndex]}! Streak: ${result.streakCount} days 🔥`);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to record check-in');
    }
  };

  // Renamed from handleMoodEntry to avoid confusion
  const handleNavigateToMoodTracker = () => {
    setActiveTab('MoodTracker'); // Set tab state for visual feedback
    navigation.navigate('MoodTracker');
  };

  // Generic navigation handler for bottom tabs
  const handleNavigation = (screen, tabName) => {
    setActiveTab(tabName);
    navigation.navigate(screen);
  };

  // --- Click Handlers for Mood Journey Cards ---

  // Card 1: Mood Today - Navigate to Mood Tracker if no entry, else maybe show details?
  const handleMoodTodayClick = () => {
    const todaysEntry = getTodaysMood();
    if (todaysEntry) {
      // Maybe navigate to a screen showing details of today's mood?
      // For now, let's just go to Analytics
      setActiveTab('Analytics');
      navigation.navigate('Analytics'); 
      console.log("Today's mood already logged:", todaysEntry);
    } else {
      // If no mood logged, prompt user to log it
      handleNavigateToMoodTracker();
    }
  };

  // Card 2: Mood History - Navigate to main SimpleMoodHistory
  const handleMoodHistoryClick = () => {
    // setActiveTab('Analytics'); // Keep this if you want Analytics icon highlighted
    navigation.navigate('SimpleMoodHistory'); // Navigate to the new simplified screen
    console.log("Navigate to Simple Mood History Screen");
  };

  // Card 3: Tasks - Navigate to a Task List screen (To be created)
  const handleTasksClick = () => {
    setActiveTab('TaskList'); // Use a descriptive tab name if needed for styling
    navigation.navigate('TaskList'); // Navigate to the new task list screen
    console.log("Navigate to Task List Screen");
  };

  // Card 4: Task Progress - Navigate to main Analytics for now
  const handleTaskProgressClick = () => {
    // setActiveTab('Analytics'); // Keep if desired
    navigation.navigate('SimpleTaskProgress'); // Navigate to the new screen
    console.log("Navigate to Simple Task Progress Screen");
  };

  const getResourceIcon = (type) => {
      switch (type) {
          case 'helpline': return '📞';
          case 'website': return '🌐';
          case 'article': return '📰';
          case 'video': return '▶️';
          default: return 'ℹ️';
      }
  };
  
  // --- End Click Handlers ---

  // Get data needed for rendering
  const todaysMood = getTodaysMood();
  const completionRate = getCompletionRate();
  const frequentMood = getMostFrequentMood(); // Get the most frequent mood
  const recentTasks = state.taskSummary || []; // Use summary from state

  const previewSupportResources = supportResources.slice(0, 2);

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const todayIndex = new Date().getDay(); // 0 = Sunday

  const wave1TranslateY = wave1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20]
  });

  const wave2TranslateY = wave2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15]
  });

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.safeAreaTop} />
      <View style={styles.mainContent}>
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          bounces={false} // Prevent bounce effect which can look odd with top color
        >
          {/* Top Mood Section */}
          <View style={styles.moodContainer}>
            {/* ... (keep HeaderContainer JSX - profile pic, greeting, notifications) ... */}
            <View style={styles.headerContainer}>
              <TouchableOpacity style={styles.greetingContainer} onPress={handleProfileTasks}>
                <View style={styles.profileIconCircle}>
                  <Text style={styles.profileIconEmoji}>👤</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.greetingText}>Hi,</Text>
                  <Text style={styles.userName} numberOfLines={1}>{state.user?.displayName || 'User'}!</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notificationContainer}
                onPress={handleNotifications}
              >
                <View style={styles.notificationBell}>
                  <Text style={styles.notificationIcon}>🔔</Text>
                  {notificationsEnabled && <View style={styles.notificationDot} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* ... (keep Mood Content JSX - title, subtitle) ... */}
            <View style={styles.moodContent}>
              <Text style={styles.moodTitle}>How are you</Text>
              <View style={styles.feelingTodayContainer}>
                <Text style={styles.moodTitle}>feeling </Text>
                <View style={styles.todayHighlight}>
                  <Text style={styles.moodTitleHighlight}>today?</Text>
                  <View style={styles.underline} />
                </View>
              </View>
              <Text style={styles.moodSubText}>Click ⭐ below to log your mood!</Text>
            </View>
          </View>

          {/* Main Content Area (Cards) */}
          <View style={styles.contentContainer}>
            {/* Animated Wave Background for Content Area */}
            <View style={styles.contentWaveContainer}>
              <Animated.View
                style={[
                  styles.contentWave,
                  styles.contentWave1,
                  { transform: [{ translateY: wave1TranslateY }] }
                ]}
              />
              <Animated.View
                style={[
                  styles.contentWave,
                  styles.contentWave2,
                  { transform: [{ translateY: wave2TranslateY }] }
                ]}
              />
            </View>

            {/* Daily Check-In Card */}
            <View style={styles.card}>
              <View style={styles.checkInHeaderRow}>
                <Text style={styles.sectionYellowTitle}>📅 Daily Check-In</Text>
                {currentStreak > 0 && (
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakIcon}>🔥</Text>
                    <Text style={styles.streakText}>{currentStreak} day{currentStreak !== 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
              <View style={styles.calendarRow}>
                {daysOfWeek.map((day, index) => {
                  const isToday = index === todayIndex;
                  const isCheckedIn = !!checkIns[index]; // Use !! to ensure boolean
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayCircle,
                        isToday && styles.dayCircleToday,
                        isCheckedIn && styles.dayCircleActive
                      ]}
                      onPress={() => handleCheckIn(index)}
                      // Only allow check-in for today, and only if not already checked in
                      disabled={!isToday || isCheckedIn} 
                    >
                      <Text style={[
                        styles.dayText,
                        // If checked in, always use active text style
                        isCheckedIn ? styles.dayTextActive :
                        // If it's today (and not checked in), use the specific inactive today style
                        isToday ? styles.dayCircleTodayTextInactive : null
                      ]}>{day}</Text>
                      {/* Show check only if checked in */}
                      {isCheckedIn && 
                        <Text style={styles.checkIcon}>✓</Text> 
                      }
                      {/* Show circle for today if not checked in */}
                      {isToday && !isCheckedIn &&
                        <View style={styles.todayMarkerCircle} />
                      }
                       {/* Show nothing for past/future days not checked in */}
                       {!isToday && !isCheckedIn &&
                        <View style={styles.emptyDayMarker} />
                       }
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Mood Journey Card Grid */}
            <View style={styles.card}>
              <View style={styles.sectionTitleWrapper}>
                <Text style={styles.sectionYellowTitle}>🌟 Mood Journey</Text>
              </View>
              <View style={styles.moodGrid}>
                
                {/* --- Card 1: Mood Today --- */}
                <TouchableOpacity style={styles.smallCard} onPress={handleMoodTodayClick}>
                  {/* Keep icon */}
                  <View style={[styles.circleIcon, { backgroundColor: '#7B287D' }]} /> 
                  <Text style={styles.smallCardTitle}>Mood Today</Text>
                  {todaysMood ? (
                    <>
                      <Text style={styles.smallCardValueBold}>{todaysMood.moodLabel || 'N/A'}</Text>
                      <Text style={styles.smallCardValue}>({todaysMood.mood}/10)</Text>
                    </>
                  ) : (
                    <Text style={styles.smallCardValue}>Tap to log</Text>
                  )}
                  {/* Changed arrow to be more informative */}
                  <Text style={styles.viewMore}>
                    {todaysMood ? 'View Details →' : 'Log Mood →'}
                  </Text> 
                </TouchableOpacity>
                
                {/* --- Card 2: Mood History (Simplified) --- */}
                <TouchableOpacity style={styles.smallCard} onPress={handleMoodHistoryClick}>
                  {/* Keep icon */}
                  <View style={[styles.circleIcon, { backgroundColor: '#7067CF' }]} /> 
                  <Text style={styles.smallCardTitle}>Mood History</Text>
                  <Text style={styles.smallCardSubtitle}>RECENT TREND</Text>
                  <Text style={styles.smallCardValueBold}>Often: {frequentMood}</Text> 
                  <Text style={styles.viewMore}>View Analytics →</Text>
                </TouchableOpacity>
                
                {/* --- Card 3: Tasks (List) --- */}
                <TouchableOpacity style={styles.smallCard} onPress={handleTasksClick}>
                   {/* Keep icon */}
                  <View style={[styles.circleIcon, { backgroundColor: '#B7C0EE' }]} />
                  <Text style={styles.smallCardTitle}>Tasks</Text>
                  <View style={styles.taskListPreview}>
                    {recentTasks.length > 0 ? (
                      recentTasks.map(task => ( // Use recentTasks from state
                        <View key={task.id} style={styles.taskItem}>
                          <Text style={styles.taskCheckbox}>
                            {task.completed ? '☑' : '☐'}
                          </Text>
                          <Text style={styles.taskText} numberOfLines={1}>
                            {task.title || 'Untitled Task'} {/* Handle missing title */}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noDataText}>No recent tasks</Text>
                    )}
                  </View>
                  <Text style={styles.viewMore}>View All →</Text>
                </TouchableOpacity>
                
                {/* --- Card 4: Task Progress --- */}
                <TouchableOpacity style={styles.smallCard} onPress={handleTaskProgressClick}>
                  {/* Keep icon */}
                  <View style={[styles.circleIcon, { backgroundColor: '#CBF3D2' }]} /> 
                  <Text style={styles.smallCardTitle}>Task Progress</Text>
                  <View style={styles.progressContainer}>
                    <Text style={styles.progressTextLarge}>{completionRate}%</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
                    </View>
                    <Text style={styles.progressSubText}>Completed Today</Text> 
                  </View>
                  <Text style={styles.viewMore}>View Details →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Self-Care Resources Card (Keep existing structure, functionality to be added) */}
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.resourceHeader}
                onPress={() => navigation.navigate('SelfCare')} // Link header to full screen
              >
                <Text style={styles.sectionYellowTitle}>💜 Self-Care Resources</Text>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
              
              {/* Map over the preview resources from state */}
              {previewSupportResources.length > 0 ? (
                previewSupportResources.map((resource) => (
                  <TouchableOpacity 
                    key={resource.id} 
                    style={styles.resourceItem}
                    onPress={() => navigation.navigate('SelfCare')} // Also link items to full screen for now
                  >
                     {/* Use dynamic icon */}
                     <View style={[styles.circleIconSmall, { backgroundColor: '#330C2F' }]} > 
                        <Text style={styles.resourceIconEmoji}>{getResourceIcon(resource.type)}</Text>
                     </View> 
                     {/* Use dynamic name */}
                     <Text style={styles.resourceText}>{resource.name || 'Resource'}</Text>
                     <Text style={styles.arrow}>→</Text>
                  </TouchableOpacity>
                ))
              ) : (
                  // Show message if no resources loaded
                  <Text style={styles.noDataText}>No resources available.</Text>
              )}
            </View>

            {/* Padding at the bottom to avoid overlap with nav bar */}
            <View style={styles.bottomPadding} /> 

            {/* Loading/Error indicators from state */}
            {state.loading && state.user && ( // Only show loading if user is logged in but data isn't ready
              <Text style={styles.loadingText}>Loading your data...</Text>
            )}
            {state.error && (
              <Text style={styles.errorText}>{state.error}</Text>
            )}
          </View>
        </ScrollView>

        {/* --- Bottom Navigation --- */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            {/* Home */}
            <TouchableOpacity
              style={[styles.navIconContainer, activeTab === 'Home' && styles.activeNavContainer]}
              onPress={() => setActiveTab('Home')}
            >
              <Text style={[styles.navIconText, activeTab === 'Home' && styles.activeNavText]}>🏠</Text>
            </TouchableOpacity>
            
            {/* Task Editor/List (Placeholder using Editor for now) */}
            <TouchableOpacity 
              style={[styles.navIconContainer, activeTab === 'TaskList' && styles.activeNavContainer]} 
              onPress={() => handleNavigation('TaskList', 'TaskList')}
            >
              <Text style={[styles.navIconText, activeTab === 'TaskList' && styles.activeNavText]}>📋</Text>
            </TouchableOpacity>
            
            {/* Spacer for Center Button */}
            <View style={styles.centerNavSpacer} /> 
            
            {/* Analytics */}
            <TouchableOpacity 
              style={[styles.navIconContainer, activeTab === 'Analytics' && styles.activeNavContainer]} 
              onPress={() => handleNavigation('Analytics', 'Analytics')}
            >
              <Text style={[styles.navIconText, activeTab === 'Analytics' && styles.activeNavText]}>📊</Text>
            </TouchableOpacity>
            
            {/* Settings */}
            <TouchableOpacity 
              style={[styles.navIconContainer, activeTab === 'Settings' && styles.activeNavContainer]} 
              onPress={() => handleNavigation('Settings', 'Settings')}
            >
              <Text style={[styles.navIconText, activeTab === 'Settings' && styles.activeNavText]}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Center Mood Tracker Button */}
          <TouchableOpacity 
            style={[styles.centerNavButton, activeTab === 'MoodTracker' && styles.centerNavButtonActive]} 
            onPress={handleNavigateToMoodTracker} // Use specific handler
          > 
            <Text style={styles.centerNavText}>⭐</Text>
          </TouchableOpacity>
        </View>
        {/* --- End Bottom Navigation --- */}

      </View>
      <SafeAreaView style={styles.safeAreaBottom} />
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Base color
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // ✅ For Android devices
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // ✅ For Android devices
  },

  safeAreaTop: {
    flex: 0,
    backgroundColor: '#7B287D' // Color for top notch area
  },
  safeAreaBottom: {
    flex: 0,
    backgroundColor: '#F8FAFC' // Match bottom content background
  },
  mainContent: {
    flex: 1,
    // The ScrollView will handle its own background color
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#7B287D' // Top section color
  },
  scrollContent: {
    flexGrow: 1
  },
  moodContainer: { 
    backgroundColor: '#7B287D', // Purple background for top section
    paddingTop: 10, // Adjust as needed
    paddingBottom: 20, // Space before the white content starts
    // Removed shadow as the content below will scroll over it
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Align items vertically
    paddingHorizontal: 20,
    marginBottom: 25,
    marginTop: 10
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Slightly transparent white
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25, // More rounded
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    flex: 1, // Take available space
    marginRight: 15 // Space before notification bell
  },
  profileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileIconEmoji: {
    fontSize: 20,
    color: '#6B7280'
  },
  userInfo: {
    flex: 1 // Allow text to take space but not push bell away
  },
  greetingText: { 
    fontSize: 14, // Slightly smaller
    fontWeight: '500', // Medium weight
    color: '#4B5563' // Darker gray
  },
  userName: { 
    fontSize: 16, // Slightly smaller
    fontWeight: 'bold',
    color: '#1F2937' // Almost black
  },
  // Removed menuIcon styles
  notificationContainer: {
    // Position relative to its parent
  },
  notificationBell: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Match greeting card
    padding: 12,
    borderRadius: 20, // Make it circular
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative' // Needed for the dot positioning
  },
  notificationIcon: { 
    fontSize: 20 
  },
   notificationDot: {
    position: 'absolute',
    top: 6, // Adjust position
    right: 6, // Adjust position
    width: 10, // Slightly larger
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444', // Brighter red
    borderWidth: 1.5,
    borderColor: 'white'
  },
  moodContent: { // Content within the purple section
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 10 // Space before the white part starts
  },
  moodTitle: {
    fontSize: 28, // Maintain size
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 36
  },
  feelingTodayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  todayHighlight: {
    position: 'relative',
    paddingBottom: 4 // Space for underline
  },
  moodTitleHighlight: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700', // Gold color for highlight
    textAlign: 'center',
    lineHeight: 36
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3, // Slightly thinner underline
    backgroundColor: '#FFD700', // Match highlight color
    borderRadius: 2
  },
  moodSubText: { 
    fontSize: 15, // Slightly smaller
    color: 'rgba(255, 255, 255, 0.85)', // More subtle white
    textAlign: 'center',
    marginTop: 5 // Add some space above
  },
  contentContainer: { // White area below the purple section
    flex: 1,
    backgroundColor: '#F8FAFC', // Use the main background color
    paddingTop: 25, // Space between purple and first card
    borderTopLeftRadius: 30, // Curve the top edges
    borderTopRightRadius: 30,
    marginTop: -20, // Pull the white area up slightly into the purple
    position: 'relative',
    overflow: 'hidden'
  },
  contentWaveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    overflow: 'hidden',
    zIndex: 0,
  },
  contentWave: {
    position: 'absolute',
    width: width,
    height: 200,
    borderRadius: width,
  },
  contentWave1: {
    top: -100,
    backgroundColor: '#B7C0EE',
    opacity: 0.15,
  },
  contentWave2: {
    top: -80,
    backgroundColor: '#7B287D',
    opacity: 0.08,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 18, // Consistent spacing
    shadowColor: '#4B5563', // Use a gray shadow color
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, // Subtle opacity
    shadowRadius: 10, // Softer radius
    elevation: 3, // Keep elevation for Android
    zIndex: 1 // Ensure cards appear above wave background
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'left', // Align left for card titles
    color: '#330C2F' // Dark purple title
  },
  sectionYellowTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'left',
    color: '#F59E0B' // Yellow/gold color for section titles
  },
  sectionTitleWrapper: {
    marginBottom: 15
  },
  checkInHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    flexWrap: 'wrap'
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 15,
    flexWrap: 'wrap' // Allow wrapping on smaller screens
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDBA74'
  },
  streakIcon: {
    fontSize: 16,
    marginRight: 4
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C2410C'
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center', // Vertically center the circles
    paddingHorizontal: 5, // Add some horizontal padding if needed
  },
  dayCircle: {
    alignItems: 'center',
    paddingVertical: 8, // Adjust vertical padding
    borderRadius: 20, // Make circles more rounded
    backgroundColor: '#F3F4F6', // Light gray background
    width: 40, // Fixed width
    height: 60, // Fixed height
    justifyContent: 'space-between', // Space text and marker
    borderWidth: 1.5,
    borderColor: '#E5E7EB', // Default subtle border
  },
  dayCircleToday: {
    borderColor: '#FDBA74', // Use a distinct orange border for today
    backgroundColor: '#FFF7ED', // Very light orange background
  },
  dayCircleActive: {
    backgroundColor: '#7067CF', // Keep purple background when checked
    borderColor: '#7067CF', // Match border to background
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563', // Darker gray text for better contrast
  },
  dayTextActive: { // Style for text when circle is active OR today
    color: 'white', // White text on purple background
  },
  // Specific style for today's text *if not* active
  dayCircleTodayTextInactive: {
     color: '#C2410C' // Dark orange text for today marker if not checked in
  },
  checkIcon: { // Checkmark style
    fontSize: 16,
    color: 'white', // White checkmark on purple background
    fontWeight: 'bold',
  },
  todayMarkerCircle: { // Dot marker for today (if not checked)
     width: 8,
     height: 8,
     borderRadius: 4,
     backgroundColor: '#FB923C', // Brighter orange color for today dot marker
  },
  emptyDayMarker: { // Placeholder to maintain height and structure
      width: 8,
      height: 8,
      backgroundColor: 'transparent', // Make it invisible but take space
  },
  moodGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  smallCard: { 
    width: '48%', // Ensure two cards fit per row
    backgroundColor: '#F9FAFB', // Very light gray background
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB', // Subtle border
    minHeight: 165, // Consistent height
    justifyContent: 'space-between' // Space content vertically
  },
  smallCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#330C2F', // Dark purple title
    marginBottom: 5 // Reduced space
  },
  smallCardValue: { // General text inside small card
    fontSize: 13,
    color: '#6B7280', // Medium gray
    marginBottom: 4, // Space below regular value
    flexShrink: 1, // Allow text to shrink if needed
  },
  smallCardValueBold: { // For emphasized values like Mood Label
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937', // Darker text
    marginBottom: 2,
    flexShrink: 1,
  },
  smallCardSubtitle: { // For subtitles like "RECENT TREND"
    fontSize: 10, // Smaller text
    fontWeight: 'bold',
    color: '#9CA3AF', // Lighter gray
    letterSpacing: 0.5, // Add spacing
    marginBottom: 8
  },
  circleIcon: { // Icons for the small cards
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIconSmall: { // Smaller icon for resource list
     width: 24, 
     height: 24, 
     borderRadius: 12, 
     marginRight: 12,
     alignItems: 'center',
     justifyContent: 'center',  
  },
  // Removed moodChart and chartBar styles (placeholder)
  taskListPreview: { // Container for task preview in small card
    marginVertical: 5, // Space around the list
    flex: 1 // Allow list to take available space
  },
  taskItem: { // Individual task item in preview
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6 // Space between items
  },
  taskCheckbox: {
    fontSize: 12,
    marginRight: 8,
    color: '#9CA3AF' // Lighter checkbox color
  },
  taskText: {
    fontSize: 13, // Slightly larger text
    color: '#4B5563', // Darker gray
    flex: 1 // Allow text to wrap/truncate
  },
  progressContainer: { // Container for progress bar in small card
    // Removed marginBottom, handled by card spacing
    flex: 1, // Take available space
    justifyContent: 'center', // Center content vertically
    marginTop: 5,
  },
   progressTextLarge: { // The main percentage text
     fontSize: 24,
     fontWeight: 'bold',
     color: '#330C2F',
     textAlign: 'center',
     marginBottom: 8,
   },
  progressBar: { 
    height: 6, // Thinner bar
    backgroundColor: '#E5E7EB', 
    borderRadius: 3, 
    overflow: 'hidden' // Ensure fill stays within bounds
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#7B287D', // Main purple color
    borderRadius: 3,
  },
  progressSubText: { // Text below progress bar
      fontSize: 11,
      color: '#6B7280',
      textAlign: 'center',
      marginTop: 6,
  },
  viewMore: { // "View More" text at bottom of small cards
    color: '#7067CF', // Link color
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-end', // Align to the right
    marginTop: 8 // Space above
  },
  noDataText: { // Text when no tasks/moods are available
    fontSize: 13, // Match task text size
    color: '#9CA3AF', // Light gray
    fontStyle: 'italic',
    textAlign: 'center', // Center align
    marginTop: 10, // Add some top margin
  },
  resourceHeader: { // Header for resource card
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0 // Title already has margin bottom
  },
  resourceItem: { // Individual resource item row
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F9FAFB', 
    paddingVertical: 12,
    paddingHorizontal: 15, 
    borderRadius: 10, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resourceText: { // Text for the resource
      flex: 1, // Take available space
      fontSize: 14,
      fontWeight: '500',
      color: '#374151', // Dark gray text
  },
  // Removed resourceScore and resourceBar styles (placeholders)
  arrow: { // Arrow icon for navigation indication
    fontSize: 18, // Slightly larger arrow
    color: '#9CA3AF' // Light gray arrow
  },
  resourceIconEmoji: { // Style for emoji inside small circle
    fontSize: 14, 
  },
  bottomPadding: { // Space at the very bottom of the scroll view
    height: 100 // Ensure content clears bottom nav bar
  },
  bottomNavContainer: { // Wrapper for the nav bar and center button
    position: 'absolute', // Position at the bottom
    bottom: 0, // Stick to the bottom
    left: 0,
    right: 0,
    alignItems: 'center', // Center the content horizontally
    paddingBottom: 25, // Space from screen edge (adjust for safe area if needed)
    paddingHorizontal: 20, // Side padding
  },
  bottomNav: { // The main bar excluding the center button
    flexDirection: 'row', 
    justifyContent: 'space-around', // Distribute icons evenly
    alignItems: 'center', // Center icons vertically
    backgroundColor: '#330C2F', // Dark purple background
    borderRadius: 30, // Rounded corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 }, // Adjust shadow
    shadowOpacity: 0.2, // Adjust shadow
    shadowRadius: 10,
    elevation: 8,
    width: '100%', // Take full width within padding
    height: 65, // Fixed height for the bar
    paddingHorizontal: 15, // Padding inside the bar
  },
  navIconContainer: { // Wrapper for each icon for touch area and centering
    flex: 1, // Each icon takes equal space
    alignItems: 'center', // Center icon horizontally
    justifyContent: 'center', // Center icon vertically
    height: '100%', // Take full height of the bar
    borderRadius: 25, // Rounded corners for potential active state background
  },
  activeNavContainer: { // Style for the active icon's container
    backgroundColor: 'rgba(123, 40, 125, 0.3)', // Active background for selected tab
    borderRadius: 25,
  },
  navIconText: { // Style for the icon emoji/text
    fontSize: 24, // Icon size
    color: '#A78BFA', // Lighter purple color for inactive icons
    opacity: 0.8, // Slightly transparent inactive icons
  },
  activeNavText: { // Style for the active icon emoji/text
    color: '#FFFFFF', // White color for active icon
    opacity: 1, // Fully opaque
  },
  centerNavSpacer: { // Invisible spacer to push side icons away from center
    width: 70, // Match the width of the center button
  },
  centerNavButton: { // The floating center button
    position: 'absolute', // Position over the bar
    bottom: 50, // Position relative to the bottomNavContainer bottom (adjust as needed)
    width: 70, // Button size
    height: 70,
    borderRadius: 35, // Circular
    backgroundColor: '#7067CF', // Accent purple color
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, // Adjust shadow
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 4, // White border
    borderColor: '#F8FAFC' // Match the content background for seamless look
  },
  centerNavButtonActive: { // Style when the center button's screen is active
    backgroundColor: '#A78BFA', // Lighter purple when active
    transform: [{ scale: 1.05 }], // Slight scale effect
  },
  centerNavText: { // Icon inside the center button
    fontSize: 28, // Icon size
    color: 'white' // White icon
  },
  loadingText: { // Text shown while loading data
    textAlign: 'center', 
    color: '#6B7280', 
    marginTop: 20,
    fontSize: 14,
    paddingBottom: 100, // Ensure visible above nav bar
  },
  errorText: { // Text shown on error
    textAlign: 'center', 
    color: '#EF4444', // Red color for errors
    marginTop: 20,
    fontSize: 14,
    paddingBottom: 100, // Ensure visible above nav bar
  }
});

// Need to load the default profile image asset
// Make sure you have 'default-profile.png' in your assets folder
// import defaultProfileImage from '../assets/default-profile.png';