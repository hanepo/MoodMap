import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import MoodService from '../services/MoodService';
import SelfCareService from '../services/SelfCareService';

const { width } = Dimensions.get('window');

const SelfCareScreen = () => {
  const navigation = useNavigation();
  const { state } = useApp();
  const [loading, setLoading] = useState(true);
  const [moodCategory, setMoodCategory] = useState(null);
  const [averageMood, setAverageMood] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [supportContacts, setSupportContacts] = useState([]);

  // Animated values for wave effect
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserData();
    startWaveAnimation();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

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

  const loadUserData = async () => {
    setLoading(true);
    try {
      if (!state.user?.uid) return;

      // Fetch recent moods (last 7 days)
      const moods = await MoodService.getRecentMoods(state.user.uid, 7);

      if (moods.length === 0) {
        setMoodCategory('none');
        // Load general tips from Firebase
        const generalActivities = await SelfCareService.getActivitiesByMood('general');
        setRecommendations(generalActivities.filter(a => a.isActive !== false));
      } else {
        // Calculate average mood
        const avg = moods.reduce((sum, m) => sum + (m.mood || 0), 0) / moods.length;
        setAverageMood(avg);

        // Determine mood category
        const category = getMoodCategory(avg);
        setMoodCategory(category);

        // Load recommendations from Firebase based on mood
        const activities = await SelfCareService.getActivitiesByMood(category);
        setRecommendations(activities.filter(a => a.isActive !== false));
      }

      // Load helpline contacts from Firebase
      const contacts = await SelfCareService.getHelplineContacts();
      setSupportContacts(contacts.filter(c => c.isActive !== false));

    } catch (error) {
      console.error('Error loading self-care data:', error);
      setMoodCategory('none');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const getMoodCategory = (avgMood) => {
    if (avgMood <= 4) return 'low';
    if (avgMood <= 7) return 'medium';
    return 'high';
  };

  const getCategoryInfo = () => {
    switch (moodCategory) {
      case 'low':
        return {
          label: 'Low Mood',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          emoji: '🌧️'
        };
      case 'medium':
        return {
          label: 'Medium Mood',
          color: '#3B82F6',
          bgColor: '#DBEAFE',
          emoji: '⛅'
        };
      case 'high':
        return {
          label: 'High Mood',
          color: '#10B981',
          bgColor: '#D1FAE5',
          emoji: '☀️'
        };
      default:
        return {
          label: 'No Data',
          color: '#6B7280',
          bgColor: '#F3F4F6',
          emoji: '📊'
        };
    }
  };

  const handleActivityPress = async (activity) => {
    if (activity.action === 'link' && activity.link) {
      Linking.openURL(activity.link).catch(err => {
        console.error('Failed to open URL:', err);
        Alert.alert('Error', 'Could not open the link.');
      });
    } else {
      // Show guide in alert
      Alert.alert(
        activity.title,
        activity.description + '\n\n✅ Take your time and focus on the activity. You\'re doing great!',
        [
          {
            text: 'Mark as Done',
            onPress: async () => {
              try {
                // Record completion in Firebase
                await SelfCareService.recordCompletion(
                  state.user.uid,
                  activity.id,
                  activity.title
                );
                Alert.alert('Well Done! 🎉', 'Keep taking care of yourself!');
              } catch (error) {
                console.error('Error recording completion:', error);
                Alert.alert('Well Done! 🎉', 'Keep taking care of yourself!');
              }
            }
          },
          { text: 'Close', style: 'cancel' }
        ]
      );
    }
  };

  const handleContactPress = (contact) => {
    let url = null;

    if (contact.type === 'helpline' && contact.phone) {
      const phoneNumber = contact.phone.replace(/[^0-9+]/g, '');
      url = `tel:${phoneNumber}`;
    } else if (contact.type === 'whatsapp' && contact.phone) {
      const phoneNumber = contact.phone.replace(/[^0-9+]/g, '');
      url = `https://wa.me/${phoneNumber}`;
    } else if (contact.link) {
      url = contact.link;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
    }

    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Failed to open URL:', err);
        Alert.alert('Error', 'Could not open the link or dial the number.');
      });
    }
  };

  const wave1TranslateY = wave1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20]
  });

  const wave2TranslateY = wave2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15]
  });

  const categoryInfo = getCategoryInfo();

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B287D" />
          <Text style={styles.loadingText}>Loading your self-care plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadUserData}
        >
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Take Care of Yourself 💜</Text>
            <Text style={styles.heroSubtitle}>
              Based on your recent moods, here are activities just for you.
            </Text>

            {moodCategory !== 'none' && (
              <View style={[styles.moodBadge, { backgroundColor: categoryInfo.bgColor }]}>
                <Text style={styles.moodEmoji}>{categoryInfo.emoji}</Text>
                <Text style={[styles.moodBadgeText, { color: categoryInfo.color }]}>
                  {categoryInfo.label}
                </Text>
                {averageMood > 0 && (
                  <Text style={[styles.moodScore, { color: categoryInfo.color }]}>
                    {averageMood.toFixed(1)}/10
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Self-Care Suggestions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {moodCategory === 'none' ? '💡 General Self-Care Tips' : '✨ Recommended Activities'}
            </Text>
            {recommendations.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => handleActivityPress(activity)}
              >
                <View style={styles.activityHeader}>
                  <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                  </View>
                </View>
                <View style={styles.activityButton}>
                  <Text style={styles.activityButtonText}>
                    {activity.action === 'link' ? 'Learn More' : 'Start'}
                  </Text>
                  <Text style={styles.activityButtonIcon}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Helpline & Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤝 Need Someone to Talk To?</Text>
            <Text style={styles.sectionSubtitle}>
              You're not alone. Reach out for support anytime.
            </Text>

            {/* All Support Contacts from Firebase */}
            {supportContacts.length === 0 ? (
              <Text style={styles.emptyText}>No support contacts available.</Text>
            ) : (
              supportContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.supportCard}
                  onPress={() => handleContactPress(contact)}
                >
                  <Text style={styles.supportIcon}>
                    {contact.icon || (contact.type === 'helpline' ? '📞' : contact.type === 'whatsapp' ? '💬' : contact.type === 'website' ? '🌐' : 'ℹ️')}
                  </Text>
                  <View style={styles.supportContent}>
                    <Text style={styles.supportTitle}>{contact.name}</Text>
                    <Text style={styles.supportDescription}>{contact.description}</Text>
                  </View>
                  <Text style={styles.supportArrow}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6B7280',
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
    opacity: 0.3,
  },
  wave2: {
    top: -120,
    backgroundColor: '#7B287D',
    opacity: 0.15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
  backIcon: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
    marginLeft: -2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
  refreshIcon: {
    fontSize: 24,
    color: '#7B287D',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  moodEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  moodBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  moodScore: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 15,
    lineHeight: 20,
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  activityEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330C2F',
    marginBottom: 6,
  },
  activityDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  activityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#7B287D',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  activityButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  activityButtonIcon: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  supportIcon: {
    fontSize: 28,
    marginRight: 16,
    width: 40,
    textAlign: 'center',
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330C2F',
    marginBottom: 4,
  },
  supportDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  supportArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    marginLeft: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default SelfCareScreen;
