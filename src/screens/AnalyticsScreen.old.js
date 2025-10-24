import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
  Dimensions
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useApp } from '../contexts/AppContext';
import CheckInService from '../services/CheckInService';
import MoodService from '../services/MoodService';
import TaskService from '../services/TaskService';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen({ navigation }) {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('MoodHistory');
  const [timePeriod, setTimePeriod] = useState('Week'); // Week, Month, Year
  const [loading, setLoading] = useState(true);
  const [checkInDates, setCheckInDates] = useState({});

  // Mood History Data
  const [moodHistoryData, setMoodHistoryData] = useState({
    labels: [],
    scores: [],
    dates: [],
    moods: []
  });
  const [moodStats, setMoodStats] = useState({
    average: 0,
    highest: { score: 0, date: null },
    lowest: { score: 10, date: null },
    mostCommon: 'N/A',
    consistency: 0,
    trend: 'stable'
  });
  const [moodDistribution, setMoodDistribution] = useState([]);

  // Productivity Data
  const [productivityData, setProductivityData] = useState({
    correlationCoefficient: 0,
    bestPerformanceMood: null,
    mostProductiveTime: 'N/A',
    averageCompletionRate: 0,
    trendDirection: 'stable'
  });
  const [moodTaskCorrelation, setMoodTaskCorrelation] = useState([]);

  // Weekly Progress Data
  const [weeklyProgress, setWeeklyProgress] = useState({
    dailyData: [],
    totalCompleted: 0,
    avgMood: 0,
    consistency: 0,
    productivityScore: 0
  });
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

  const [todayStats, setTodayStats] = useState({
    completionRate: 0,
    tasksCompleted: 0,
    totalTasks: 0,
    todayMood: null
  });
  const [weeklyStats, setWeeklyStats] = useState({
    completionRate: 0,
    averageMood: 0,
    totalCheckIns: 0
  });
  const [overallStats, setOverallStats] = useState({
    totalMoodEntries: 0,
    totalTasks: 0,
    completedTasks: 0,
    averageMood: 0,
    checkInStreak: 0
  });

  useEffect(() => {
    if (state.user) {
      loadAllData();
    }
  }, [state.user]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCheckInData(),
        loadTodayStats(),
        loadWeeklyStats(),
        loadOverallStats()
      ]);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCheckInData = async () => {
    if (!state.user?.uid) return;
    
    try {
      const checkIns = await CheckInService.getAllCheckIns(state.user.uid);
      
      const markedDates = {};
      checkIns.forEach(checkIn => {
        markedDates[checkIn.date] = {
          marked: true,
          dotColor: '#7067CF',
          selected: true,
          selectedColor: '#7067CF'
        };
      });
      
      const today = new Date().toISOString().split('T')[0];
      if (markedDates[today]) {
        markedDates[today] = {
          ...markedDates[today],
          selectedColor: '#7B287D'
        };
      } else {
        markedDates[today] = {
          marked: false,
          selected: true,
          selectedColor: '#FFD700',
          selectedTextColor: '#330C2F'
        };
      }
      
      setCheckInDates(markedDates);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    }
  };

  const loadTodayStats = async () => {
    if (!state.user?.uid) return;
    
    try {
      const todayMood = await MoodService.getTodayMood(state.user.uid);
      const tasks = state.tasks || [];
      const completedToday = tasks.filter(t => t.completed).length;
      const totalTasks = tasks.length;
      
      setTodayStats({
        completionRate: totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0,
        tasksCompleted: completedToday,
        totalTasks: totalTasks,
        todayMood: todayMood
      });
    } catch (error) {
      console.error('Error loading today stats:', error);
    }
  };

  const loadWeeklyStats = async () => {
    if (!state.user?.uid) return;
    
    try {
      const recentMoods = await MoodService.getRecentMoods(state.user.uid, 7);
      const avgMood = recentMoods.length > 0
        ? recentMoods.reduce((sum, m) => sum + m.mood, 0) / recentMoods.length
        : 0;
      
      const weekCheckIns = await CheckInService.getWeekCheckIns(state.user.uid);
      
      setWeeklyStats({
        completionRate: todayStats.completionRate,
        averageMood: Math.round(avgMood * 10) / 10,
        totalCheckIns: Object.keys(weekCheckIns).length
      });
    } catch (error) {
      console.error('Error loading weekly stats:', error);
    }
  };

  const loadOverallStats = async () => {
    if (!state.user?.uid) return;
    
    try {
      const moodStats = await MoodService.getMoodStats(state.user.uid);
      const taskStats = await TaskService.getTaskStats(state.user.uid);
      
      setOverallStats({
        totalMoodEntries: moodStats.total || 0,
        totalTasks: taskStats.total || 0,
        completedTasks: taskStats.completed || 0,
        averageMood: moodStats.average || 0,
        checkInStreak: 0
      });
    } catch (error) {
      console.error('Error loading overall stats:', error);
    }
  };

  const renderTodayContent = () => (
    <View>
      <View style={styles.statsCard}>
        <View style={styles.circleContainer}>
          <View style={[
            styles.completionCircle, 
            { backgroundColor: todayStats.completionRate >= 70 ? '#7067CF' : todayStats.completionRate >= 40 ? '#FFD700' : '#F79256' }
          ]}>
            <Text style={styles.completionText}>{todayStats.completionRate}%</Text>
          </View>
          <Text style={styles.circleLabel}>Task Completion Rate</Text>
        </View>
      </View>

      {todayStats.todayMood && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Mood</Text>
          <View style={styles.moodDisplay}>
            <Text style={styles.moodValue}>{todayStats.todayMood.moodLabel}</Text>
            <Text style={styles.moodScore}>{todayStats.todayMood.mood}/10</Text>
          </View>
          {todayStats.todayMood.description && (
            <Text style={styles.moodDescription}>{todayStats.todayMood.description}</Text>
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Tasks</Text>
        <View style={styles.taskSummary}>
          <View style={styles.taskStat}>
            <Text style={styles.taskStatNumber}>{todayStats.tasksCompleted}</Text>
            <Text style={styles.taskStatLabel}>Completed</Text>
          </View>
          <View style={styles.taskStat}>
            <Text style={styles.taskStatNumber}>{todayStats.totalTasks - todayStats.tasksCompleted}</Text>
            <Text style={styles.taskStatLabel}>Remaining</Text>
          </View>
          <View style={styles.taskStat}>
            <Text style={styles.taskStatNumber}>{todayStats.totalTasks}</Text>
            <Text style={styles.taskStatLabel}>Total</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderWeeklyContent = () => (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>This Week's Overview</Text>
        <View style={styles.weeklyGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{weeklyStats.averageMood}</Text>
            <Text style={styles.statLabel}>Avg Mood</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{weeklyStats.totalCheckIns}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{weeklyStats.completionRate}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mood Trend</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.placeholderText}>Weekly mood chart coming soon</Text>
        </View>
      </View>
    </View>
  );

  const renderOverallContent = () => (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Check-in Calendar</Text>
        <Text style={styles.cardSubtitle}>Days you've logged your mood</Text>
        <Calendar
          markedDates={checkInDates}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#330C2F',
            selectedDayBackgroundColor: '#7B287D',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#FFD700',
            dayTextColor: '#2d4150',
            textDisabledColor: '#d9e1e8',
            dotColor: '#7067CF',
            selectedDotColor: '#ffffff',
            arrowColor: '#7B287D',
            monthTextColor: '#330C2F',
            indicatorColor: '#7B287D',
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 12
          }}
          onDayPress={(day) => console.log('Selected date:', day.dateString)}
        />
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#7067CF' }]} />
            <Text style={styles.legendText}>Logged in</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overall Statistics</Text>
        <View style={styles.overallGrid}>
          <View style={styles.overallStat}>
            <Text style={styles.overallValue}>{overallStats.totalMoodEntries}</Text>
            <Text style={styles.overallLabel}>Mood Entries</Text>
          </View>
          <View style={styles.overallStat}>
            <Text style={styles.overallValue}>{overallStats.averageMood.toFixed(1)}</Text>
            <Text style={styles.overallLabel}>Avg Mood</Text>
          </View>
          <View style={styles.overallStat}>
            <Text style={styles.overallValue}>{overallStats.completedTasks}</Text>
            <Text style={styles.overallLabel}>Tasks Done</Text>
          </View>
          <View style={styles.overallStat}>
            <Text style={styles.overallValue}>{overallStats.totalTasks}</Text>
            <Text style={styles.overallLabel}>Total Tasks</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B287D" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'Today':
        return renderTodayContent();
      case 'Weekly':
        return renderWeeklyContent();
      case 'Overall':
        return renderOverallContent();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Today' && styles.activeTab]} 
            onPress={() => setActiveTab('Today')}
          >
            <Text style={[styles.tabText, activeTab === 'Today' && styles.activeTabText]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Weekly' && styles.activeTab]} 
            onPress={() => setActiveTab('Weekly')}
          >
            <Text style={[styles.tabText, activeTab === 'Weekly' && styles.activeTabText]}>Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Overall' && styles.activeTab]} 
            onPress={() => setActiveTab('Overall')}
          >
            <Text style={[styles.tabText, activeTab === 'Overall' && styles.activeTabText]}>Overall</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    );
  }

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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  tab: { 
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginHorizontal: 5
  },
  activeTab: { 
    borderBottomColor: '#7B287D'
  },
  tabText: { 
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500'
  },
  activeTabText: { 
    color: '#7B287D',
    fontWeight: 'bold'
  },
  container: { 
    flex: 1 
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6B7280'
  },
  card: { 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  statsCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15,
    color: '#330C2F',
    textAlign: 'center'
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 15,
    textAlign: 'center'
  },
  circleContainer: { 
    alignItems: 'center'
  },
  completionCircle: { 
    width: 140, 
    height: 140, 
    borderRadius: 70, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  completionText: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  circleLabel: { 
    fontSize: 16, 
    color: '#6B7280', 
    marginTop: 15,
    fontWeight: '600'
  },
  moodDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },
  moodValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7B287D'
  },
  moodScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330C2F'
  },
  moodDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic'
  },
  taskSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  taskStat: {
    alignItems: 'center'
  },
  taskStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7B287D',
    marginBottom: 5
  },
  taskStatLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  weeklyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7B287D',
    marginBottom: 5
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed'
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    gap: 20
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  legendText: {
    fontSize: 14,
    color: '#6B7280'
  },
  overallGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  overallStat: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10
  },
  overallValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7B287D',
    marginBottom: 5
  },
  overallLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  }
});