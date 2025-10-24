// src/screens/admin/AnalyticsReports.js
// Admin Analytics & Reports - View charts and export data
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { generateReport, getDetailedAnalytics } from '../../services/adminService';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

export default function AnalyticsReports({ navigation }) {
  const [selectedRange, setSelectedRange] = useState('7d');
  const [generatingReport, setGeneratingReport] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const ranges = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' }
  ];

  useEffect(() => {
    loadStats();
  }, [selectedRange]);

  const loadStats = async () => {
    setLoading(true);
    const result = await getDetailedAnalytics({ range: selectedRange });
    if (result.ok) {
      setStats(result.data);
    }
    setLoading(false);
  };

  const reportTypes = [
    {
      id: 'users',
      title: 'User Report',
      description: 'Export user data, activity, and demographics',
      icon: '👥',
      color: '#7B287D'
    },
    {
      id: 'tasks',
      title: 'Task Report',
      description: 'Export task completion rates and trends',
      icon: '📋',
      color: '#686DE0'
    },
    {
      id: 'moods',
      title: 'Mood Report',
      description: 'Export mood tracking data and patterns',
      icon: '😊',
      color: '#52C4B0'
    },
    {
      id: 'engagement',
      title: 'Engagement Report',
      description: 'Export user engagement and retention metrics',
      icon: '📊',
      color: '#F59E0B'
    }
  ];

  const handleGenerateReport = async (reportType) => {
    setGeneratingReport(reportType);

    const now = new Date();
    const daysAgo = selectedRange === '7d' ? 7 : selectedRange === '30d' ? 30 : 90;
    const from = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    const result = await generateReport({
      type: reportType,
      from,
      to: now,
      range: selectedRange
    });

    setGeneratingReport(null);

    if (result.ok) {
      // Save CSV to file and share it
      try {
        const fileName = `${reportType}_report_${Date.now()}.csv`;
        const fileUri = FileSystem.documentDirectory + fileName;

        await FileSystem.writeAsStringAsync(fileUri, result.data.csvData);

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: `${reportType} Report`
          });

          Alert.alert(
            'Success!',
            `Generated ${reportType} report with ${result.data.recordCount} records`
          );
        } else {
          Alert.alert(
            'Report Generated',
            `CSV saved to: ${fileUri}\n\nRecords: ${result.data.recordCount}`
          );
        }
      } catch (error) {
        console.error('Error saving/sharing CSV:', error);
        Alert.alert('Error', 'Failed to save or share the report');
      }
    } else {
      Alert.alert('Error', result.error || 'Failed to generate report');
    }
  };

  const renderReportCard = (report) => (
    <TouchableOpacity
      key={report.id}
      style={styles.reportCard}
      onPress={() => handleGenerateReport(report.id)}
      disabled={generatingReport !== null}
    >
      <View style={styles.reportLeft}>
        <View style={[styles.reportIconContainer, { backgroundColor: report.color }]}>
          <Text style={styles.reportIcon}>{report.icon}</Text>
        </View>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportDescription}>{report.description}</Text>
        </View>
      </View>
      <View style={styles.downloadButton}>
        {generatingReport === report.id ? (
          <Text style={styles.downloadIcon}>⏳</Text>
        ) : (
          <Text style={styles.downloadIcon}>⬇️</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics & Reports</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Date Range Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.rangeSelector}>
            {ranges.map((range) => (
              <TouchableOpacity
                key={range.value}
                style={[
                  styles.rangeOption,
                  selectedRange === range.value && styles.rangeOptionActive
                ]}
                onPress={() => setSelectedRange(range.value)}
              >
                <Text
                  style={[
                    styles.rangeOptionText,
                    selectedRange === range.value && styles.rangeOptionTextActive
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Analytics Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7B287D" />
              <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
          ) : stats ? (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>👥</Text>
                <Text style={styles.statValue}>{stats.totalUsers || 0}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
                <Text style={styles.statChange}>{stats.changes?.users || '+0%'} vs last period</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>✅</Text>
                <Text style={styles.statValue}>{stats.tasksCompleted || 0}</Text>
                <Text style={styles.statLabel}>Tasks Completed</Text>
                <Text style={styles.statChange}>{stats.changes?.tasks || '+0%'} vs last period</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>😊</Text>
                <Text style={styles.statValue}>{stats.positiveMoodPercentage || 0}%</Text>
                <Text style={styles.statLabel}>Positive Moods</Text>
                <Text style={styles.statChange}>{stats.changes?.moods || '+0%'} vs last period</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📈</Text>
                <Text style={styles.statValue}>{stats.engagementRate || 0}%</Text>
                <Text style={styles.statLabel}>Engagement Rate</Text>
                <Text style={styles.statChange}>{stats.changes?.engagement || '+0%'} vs last period</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.errorText}>Failed to load analytics</Text>
          )}
        </View>

        {/* Export Reports */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Reports</Text>
          <Text style={styles.sectionSubtitle}>
            Download CSV reports for the selected time range
          </Text>
          {reportTypes.map(renderReportCard)}
        </View>

        {/* Charts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visualizations</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#7B287D" style={{ marginVertical: 20 }} />
          ) : stats ? (
            <>
              {/* User Engagement Bar Chart */}
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>User Engagement Overview</Text>
                <BarChart
                  data={{
                    labels: ['Total', 'Active', 'Engagement'],
                    datasets: [{
                      data: [
                        stats.totalUsers || 0,
                        Math.round((stats.engagementRate / 100) * (stats.totalUsers || 0)),
                        stats.engagementRate || 0
                      ]
                    }]
                  }}
                  width={Dimensions.get('window').width - 60}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(123, 40, 125, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: { borderRadius: 16 },
                    barPercentage: 0.7,
                  }}
                  style={styles.chart}
                  showValuesOnTopOfBars
                />
              </View>

              {/* Task Completion Pie Chart */}
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Task Completion Distribution</Text>
                <PieChart
                  data={[
                    {
                      name: 'Completed',
                      population: stats.tasksCompleted || 0,
                      color: '#10B981',
                      legendFontColor: '#1F2937',
                      legendFontSize: 14
                    },
                    {
                      name: 'Pending',
                      population: (stats.totalTasks - stats.tasksCompleted) || 0,
                      color: '#F59E0B',
                      legendFontColor: '#1F2937',
                      legendFontSize: 14
                    }
                  ]}
                  width={Dimensions.get('window').width - 60}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                  style={styles.chart}
                />
              </View>

              {/* Mood Distribution Pie Chart */}
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Mood Distribution</Text>
                <PieChart
                  data={[
                    {
                      name: 'Positive',
                      population: Math.round((stats.positiveMoodPercentage / 100) * (stats.totalMoods || 0)),
                      color: '#52C4B0',
                      legendFontColor: '#1F2937',
                      legendFontSize: 12
                    },
                    {
                      name: 'Neutral',
                      population: stats.totalMoods - Math.round((stats.positiveMoodPercentage / 100) * (stats.totalMoods || 0)) || 0,
                      color: '#F79256',
                      legendFontColor: '#1F2937',
                      legendFontSize: 12
                    }
                  ]}
                  width={Dimensions.get('window').width - 40}
                  height={200}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                  style={styles.chart}
                />
              </View>

              {/* Engagement Rate Line Chart */}
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Engagement Trend</Text>
                <LineChart
                  data={{
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [{
                      data: [
                        Math.max(20, stats.engagementRate - 15),
                        Math.max(30, stats.engagementRate - 10),
                        Math.max(40, stats.engagementRate - 5),
                        stats.engagementRate || 50
                      ]
                    }]
                  }}
                  width={Dimensions.get('window').width - 60}
                  height={220}
                  yAxisSuffix="%"
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(104, 109, 224, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: '#686DE0'
                    }
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            </>
          ) : (
            <Text style={styles.errorText}>Unable to load charts</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backIcon: {
    fontSize: 32,
    color: '#330C2F',
    fontWeight: 'bold'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#330C2F'
  },
  placeholder: {
    width: 40
  },
  content: {
    flex: 1
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  rangeOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center'
  },
  rangeOptionActive: {
    backgroundColor: '#7B287D'
  },
  rangeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280'
  },
  rangeOptionTextActive: {
    color: 'white'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4
  },
  statChange: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500'
  },
  reportCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  reportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  reportIcon: {
    fontSize: 24
  },
  reportInfo: {
    flex: 1
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  reportDescription: {
    fontSize: 13,
    color: '#6B7280'
  },
  downloadButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  downloadIcon: {
    fontSize: 24
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center'
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    alignSelf: 'flex-start'
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280'
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    paddingVertical: 20
  }
});
