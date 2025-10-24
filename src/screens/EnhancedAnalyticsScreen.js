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
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useApp } from '../contexts/AppContext';
import MoodService from '../services/MoodService';
import TaskService from '../services/TaskService';
import CheckInService from '../services/CheckInService';

const screenWidth = Dimensions.get('window').width;

export default function EnhancedAnalyticsScreen({ navigation }) {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('MoodHistory');
  const [timePeriod, setTimePeriod] = useState('Week');
  const [loading, setLoading] = useState(true);

  // Mood History State
  const [moodChartData, setMoodChartData] = useState(null);
  const [moodStats, setMoodStats] = useState(null);
  const [moodDistribution, setMoodDistribution] = useState([]);

  // Productivity State
  const [productivityData, setProductivityData] = useState(null);
  const [correlationData, setCorrelationData] = useState([]);

  // Weekly Progress State
  const [weeklyData, setWeeklyData] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (state.user) {
      loadAllData();
    }
  }, [state.user, timePeriod, weekOffset]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMoodHistory(),
        loadProductivityInsights(),
        loadWeeklyProgress()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysForPeriod = () => {
    switch (timePeriod) {
      case 'Week': return 7;
      case 'Month': return 30;
      case 'Year': return 365;
      default: return 7;
    }
  };

  const loadMoodHistory = async () => {
    if (!state.user?.uid) return;

    try {
      const days = getDaysForPeriod();
      const moods = await MoodService.getRecentMoods(state.user.uid, days);

      if (moods.length === 0) {
        setMoodChartData(null);
        setMoodStats(null);
        setMoodDistribution([]);
        return;
      }

      // Prepare chart data
      const sortedMoods = [...moods].sort((a, b) => {
        const dateA = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const dateB = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return dateA - dateB;
      });

      let labels = [];
      let scores = [];

      if (timePeriod === 'Week') {
        // Show daily data for week
        labels = sortedMoods.map(m => {
          const date = m.timestamp?.toDate?.() || new Date(m.timestamp);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        });
        scores = sortedMoods.map(m => m.mood || 0);
      } else if (timePeriod === 'Month') {
        // Aggregate into 4 weeks
        const weeklyData = [];
        for (let week = 0; week < 4; week++) {
          const weekMoods = sortedMoods.filter(m => {
            const date = m.timestamp?.toDate?.() || new Date(m.timestamp);
            const daysSince = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
            return daysSince >= week * 7 && daysSince < (week + 1) * 7;
          });
          if (weekMoods.length > 0) {
            const avg = weekMoods.reduce((sum, m) => sum + (m.mood || 0), 0) / weekMoods.length;
            weeklyData.push({ label: `Week ${4 - week}`, score: avg });
          }
        }
        weeklyData.reverse();
        labels = weeklyData.map(w => w.label);
        scores = weeklyData.map(w => w.score);
      } else if (timePeriod === 'Year') {
        // Aggregate into 12 months
        const monthlyData = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let month = 0; month < 12; month++) {
          const monthMoods = sortedMoods.filter(m => {
            const date = m.timestamp?.toDate?.() || new Date(m.timestamp);
            const monthsAgo = new Date().getMonth() - date.getMonth() + (12 * (new Date().getFullYear() - date.getFullYear()));
            return monthsAgo === (11 - month);
          });
          if (monthMoods.length > 0) {
            const avg = monthMoods.reduce((sum, m) => sum + (m.mood || 0), 0) / monthMoods.length;
            const date = new Date();
            date.setMonth(date.getMonth() - (11 - month));
            monthlyData.push({ label: monthNames[date.getMonth()], score: avg });
          }
        }
        labels = monthlyData.map(m => m.label);
        scores = monthlyData.map(m => m.score);
      }

      setMoodChartData({
        labels: labels,
        datasets: [{
          data: scores.length > 0 ? scores : [0],
          color: (opacity = 1) => `rgba(123, 40, 125, ${opacity})`,
          strokeWidth: 3
        }]
      });

      // Calculate statistics from original moods (not aggregated)
      const allScores = sortedMoods.map(m => m.mood || 0);
      const sum = allScores.reduce((a, b) => a + b, 0);
      const avg = sum / allScores.length;
      const highest = Math.max(...allScores);
      const lowest = Math.min(...allScores);

      const highestMood = sortedMoods.find(m => m.mood === highest);
      const lowestMood = sortedMoods.find(m => m.mood === lowest);

      // Most common mood
      const moodCounts = {};
      moods.forEach(m => {
        const label = m.moodLabel || 'Unknown';
        moodCounts[label] = (moodCounts[label] || 0) + 1;
      });
      const mostCommon = Object.keys(moodCounts).reduce((a, b) =>
        moodCounts[a] > moodCounts[b] ? a : b
      );

      // Consistency (standard deviation)
      const variance = allScores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / allScores.length;
      const stdDev = Math.sqrt(variance);
      const consistency = Math.max(0, 10 - stdDev);

      // Trend
      const firstHalf = allScores.slice(0, Math.floor(allScores.length / 2));
      const secondHalf = allScores.slice(Math.floor(allScores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const trend = secondAvg > firstAvg + 0.5 ? 'improving' : secondAvg < firstAvg - 0.5 ? 'declining' : 'stable';

      setMoodStats({
        average: avg.toFixed(1),
        highest: {
          score: highest,
          date: highestMood ? (highestMood.timestamp?.toDate?.() || new Date(highestMood.timestamp)).toLocaleDateString() : 'N/A'
        },
        lowest: {
          score: lowest,
          date: lowestMood ? (lowestMood.timestamp?.toDate?.() || new Date(lowestMood.timestamp)).toLocaleDateString() : 'N/A'
        },
        mostCommon,
        consistency: consistency.toFixed(1),
        trend,
        totalEntries: moods.length,
        daysTracked: days
      });

      // Mood distribution for pie chart
      const distribution = Object.keys(moodCounts).map(label => {
        // Shorten label names for better display
        let shortLabel = label;
        if (label.length > 10) {
          // Abbreviate long mood labels
          shortLabel = label.substring(0, 9) + '..';
        }
        return {
          name: shortLabel,
          count: moodCounts[label],
          color: getMoodColor(label),
          legendFontColor: '#4B5563',
          legendFontSize: 11
        };
      });
      setMoodDistribution(distribution);

    } catch (error) {
      console.error('Error loading mood history:', error);
    }
  };

  const loadProductivityInsights = async () => {
    if (!state.user?.uid) return;

    try {
      const days = getDaysForPeriod();
      const moods = await MoodService.getRecentMoods(state.user.uid, days);
      const tasks = state.tasks || [];

      if (moods.length === 0 || tasks.length === 0) {
        setProductivityData(null);
        setCorrelationData([]);
        return;
      }

      // Group tasks by date
      const tasksByDate = {};
      tasks.forEach(task => {
        const date = (task.createdAt?.toDate?.() || new Date(task.createdAt)).toLocaleDateString();
        if (!tasksByDate[date]) {
          tasksByDate[date] = { completed: 0, total: 0 };
        }
        tasksByDate[date].total++;
        if (task.completed) tasksByDate[date].completed++;
      });

      // Correlate moods with task completion
      const correlationPoints = [];
      let totalCorrelation = 0;
      let correlationCount = 0;

      moods.forEach(mood => {
        const date = (mood.timestamp?.toDate?.() || new Date(mood.timestamp)).toLocaleDateString();
        const taskData = tasksByDate[date];
        if (taskData && taskData.total > 0) {
          const completionRate = (taskData.completed / taskData.total) * 100;
          correlationPoints.push({
            mood: mood.mood,
            completionRate,
            date
          });
          totalCorrelation += mood.mood * completionRate;
          correlationCount++;
        }
      });

      const correlation = correlationCount > 0 ? (totalCorrelation / correlationCount / 100).toFixed(2) : 0;

      // Find best performance mood
      const moodPerformance = {};
      correlationPoints.forEach(point => {
        const moodRange = Math.floor(point.mood);
        if (!moodPerformance[moodRange]) {
          moodPerformance[moodRange] = { total: 0, count: 0 };
        }
        moodPerformance[moodRange].total += point.completionRate;
        moodPerformance[moodRange].count++;
      });

      let bestMood = null;
      let bestRate = 0;
      Object.keys(moodPerformance).forEach(mood => {
        const avgRate = moodPerformance[mood].total / moodPerformance[mood].count;
        if (avgRate > bestRate) {
          bestRate = avgRate;
          bestMood = mood;
        }
      });

      const totalCompleted = tasks.filter(t => t.completed).length;
      const avgCompletionRate = tasks.length > 0 ? ((totalCompleted / tasks.length) * 100).toFixed(1) : 0;

      setProductivityData({
        correlationCoefficient: correlation,
        bestPerformanceMood: bestMood ? { mood: bestMood, rate: bestRate.toFixed(1) } : null,
        mostProductiveTime: 'Morning', // This would need actual time tracking
        averageCompletionRate: avgCompletionRate,
        trendDirection: 'stable',
        totalTasks: tasks.length,
        completedTasks: totalCompleted
      });

      setCorrelationData(correlationPoints);

    } catch (error) {
      console.error('Error loading productivity insights:', error);
    }
  };

  const loadWeeklyProgress = async () => {
    if (!state.user?.uid) return;

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (7 * weekOffset) - 6);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setDate(endDate.getDate() - (7 * weekOffset));
      endDate.setHours(23, 59, 59, 999);

      // Fetch enough moods to cover the week
      const allMoods = await MoodService.getRecentMoods(state.user.uid, 30);
      const tasks = state.tasks || [];

      // Create daily breakdown
      const dailyData = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const dayMoods = allMoods.filter(m => {
          const moodDate = m.timestamp?.toDate?.() || new Date(m.timestamp);
          const moodDateStr = moodDate.toISOString().split('T')[0];
          return moodDateStr === dateStr;
        });

        // Filter tasks created on this day
        const dayTasks = tasks.filter(t => {
          const taskDate = t.createdAt?.toDate?.() || new Date(t.createdAt);
          const taskDateStr = taskDate.toISOString().split('T')[0];
          return taskDateStr === dateStr;
        });

        // Count how many of those same-day tasks were completed
        const completed = dayTasks.filter(t => t.completed).length;
        const total = dayTasks.length;

        const avgMood = dayMoods.length > 0
          ? dayMoods.reduce((sum, m) => sum + (m.mood || 0), 0) / dayMoods.length
          : 0;

        dailyData.push({
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          mood: avgMood,
          moodEmoji: getMoodEmoji(avgMood),
          tasksCompleted: completed,
          tasksTotal: total,
          completionRate: total > 0 ? ((completed / total) * 100).toFixed(0) : 0,
          energyLevel: avgMood >= 7 ? 3 : avgMood >= 4 ? 2 : 1,
          hasMoodData: dayMoods.length > 0
        });
      }

      const moods = dailyData.filter(d => d.hasMoodData);
      const totalCompleted = dailyData.reduce((sum, d) => sum + d.tasksCompleted, 0);
      const avgMood = moods.length > 0
        ? moods.reduce((sum, d) => sum + d.mood, 0) / moods.length
        : 0;
      const avgCompletion = dailyData.reduce((sum, d) => sum + parseFloat(d.completionRate), 0) / dailyData.length;

      setWeeklyData({
        dailyData,
        totalCompleted,
        avgMood: avgMood.toFixed(1),
        consistency: moods.length > 1 ? (10 - calculateStdDev(moods.map(d => d.mood))).toFixed(1) : '0.0',
        productivityScore: avgCompletion.toFixed(0),
        weekStart: startDate.toLocaleDateString(),
        weekEnd: endDate.toLocaleDateString()
      });

    } catch (error) {
      console.error('Error loading weekly progress:', error);
    }
  };

  const calculateStdDev = (values) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  const getMoodColor = (moodLabel) => {
    const colors = {
      // Mood scale from MoodTrackerScreen (scores 1-10)
      'Perfect': '#4CAF50',        // 10 - Bright Green
      'Amazing': '#66BB6A',        // 9 - Medium Green
      'Great': '#81C784',          // 8 - Light Green
      'Very Good': '#AED581',      // 7 - Yellow-Green
      'Good': '#CDDC39',           // 6 - Lime
      'Okay': '#FFEB3B',           // 5 - Yellow
      'Poor': '#FFC107',           // 4 - Amber
      'Bad': '#FF9800',            // 3 - Orange
      'Very Bad': '#FF5722',       // 2 - Deep Orange
      'Terrible': '#F44336',       // 1 - Red

      // Alternative/legacy labels
      'Very Happy': '#4CAF50',
      'Happy': '#81C784',
      'Neutral': '#FFEB3B',
      'Sad': '#FF9800',
      'Very Sad': '#F44336',
      'Excited': '#4CAF50',
      'Calm': '#81C784',
      'Anxious': '#FFC107',
      'Stressed': '#FF9800',
      'Depressed': '#F44336',
      'Low': '#FF5722'
    };
    return colors[moodLabel] || '#7B287D';
  };

  const getMoodEmoji = (score) => {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😟';
    return '😢';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  const generateAIInsights = () => {
    const insights = [];

    if (moodStats) {
      const trend = moodStats.trend;
      if (trend === 'improving') {
        insights.push(`Your mood has improved over the past ${timePeriod.toLowerCase()}. Keep up the positive momentum! 🌟`);
      } else if (trend === 'declining') {
        insights.push(`Your mood shows a declining trend. Consider reaching out for support or practicing self-care activities. 💙`);
      } else {
        insights.push(`Your mood has been stable at ${moodStats.average}/10. Consistency is a good sign! ✨`);
      }
    }

    if (productivityData) {
      if (productivityData.bestPerformanceMood) {
        insights.push(`You complete tasks most effectively when your mood is around ${productivityData.bestPerformanceMood.mood}/10. Try to maintain that level! 🎯`);
      }
      if (parseFloat(productivityData.averageCompletionRate) >= 70) {
        insights.push(`Excellent productivity! You've completed ${productivityData.averageCompletionRate}% of your tasks. 🚀`);
      }
    }

    if (weeklyData && weeklyData.consistency >= 7) {
      insights.push(`Great mood consistency this week! Your emotional stability score is ${weeklyData.consistency}/10. 💪`);
    }

    return insights;
  };

  // Render functions for each tab
  const renderMoodHistory = () => {
    if (!moodChartData || !moodStats) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>📊 No mood data available for this period</Text>
          <Text style={styles.emptySubtext}>Start tracking your mood to see insights here!</Text>
        </View>
      );
    }

    const insights = generateAIInsights();

    return (
      <View>
        {/* Time Period Selector */}
        <View style={styles.periodSelector}>
          {['Week', 'Month', 'Year'].map(period => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, timePeriod === period && styles.periodButtonActive]}
              onPress={() => setTimePeriod(period)}
            >
              <Text style={[styles.periodText, timePeriod === period && styles.periodTextActive]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Line Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 Mood Trend Over Time</Text>
          <LineChart
            data={moodChartData}
            width={screenWidth - 60}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#f9fafb',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(123, 40, 125, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: '#7B287D'
              }
            }}
            bezier
            style={styles.chart}
            fromZero
            segments={5}
          />
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{moodStats.average}</Text>
            <Text style={styles.statLabel}>Average</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{moodStats.highest.score}</Text>
            <Text style={styles.statLabel}>Highest</Text>
            <Text style={styles.statDate}>{moodStats.highest.date}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{moodStats.lowest.score}</Text>
            <Text style={styles.statLabel}>Lowest</Text>
            <Text style={styles.statDate}>{moodStats.lowest.date}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{moodStats.mostCommon}</Text>
            <Text style={styles.statLabel}>Most Common</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{moodStats.consistency}</Text>
            <Text style={styles.statLabel}>Consistency</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{getTrendIcon(moodStats.trend)}</Text>
            <Text style={styles.statLabel}>{moodStats.trend}</Text>
          </View>
        </View>

        {/* Mood Distribution Pie Chart */}
        {moodDistribution.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🥧 Mood Distribution</Text>
            <PieChart
              data={moodDistribution}
              width={screenWidth - 50}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="0"
              center={[10, 0]}
              absolute
              hasLegend={true}
              avoidFalseZero={true}
            />
          </View>
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <View style={styles.insightBox}>
            <Text style={styles.insightTitle}>💡 AI-Generated Insights</Text>
            {insights.map((insight, index) => (
              <Text key={index} style={styles.insightText}>• {insight}</Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderProductivityInsights = () => {
    if (!productivityData) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>📊 No productivity data available</Text>
          <Text style={styles.emptySubtext}>Complete tasks to see productivity insights!</Text>
        </View>
      );
    }

    return (
      <View>
        {/* Time Period Selector */}
        <View style={styles.periodSelector}>
          {['Week', 'Month', 'Year'].map(period => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, timePeriod === period && styles.periodButtonActive]}
              onPress={() => setTimePeriod(period)}
            >
              <Text style={[styles.periodText, timePeriod === period && styles.periodTextActive]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Performance Metrics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            {productivityData.bestPerformanceMood && (
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Best Performance Mood</Text>
                <Text style={styles.metricValue}>{productivityData.bestPerformanceMood.mood}/10</Text>
                <Text style={styles.metricSubtext}>{productivityData.bestPerformanceMood.rate}% completion</Text>
              </View>
            )}
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Most Productive Time</Text>
              <Text style={styles.metricValue}>{productivityData.mostProductiveTime}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Avg Completion Rate</Text>
              <Text style={styles.metricValue}>{productivityData.averageCompletionRate}%</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Task Completion Trend</Text>
              <Text style={styles.metricValue}>{getTrendIcon(productivityData.trendDirection)}</Text>
            </View>
          </View>
        </View>

        {/* Overall Task Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Task Summary</Text>
          <View style={styles.taskSummaryRow}>
            <View style={styles.taskSummaryItem}>
              <Text style={styles.taskSummaryNumber}>{productivityData.completedTasks}</Text>
              <Text style={styles.taskSummaryLabel}>Completed</Text>
            </View>
            <View style={styles.taskSummaryItem}>
              <Text style={styles.taskSummaryNumber}>{productivityData.totalTasks - productivityData.completedTasks}</Text>
              <Text style={styles.taskSummaryLabel}>Pending</Text>
            </View>
            <View style={styles.taskSummaryItem}>
              <Text style={styles.taskSummaryNumber}>{productivityData.totalTasks}</Text>
              <Text style={styles.taskSummaryLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Correlation Insight */}
        <View style={styles.insightBox}>
          <Text style={styles.insightTitle}>💡 Mood-Productivity Correlation</Text>
          <Text style={styles.insightText}>
            Correlation coefficient: {productivityData.correlationCoefficient}
          </Text>
          <Text style={styles.insightText}>
            {parseFloat(productivityData.correlationCoefficient) > 0.5
              ? "Strong positive correlation! You perform better when your mood is high. 🎯"
              : parseFloat(productivityData.correlationCoefficient) > 0.2
              ? "Moderate correlation between mood and productivity. 📊"
              : "Weak correlation. Your productivity is consistent regardless of mood! 💪"}
          </Text>
        </View>
      </View>
    );
  };

  const renderWeeklyProgress = () => {
    if (!weeklyData) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>📊 No weekly data available</Text>
        </View>
      );
    }

    return (
      <View>
        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity
            style={styles.weekNavButton}
            onPress={() => setWeekOffset(weekOffset + 1)}
          >
            <Text style={styles.weekNavIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.weekInfo}>
            <Text style={styles.weekTitle}>Week of</Text>
            <Text style={styles.weekDate}>{weeklyData.weekStart} - {weeklyData.weekEnd}</Text>
          </View>
          <TouchableOpacity
            style={[styles.weekNavButton, weekOffset === 0 && styles.weekNavButtonDisabled]}
            onPress={() => weekOffset > 0 && setWeekOffset(weekOffset - 1)}
            disabled={weekOffset === 0}
          >
            <Text style={styles.weekNavIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{weeklyData.totalCompleted}</Text>
            <Text style={styles.summaryLabel}>Tasks Completed</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{weeklyData.avgMood}</Text>
            <Text style={styles.summaryLabel}>Avg Daily Mood</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{weeklyData.consistency}</Text>
            <Text style={styles.summaryLabel}>Mood Consistency</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{weeklyData.productivityScore}%</Text>
            <Text style={styles.summaryLabel}>Productivity</Text>
          </View>
        </View>

        {/* Daily Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Daily Breakdown</Text>
          {weeklyData.dailyData.map((day, index) => (
            <TouchableOpacity key={index} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayName}>{day.day}</Text>
                  <Text style={styles.dayDate}>{day.date}</Text>
                </View>
                <Text style={styles.dayEmoji}>{day.moodEmoji}</Text>
              </View>
              <View style={styles.dayStats}>
                <View style={styles.dayStat}>
                  <Text style={styles.dayStatLabel}>Mood</Text>
                  <Text style={styles.dayStatValue}>{day.mood.toFixed(1)}/10</Text>
                </View>
                <View style={styles.dayStat}>
                  <Text style={styles.dayStatLabel}>Tasks</Text>
                  <Text style={styles.dayStatValue}>{day.tasksCompleted}/{day.tasksTotal}</Text>
                </View>
                <View style={styles.dayStat}>
                  <Text style={styles.dayStatLabel}>Energy</Text>
                  <Text style={styles.dayStatValue}>{"🔋".repeat(day.energyLevel)}</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${day.completionRate}%` }]} />
              </View>
              <Text style={styles.completionText}>{day.completionRate}% Complete</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

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
      case 'MoodHistory':
        return renderMoodHistory();
      case 'Productivity':
        return renderProductivityInsights();
      case 'WeeklyProgress':
        return renderWeeklyProgress();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'MoodHistory' && styles.activeTab]}
          onPress={() => setActiveTab('MoodHistory')}
        >
          <Text style={[styles.tabText, activeTab === 'MoodHistory' && styles.activeTabText]}>
            Mood History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Productivity' && styles.activeTab]}
          onPress={() => setActiveTab('Productivity')}
        >
          <Text style={[styles.tabText, activeTab === 'Productivity' && styles.activeTabText]}>
            Productivity
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'WeeklyProgress' && styles.activeTab]}
          onPress={() => setActiveTab('WeeklyProgress')}
        >
          <Text style={[styles.tabText, activeTab === 'WeeklyProgress' && styles.activeTabText]}>
            Weekly
          </Text>
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
    fontSize: 32,
    color: '#333',
    fontWeight: 'bold',
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
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginHorizontal: 3
  },
  activeTab: {
    borderBottomColor: '#7B287D'
  },
  tabText: {
    color: '#6B7280',
    fontSize: 13,
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
    padding: 15,
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
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginBottom: 10
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center'
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8
  },
  periodButtonActive: {
    backgroundColor: '#7B287D'
  },
  periodText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500'
  },
  periodTextActive: {
    color: 'white',
    fontWeight: 'bold'
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#330C2F'
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7B287D',
    marginBottom: 5
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center'
  },
  statDate: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 2
  },
  insightBox: {
    backgroundColor: '#F3E8FF',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7B287D',
    marginBottom: 15
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 10
  },
  insightText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 5
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7B287D',
    marginBottom: 4
  },
  metricSubtext: {
    fontSize: 11,
    color: '#9CA3AF'
  },
  taskSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  taskSummaryItem: {
    alignItems: 'center'
  },
  taskSummaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7B287D',
    marginBottom: 5
  },
  taskSummaryLabel: {
    fontSize: 13,
    color: '#6B7280'
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  weekNavButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20
  },
  weekNavButtonDisabled: {
    opacity: 0.3
  },
  weekNavIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7B287D'
  },
  weekInfo: {
    alignItems: 'center'
  },
  weekTitle: {
    fontSize: 12,
    color: '#6B7280'
  },
  weekDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#330C2F'
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  summaryCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#7B287D',
    marginBottom: 5
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  dayCard: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#7B287D'
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  dayInfo: {
    flex: 1
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#330C2F'
  },
  dayDate: {
    fontSize: 12,
    color: '#6B7280'
  },
  dayEmoji: {
    fontSize: 28
  },
  dayStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  dayStat: {
    alignItems: 'center'
  },
  dayStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 3
  },
  dayStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#330C2F'
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7B287D',
    borderRadius: 4
  },
  completionText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right'
  }
});
