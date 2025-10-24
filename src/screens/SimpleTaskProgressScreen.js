// src/screens/SimpleTaskProgressScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';

const { width } = Dimensions.get('window');

const SimpleTaskProgressScreen = () => {
  const navigation = useNavigation();
  const { state } = useApp();
  const { tasks } = state; // Get tasks from global state

  const [stats, setStats] = useState({
    overallCompletionRate: 0,
    totalTasks: 0,
    completedTasks: 0,
    // Add stats for today/week if needed later
  });

  useEffect(() => {
    calculateStats(tasks);
  }, [tasks]); // Recalculate if tasks change

  // Calculate overall progress stats
  const calculateStats = (taskData) => {
    if (!Array.isArray(taskData) || taskData.length === 0) {
      setStats({
        overallCompletionRate: 0,
        totalTasks: 0,
        completedTasks: 0,
      });
      return;
    }

    const total = taskData.length;
    const completed = taskData.filter(task => task.completed).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    console.log(`[SimpleTaskProgress] Stats: Total=${total}, Completed=${completed}, Rate=${rate}%`);

    setStats({
      overallCompletionRate: rate,
      totalTasks: total,
      completedTasks: completed,
    });
  };

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
        <Text style={styles.headerTitle}>Task Progress Overview</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.container}>
        {tasks.length > 0 ? (
          <>
            {/* Overall Progress Card */}
            <View style={styles.progressCard}>
              <Text style={styles.cardTitle}>Overall Progress</Text>
              <View style={styles.progressCircleContainer}>
                <View style={[styles.progressCircle, {
                  // Change color based on completion rate
                  backgroundColor: stats.overallCompletionRate >= 75 ? '#7067CF' :
                                  stats.overallCompletionRate >= 40 ? '#7B287D' : '#F79256'
                }]}>
                  <Text style={styles.progressText}>{stats.overallCompletionRate}%</Text>
                </View>
                <Text style={styles.progressLabel}>All Tasks Completed</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.completedTasks}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.totalTasks - stats.completedTasks}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.totalTasks}</Text>
                  <Text style={styles.statLabel}>Total Tasks</Text>
                </View>
              </View>
            </View>

            {/* Placeholder for Weekly/Today Stats - Add later if needed */}
            {/*
            <View style={styles.detailCard}>
              <Text style={styles.cardTitle}>Recent Activity</Text>
              <Text style={styles.comingSoonText}>More detailed weekly/daily stats coming soon!</Text>
            </View>
            */}

            {/* Link to Full Analytics */}
            <TouchableOpacity
              style={styles.fullAnalyticsButton}
              onPress={() => navigation.navigate('Analytics')}
            >
              <Text style={styles.fullAnalyticsButtonText}>View Full Analytics</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.centerStatus}>No tasks found. Add some tasks to see your progress!</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  progressCard: {
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
    marginBottom: 25, // More space below title
    textAlign: 'center'
  },
  progressCircleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  progressCircle: {
    width: 150, // Larger circle
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    // Background color set dynamically
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  progressText: {
    fontSize: 36, // Larger text
    fontWeight: 'bold',
    color: 'white',
  },
  progressLabel: {
      fontSize: 14,
      color: '#6B7280',
      fontWeight: '500'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
    marginTop: 10,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 5,
  },
  statValue: {
    fontSize: 24, // Larger stat values
    fontWeight: 'bold',
    color: '#7B287D',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 13, // Smaller labels
    color: '#6B7280',
    textAlign: 'center',
  },
  detailCard: { // Placeholder for future details
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
  comingSoonText: {
      fontSize: 14,
      color: '#9CA3AF',
      textAlign: 'center',
      paddingVertical: 20,
      fontStyle: 'italic',
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
});

export default SimpleTaskProgressScreen;