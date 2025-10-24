// src/screens/admin/AdminHome.js
// Admin Dashboard Overview - KPI cards, quick actions, navigation
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { getAnalytics } from '../../services/adminService';
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';
import { initializeSelfCareData } from '../../utils/initializeSelfCare';

export default function AdminHome({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    const result = await getAnalytics({ range: '7d' });
    if (result.ok) {
      setAnalytics(result.data);
    } else {
      setError(result.error);
      Alert.alert('Error', result.error || 'Failed to load analytics');
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from admin panel?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              console.log('Admin logged out successfully');
              // Navigate to Welcome screen after logout
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Loading state
  if (loading && !analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#7B287D" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Failed to load dashboard</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>MoodMap Management</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshIcon}>{refreshing ? '⏳' : '🔄'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* KPI Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.kpiGrid}>
            {/* Total Users */}
            <View style={[styles.kpiCard, styles.kpiCardPurple]}>
              <Text style={styles.kpiIcon}>👥</Text>
              <Text style={styles.kpiValue}>{analytics?.totalUsers || 0}</Text>
              <Text style={styles.kpiLabel}>Total Users</Text>
            </View>

            {/* Active Today */}
            <View style={[styles.kpiCard, styles.kpiCardGreen]}>
              <Text style={styles.kpiIcon}>✅</Text>
              <Text style={styles.kpiValue}>{analytics?.activeToday || 0}</Text>
              <Text style={styles.kpiLabel}>Active Today</Text>
            </View>

            {/* Tasks Last 7d */}
            <View style={[styles.kpiCard, styles.kpiCardBlue]}>
              <Text style={styles.kpiIcon}>📋</Text>
              <Text style={styles.kpiValue}>{analytics?.tasksLast7d || 0}</Text>
              <Text style={styles.kpiLabel}>Tasks (7d)</Text>
            </View>

            {/* Unresolved Alerts */}
            <View style={[styles.kpiCard, styles.kpiCardRed]}>
              <Text style={styles.kpiIcon}>⚠️</Text>
              <Text style={styles.kpiValue}>{analytics?.unresolvedAlerts || 0}</Text>
              <Text style={styles.kpiLabel}>Alerts</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#7B287D' }]}>
                <Text style={styles.actionIconText}>👤</Text>
              </View>
              <View>
                <Text style={styles.actionTitle}>User Management</Text>
                <Text style={styles.actionDescription}>View, edit, and manage users</Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TaskCategories')}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#686DE0' }]}>
                <Text style={styles.actionIconText}>📂</Text>
              </View>
              <View>
                <Text style={styles.actionTitle}>Task Categories</Text>
                <Text style={styles.actionDescription}>Manage task types and categories</Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AnalyticsReports')}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#52C4B0' }]}>
                <Text style={styles.actionIconText}>📊</Text>
              </View>
              <View>
                <Text style={styles.actionTitle}>Analytics & Reports</Text>
                <Text style={styles.actionDescription}>View charts and export data</Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('SystemLogs')}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#F79256' }]}>
                <Text style={styles.actionIconText}>📜</Text>
              </View>
              <View>
                <Text style={styles.actionTitle}>System Logs</Text>
                <Text style={styles.actionDescription}>View app logs and errors</Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('DatabaseViewer')}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#10B981' }]}>
                <Text style={styles.actionIconText}>🗄️</Text>
              </View>
              <View>
                <Text style={styles.actionTitle}>Database Viewer</Text>
                <Text style={styles.actionDescription}>View and populate database</Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Documentation')}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#A78BFA' }]}>
                <Text style={styles.actionIconText}>📄</Text>
              </View>
              <View>
                <Text style={styles.actionTitle}>Documentation</Text>
                <Text style={styles.actionDescription}>Upload and manage docs</Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          {/* Initialize Self-Care Data Button */}
          <TouchableOpacity
            style={[styles.actionCard, styles.warningCard]}
            onPress={() => {
              Alert.alert(
                'Initialize Self-Care Data',
                'This will populate the database with default self-care activities and helpline contacts. Only run this ONCE.\n\nContinue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Initialize',
                    onPress: initializeSelfCareData
                  }
                ]
              );
            }}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.actionIconText}>🔧</Text>
              </View>
              <View>
                <Text style={styles.actionTitle}>Initialize Self-Care Data</Text>
                <Text style={styles.actionDescription}>⚠️ Run once to populate database</Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* System Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Database</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: '#52C4B0' }]} />
                <Text style={styles.statusText}>Online</Text>
              </View>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Updated</Text>
              <Text style={styles.statusValue}>
                {analytics?.calculatedAt
                  ? new Date(analytics.calculatedAt).toLocaleString()
                  : 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280'
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8
  },
  errorDetail: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#7B287D',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerCenter: {
    flex: 1,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330C2F'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6
  },
  logoutIcon: {
    fontSize: 16
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626'
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  refreshIcon: {
    fontSize: 20
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
    marginBottom: 12
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  kpiCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  kpiCardPurple: {
    borderLeftWidth: 4,
    borderLeftColor: '#7B287D'
  },
  kpiCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: '#52C4B0'
  },
  kpiCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: '#686DE0'
  },
  kpiCardRed: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444'
  },
  kpiIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  kpiLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center'
  },
  actionCard: {
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
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  actionIconText: {
    fontSize: 22
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  actionDescription: {
    fontSize: 13,
    color: '#6B7280'
  },
  actionArrow: {
    fontSize: 24,
    color: '#D1D5DB',
    marginLeft: 8
  },
  warningCard: {
    borderColor: '#FEE2E2',
    borderWidth: 2
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  statusLabel: {
    fontSize: 15,
    color: '#6B7280'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534'
  },
  statusValue: {
    fontSize: 14,
    color: '#1F2937'
  }
});
