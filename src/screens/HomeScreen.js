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
    const todaysEntry = state.moods.find(mood => mood.date === today);
    return todaysEntry; 
  };

  // Calculates task completion rate from tasks in state
  const getCompletionRate = () => {
    if (!state.tasks || state.tasks.length === 0) return 0;
    const completed = state.tasks.filter(task => task.completed).length;
    return Math.round((completed / state.tasks.length) * 100);
  };
  
  // Gets the most frequent mood label from recent moods
  const getMostFrequentMood = () => {
    if (!state.moods || state.moods.length === 0) return 'N/A';
    const mostFrequent = getMostFrequent(state.moods, 'moodLabel'); 
    return mostFrequent ? mostFrequent.key : 'N/A';
  };
  
  // --- End Derived Data Functions ---

  const handleCheckIn = async (dayIndex) => {
    if (!state.user?.uid) {
      Alert.alert('Error', 'Please log in first');
      return;
    }
    
    const today = new Date().getDay();
    if (dayIndex !== today) {
      Alert.alert('Not Available', 'You can only check in for today!');
      return;
    }
    
    if (checkIns[dayIndex]) {
        Alert.alert('Already Checked In', 'You already checked in today!');
        return;
    }

    try {
      const result = await CheckInService.recordCheckIn(state.user.uid);

      if (result.alreadyCheckedIn) {
        Alert.alert('Already Checked In', 'You already checked in today!');
        setCheckIns(prev => ({ ...prev, [dayIndex]: true }));
      } else {
        await loadCheckIns();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        Alert.alert('Success', `Checked in for ${dayNames[dayIndex]}! Streak: ${result.streakCount} days 🔥`);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to record check-in');
    }
  };

  const handleNavigateToMoodTracker = () => {
    setActiveTab('MoodTracker');
    navigation.navigate('MoodTracker');
  };

  const handleNavigation = (screen, tabName) => {
    setActiveTab(tabName);
    navigation.navigate(screen);
  };

  // --- Click Handlers for Mood Journey Cards ---

  const handleMoodTodayClick = () => {
    const todaysEntry = getTodaysMood();
    if (todaysEntry) {
      setActiveTab('Analytics');
      navigation.navigate('Analytics'); 
      console.log("Today's mood already logged:", todaysEntry);
    } else {
      handleNavigateToMoodTracker();
    }
  };

  const handleMoodHistoryClick = () => {
    navigation.navigate('SimpleMoodHistory');
    console.log("Navigate to Simple Mood History Screen");
  };

  const handleTasksClick = () => {
    setActiveTab('TaskList');
    navigation.navigate('TaskList');
    console.log("Navigate to Task List Screen");
  };

  const handleTaskProgressClick = () => {
    navigation.navigate('SimpleTaskProgress');
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
  const frequentMood = getMostFrequentMood();
  const recentTasks = state.taskSummary || [];

  const previewSupportResources = supportResources.slice(0, 2);

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const todayIndex = new Date().getDay();

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
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Mood Section with Wave Background */}
          <View style={styles.moodContainer}>
            {/* Animated Wave Background */}
            <View style={styles.waveContainer}>
              <Animated.View
                style={[
                  styles.wave,
                  styles.wave1,
                  { transform: [{ translateY: wave1TranslateY }] }
                ]}
              />
              <Animated.View
                style={[
                  styles.wave,
                  styles.wave2,
                  { transform: [{ translateY: wave2TranslateY }] }
                ]}
              />
            </View>

            {/* Header Container */}
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

            {/* Mood Content */}
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
            {/* Daily Check-In Card */}
            <View style={styles.card}>
              <View style={styles.checkInHeaderRow}>
                <Text style={styles.sectionTitle}>Daily Check-In</Text>
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
                  const isCheckedIn = !!checkIns[index];
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayCircle,
                        isToday && styles.dayCircleToday,
                        isCheckedIn && styles.dayCircleActive
                      ]}
                      onPress={() => handleCheckIn(index)}
                      disabled={!isToday || isCheckedIn} 
                    >
                      <Text style={[
                        styles.dayText,
                        isCheckedIn ? styles.dayTextActive :
                        isToday ? styles.dayCircleTodayTextInactive : null
                      ]}>{day}</Text>
                      {isCheckedIn && 
                        <Text style={styles.checkIcon}>✓</Text> 
                      }
                      {isToday && !isCheckedIn &&
                        <View style={styles.todayMarkerCircle} />
                      }
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
                <Text style={styles.sectionTitle}>Mood Journey</Text>
              </View>
              <View style={styles.moodGrid}>
                
                {/* Card 1: Mood Today */}
                <TouchableOpacity style={styles.smallCard} onPress={handleMoodTodayClick}>
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
                  <Text style={styles.viewMore}>
                    {todaysMood ? 'View Details →' : 'Log Mood →'}
                  </Text> 
                </TouchableOpacity>
                
                {/* Card 2: Mood History */}
                <TouchableOpacity style={styles.smallCard} onPress={handleMoodHistoryClick}>
                  <View style={[styles.circleIcon, { backgroundColor: '#7067CF' }]} /> 
                  <Text style={styles.smallCardTitle}>Mood History</Text>
                  <Text style={styles.smallCardSubtitle}>RECENT TREND</Text>
                  <Text style={styles.smallCardValueBold}>Often: {frequentMood}</Text> 
                  <Text style={styles.viewMore}>View Analytics →</Text>
                </TouchableOpacity>
                
                {/* Card 3: Tasks */}
                <TouchableOpacity style={styles.smallCard} onPress={handleTasksClick}>
                  <View style={[styles.circleIcon, { backgroundColor: '#B7C0EE' }]} />
                  <Text style={styles.smallCardTitle}>Tasks</Text>
                  <View style={styles.taskListPreview}>
                    {recentTasks.length > 0 ? (
                      recentTasks.map(task => (
                        <View key={task.id} style={styles.taskItem}>
                          <Text style={styles.taskCheckbox}>
                            {task.completed ? '☑' : '☐'}
                          </Text>
                          <Text style={styles.taskText} numberOfLines={1}>
                            {task.title || 'Untitled Task'}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noDataText}>No recent tasks</Text>
                    )}
                  </View>
                  <Text style={styles.viewMore}>View All →</Text>
                </TouchableOpacity>
                
                {/* Card 4: Task Progress */}
                <TouchableOpacity style={styles.smallCard} onPress={handleTaskProgressClick}>
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

            {/* Self-Care Resources Card */}
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.resourceHeader}
                onPress={() => navigation.navigate('SelfCare')}
              >
                <Text style={styles.sectionTitle}>Self-Care Resources</Text>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
              
              {previewSupportResources.length > 0 ? (
                previewSupportResources.map((resource) => (
                  <TouchableOpacity 
                    key={resource.id} 
                    style={styles.resourceItem}
                    onPress={() => navigation.navigate('SelfCare')}
                  >
                     <View style={[styles.circleIconSmall, { backgroundColor: '#330C2F' }]} > 
                        <Text style={styles.resourceIconEmoji}>{getResourceIcon(resource.type)}</Text>
                     </View> 
                     <Text style={styles.resourceText}>{resource.name || 'Resource'}</Text>
                     <Text style={styles.arrow}>→</Text>
                  </TouchableOpacity>
                ))
              ) : (
                  <Text style={styles.noDataText}>No resources available.</Text>
              )}
            </View>

            {/* Padding at the bottom to avoid overlap with nav bar */}
            <View style={styles.bottomPadding} /> 

            {/* Loading/Error indicators from state */}
            {state.loading && state.user && (
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
            
            {/* Task Editor/List */}
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
            onPress={handleNavigateToMoodTracker}
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
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  safeAreaTop: {
    flex: 0,
    backgroundColor: '#7B287D'
  },
  safeAreaBottom: {
    flex: 0,
    backgroundColor: '#F8FAFC'
  },
  mainContent: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#7B287D'
  },
  scrollContent: {
    flexGrow: 1
  },
  moodContainer: { 
    backgroundColor: '#7B287D',
    paddingTop: 10,
    paddingBottom: 50, // Increased padding for better spacing
    position: 'relative',
    overflow: 'hidden',
  },
  waveContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    width: width,
    height: 300,
    borderRadius: width,
  },
  wave1: {
    top: -150,
    backgroundColor: '#B7C0EE',
    opacity: 0.2,
  },
  wave2: {
    top: -120,
    backgroundColor: '#9067CF',
    opacity: 0.15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 25,
    marginTop: 10,
    zIndex: 10,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    flex: 1,
    marginRight: 15
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
    flex: 1
  },
  greetingText: { 
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563'
  },
  userName: { 
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  notificationContainer: {
    zIndex: 10,
  },
  notificationBell: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative'
  },
  notificationIcon: { 
    fontSize: 20 
  },
   notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: 'white'
  },
  moodContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 10,
    zIndex: 10,
  },
  moodTitle: {
    fontSize: 28,
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
    paddingBottom: 4
  },
  moodTitleHighlight: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    lineHeight: 36
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FFD700',
    borderRadius: 2
  },
  moodSubText: { 
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginTop: 5
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 25,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    position: 'relative',
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 18,
    shadowColor: '#4B5563',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'left',
    color: '#1F2937', // Changed to black/dark gray
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
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  dayCircle: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    width: 40,
    height: 60,
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  dayCircleToday: {
    borderColor: '#FDBA74',
    backgroundColor: '#FFF7ED',
  },
  dayCircleActive: {
    backgroundColor: '#7067CF',
    borderColor: '#7067CF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  dayTextActive: {
    color: 'white',
  },
  dayCircleTodayTextInactive: {
     color: '#C2410C'
  },
  checkIcon: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  todayMarkerCircle: {
     width: 8,
     height: 8,
     borderRadius: 4,
     backgroundColor: '#FB923C',
  },
  emptyDayMarker: {
      width: 8,
      height: 8,
      backgroundColor: 'transparent',
  },
  moodGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  smallCard: { 
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 165,
    justifyContent: 'space-between'
  },
  smallCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#330C2F',
    marginBottom: 5
  },
  smallCardValue: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    flexShrink: 1,
  },
  smallCardValueBold: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
    flexShrink: 1,
  },
  smallCardSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  circleIcon: {
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIconSmall: {
     width: 24, 
     height: 24, 
     borderRadius: 12, 
     marginRight: 12,
     alignItems: 'center',
     justifyContent: 'center',  
  },
  taskListPreview: {
    marginVertical: 5,
    flex: 1
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  taskCheckbox: {
    fontSize: 12,
    marginRight: 8,
    color: '#9CA3AF'
  },
  taskText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 5,
  },
   progressTextLarge: {
     fontSize: 24,
     fontWeight: 'bold',
     color: '#330C2F',
     textAlign: 'center',
     marginBottom: 8,
   },
  progressBar: { 
    height: 6,
    backgroundColor: '#E5E7EB', 
    borderRadius: 3, 
    overflow: 'hidden'
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#7B287D',
    borderRadius: 3,
  },
  progressSubText: {
      fontSize: 11,
      color: '#6B7280',
      textAlign: 'center',
      marginTop: 6,
  },
  viewMore: {
    color: '#7067CF',
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginTop: 8
  },
  noDataText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0
  },
  resourceItem: {
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
  resourceText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: '#374151',
  },
  arrow: {
    fontSize: 18,
    color: '#9CA3AF'
  },
  resourceIconEmoji: {
    fontSize: 14, 
  },
  bottomPadding: {
    height: 100
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  bottomNav: {
    flexDirection: 'row', 
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#330C2F',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    width: '100%',
    height: 65,
    paddingHorizontal: 15,
  },
  navIconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    borderRadius: 25,
  },
  activeNavContainer: {
    backgroundColor: 'rgba(123, 40, 125, 0.3)',
    borderRadius: 25,
  },
  navIconText: {
    fontSize: 24,
    color: '#A78BFA',
    opacity: 0.8,
  },
  activeNavText: {
    color: '#FFFFFF',
    opacity: 1,
  },
  centerNavSpacer: {
    width: 70,
  },
  centerNavButton: {
    position: 'absolute',
    bottom: 50,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#7067CF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#F8FAFC'
  },
  centerNavButtonActive: {
    backgroundColor: '#A78BFA',
    transform: [{ scale: 1.05 }],
  },
  centerNavText: {
    fontSize: 28,
    color: 'white'
  },
  loadingText: {
    textAlign: 'center', 
    color: '#6B7280', 
    marginTop: 20,
    fontSize: 14,
    paddingBottom: 100,
  },
  errorText: {
    textAlign: 'center', 
    color: '#EF4444',
    marginTop: 20,
    fontSize: 14,
    paddingBottom: 100,
  }
});

// Need to load the default profile image asset
// Make sure you have 'default-profile.png' in your assets folder
// import defaultProfileImage from '../assets/default-profile.png';