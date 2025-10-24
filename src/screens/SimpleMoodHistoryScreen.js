// src/screens/SimpleMoodHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StatusBar, Platform

} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import MoodService from '../services/MoodService'; // Keep for potential refetch, though using state now
import { getMostFrequent } from '../utils/helpers';

const { width } = Dimensions.get('window');

const SimpleMoodHistoryScreen = () => {
  const navigation = useNavigation();
  const { state } = useApp();
  // Directly use moods from global state. AppContext should ensure this is up-to-date.
  const { user, moods: recentMoods } = state;

  const [loading, setLoading] = useState(false); // Not really loading data here, just calculating
  const [stats, setStats] = useState({
    mostFrequentMood: 'N/A',
    averageMood: 0,
    moodDistribution: {},
    totalEntries: 0
  });

  useEffect(() => {
    console.log('[SimpleMoodHistoryScreen] Received moods from context:', recentMoods); // Log received data
    calculateStats(recentMoods);
  }, [recentMoods]);

  const calculateStats = (moodData) => {
    // --- Safety Check 1: Ensure moodData is an array ---
    if (!Array.isArray(moodData) || moodData.length === 0) {
      console.log('[SimpleMoodHistoryScreen] No valid mood data found.');
      setStats({
          mostFrequentMood: 'N/A',
          averageMood: 0,
          moodDistribution: {},
          totalEntries: 0
      });
      return;
    }

    const totalEntries = moodData.length;
    let sumOfMoods = 0;
    let validMoodCount = 0;

    // --- Calculate Average Mood Safely ---
    moodData.forEach(mood => {
      // --- Safety Check 2: Ensure mood.mood is a number ---
      if (typeof mood.mood === 'number' && !isNaN(mood.mood)) {
        sumOfMoods += mood.mood;
        validMoodCount++;
      } else {
         console.warn(`[SimpleMoodHistoryScreen] Invalid mood value found:`, mood); // Log invalid entries
      }
    });

    // --- Safety Check 3: Avoid division by zero ---
    const average = validMoodCount > 0 ? sumOfMoods / validMoodCount : 0;
    console.log(`[SimpleMoodHistoryScreen] Average calculation: Sum=${sumOfMoods}, Count=${validMoodCount}, Avg=${average}`);


    // --- Calculate Most Frequent Mood ---
    const mostFrequent = getMostFrequent(moodData, 'moodLabel');
    console.log('[SimpleMoodHistoryScreen] Most frequent mood result:', mostFrequent); // Log result from helper


    // --- Calculate Distribution ---
    const distribution = moodData.reduce((acc, mood) => {
      // --- Safety Check 4: Ensure moodLabel is a string ---
      const label = (typeof mood.moodLabel === 'string' && mood.moodLabel.trim()) ? mood.moodLabel.trim() : 'Unknown';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    console.log('[SimpleMoodHistoryScreen] Mood distribution:', distribution);


    setStats({
      mostFrequentMood: mostFrequent ? mostFrequent.key : 'N/A',
      averageMood: Math.round(average * 10) / 10,
      moodDistribution: distribution,
      totalEntries: totalEntries // Use original totalEntries for display consistency
    });
  };

  const getEmojiForLabel = (label) => {
      // --- Safety Check 5: Handle null/undefined label ---
      const safeLabel = label || 'Unknown';
      const moodMapping = {
          'Terrible': '😢', 'Very Bad': '😟', 'Bad': '😕', 'Poor': '😐',
          'Okay': '😌', 'Good': '🙂', 'Very Good': '😊', 'Great': '😄',
          'Amazing': '😁', 'Perfect': '🤩',
          'N/A': '❓', 'Unknown': '❓' // Added Unknown mapping
      };
      // --- Safety Check 6: Fallback if label not in mapping ---
      return moodMapping[safeLabel] || '❓';
  };

  const renderDistributionBar = (label, count, maxCount) => {
    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
    // --- Safety Check 7: Ensure label exists before rendering ---
    if (!label) return null;
    return (
      <View key={label} style={styles.barContainer}>
        <Text style={styles.barLabel}>{getEmojiForLabel(label)} {label}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.barCount}>{count}</Text>
      </View>
    );
  };

  // Prepare data for the distribution chart
  const moodLabelsSorted = Object.keys(stats.moodDistribution).sort((a,b) => stats.moodDistribution[b] - stats.moodDistribution[a]);
  const maxCount = Math.max(...Object.values(stats.moodDistribution), 0);


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recent Mood Summary</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.container}>
        {loading ? ( // Should not be true unless refetching is added
          <ActivityIndicator size="large" color="#7B287D" style={styles.centerStatus} />
        ) : recentMoods.length > 0 ? ( // Check if there are any moods from context
          <>
            {/* Summary Stats */}
            <View style={styles.summaryCard}>
              {/* Use stats.totalEntries which reflects original array length */}
              <Text style={styles.cardTitle}>Last {stats.totalEntries} Entries Overview</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Avg Mood</Text>
                    {/* Display the calculated average */}
                    <Text style={styles.statValue}>{stats.averageMood}/10</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Most Frequent</Text>
                    {/* Display the calculated most frequent */}
                    <Text style={styles.statValue}>{getEmojiForLabel(stats.mostFrequentMood)} {stats.mostFrequentMood}</Text>
                </View>
              </View>
            </View>

            {/* Mood Distribution Chart */}
            <View style={styles.distributionCard}>
              <Text style={styles.cardTitle}>Mood Distribution</Text>
              {moodLabelsSorted.length > 0 ? (
                 moodLabelsSorted.map(label => renderDistributionBar(label, stats.moodDistribution[label], maxCount))
              ) : (
                <Text style={styles.noDataText}>Not enough data for distribution.</Text>
              )}
            </View>

            {/* Link to Full Analytics */}
            <TouchableOpacity
              style={styles.fullAnalyticsButton}
              onPress={() => navigation.navigate('Analytics')}
            >
              <Text style={styles.fullAnalyticsButtonText}>View Full Analytics</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.centerStatus}>No mood history found. Start logging your mood!</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles --- (Keep all your existing styles the same)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  centerStatus: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#4B5563',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 20,
    textAlign: 'center'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7B287D',
    textAlign: 'center',
  },
  distributionCard: {
      backgroundColor: 'white',
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
      shadowColor: '#4B5563',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  barLabel: {
    fontSize: 14,
    color: '#4B5563',
    width: 110, // Fixed width for labels
  },
  barTrack: {
    flex: 1, // Take remaining space
    height: 12, // Make bars thicker
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#A78BFA', // Lighter purple for bars
    borderRadius: 6,
  },
  barCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    minWidth: 20, // Ensure space for count number
    textAlign: 'right',
  },
  fullAnalyticsButton: {
    backgroundColor: '#330C2F',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  fullAnalyticsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  }
});

export default SimpleMoodHistoryScreen;