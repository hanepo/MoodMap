// src/screens/admin/DatabaseViewer.js
// Screen to view all database data and populate initial data
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
  RefreshControl
} from 'react-native';
import DatabaseService from '../../services/DatabaseService';

export default function DatabaseViewer({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [data, setData] = useState(null);
  const [authData, setAuthData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const result = await DatabaseService.getDatabaseStats();
    if (result.success) {
      setStats(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const loadFullData = async () => {
    setLoading(true);
    const result = await DatabaseService.fetchAllData();
    if (result.success) {
      setData(result.data);
      Alert.alert('Success', 'Database data loaded successfully!');
    } else {
      Alert.alert('Error', result.error);
    }
    setLoading(false);
  };

  const loadAuthData = async () => {
    setLoading(true);
    const result = await DatabaseService.fetchAuthData();
    if (result.success) {
      setAuthData(result.data);
      Alert.alert('Auth Data', JSON.stringify(result.data, null, 2));
    } else {
      Alert.alert('Error', result.error);
    }
    setLoading(false);
  };

  const handlePopulateData = () => {
    Alert.alert(
      'Populate Database',
      'This will create test users and sample data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Populate',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await DatabaseService.populateInitialData();
            setLoading(false);

            if (result.success) {
              Alert.alert(
                'Success! 🎉',
                `Database populated successfully!\n\n` +
                `Created ${result.users} users with:\n` +
                `• Mood entries\n` +
                `• Tasks\n` +
                `• Check-ins\n` +
                `• Support resources\n` +
                `• Task categories\n\n` +
                `Test Accounts:\n` +
                `user1@test.com / password123\n` +
                `user2@test.com / password123\n` +
                `admin@test.com / admin123`
              );
              loadStats();
            } else {
              Alert.alert('Error', result.error);
            }
          }
        }
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      '⚠️ WARNING: This will permanently delete ALL data from the database. This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await DatabaseService.clearAllData();
            setLoading(false);

            if (result.success) {
              Alert.alert('Success', 'All data has been cleared');
              setStats(null);
              setData(null);
              loadStats();
            } else {
              Alert.alert('Error', result.error);
            }
          }
        }
      ]
    );
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const renderStatsCard = (title, value, icon, color) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </View>
    </View>
  );

  const renderDataSection = (title, data, userId = null) => {
    const sectionKey = userId ? `${title}-${userId}` : title;
    const isExpanded = expandedSections[sectionKey];

    return (
      <View style={styles.dataSection} key={sectionKey}>
        <TouchableOpacity
          style={styles.dataSectionHeader}
          onPress={() => toggleSection(sectionKey)}
        >
          <Text style={styles.dataSectionTitle}>
            {title} ({Array.isArray(data) ? data.length : Object.keys(data || {}).length})
          </Text>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.dataSectionContent}>
            <ScrollView horizontal>
              <Text style={styles.jsonText}>
                {JSON.stringify(data, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>Database Viewer</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Database Actions</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.populateButton]}
            onPress={handlePopulateData}
            disabled={loading}
          >
            <Text style={styles.actionButtonIcon}>📥</Text>
            <Text style={styles.actionButtonText}>Populate Test Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.loadButton]}
            onPress={loadFullData}
            disabled={loading}
          >
            <Text style={styles.actionButtonIcon}>📊</Text>
            <Text style={styles.actionButtonText}>Load All Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.authButton]}
            onPress={loadAuthData}
            disabled={loading}
          >
            <Text style={styles.actionButtonIcon}>🔐</Text>
            <Text style={styles.actionButtonText}>View Auth Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={handleClearData}
            disabled={loading}
          >
            <Text style={styles.actionButtonIcon}>🗑️</Text>
            <Text style={styles.actionButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Database Statistics</Text>

            <View style={styles.statsGrid}>
              {renderStatsCard('Users', stats.users, '👥', '#7B287D')}
              {renderStatsCard('Mood Entries', stats.moodEntries, '😊', '#F79256')}
              {renderStatsCard('Tasks', stats.tasks, '✅', '#7067CF')}
              {renderStatsCard('Check-ins', stats.checkIns, '🔥', '#B7C0EE')}
              {renderStatsCard('Support Resources', stats.supportResources, '📚', '#CBF3D2')}
              {renderStatsCard('Task Categories', stats.taskCategories, '🏷️', '#330C2F')}
            </View>
          </View>
        )}

        {/* Full Data View */}
        {data && (
          <View style={styles.dataViewSection}>
            <Text style={styles.sectionTitle}>Database Contents</Text>

            {renderDataSection('Users', data.users)}

            {Object.keys(data.moodEntries).map(userId => {
              const user = data.users.find(u => u.id === userId);
              return renderDataSection(
                `Mood Entries - ${user?.displayName || userId}`,
                data.moodEntries[userId],
                userId
              );
            })}

            {Object.keys(data.tasks).map(userId => {
              const user = data.users.find(u => u.id === userId);
              return renderDataSection(
                `Tasks - ${user?.displayName || userId}`,
                data.tasks[userId],
                userId
              );
            })}

            {Object.keys(data.checkIns).map(userId => {
              const user = data.users.find(u => u.id === userId);
              return renderDataSection(
                `Check-ins - ${user?.displayName || userId}`,
                data.checkIns[userId],
                userId
              );
            })}

            {renderDataSection('Support Resources', data.supportResources)}
            {renderDataSection('Task Categories', data.taskCategories)}
          </View>
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#7B287D" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  backIcon: {
    fontSize: 32,
    color: '#333',
    fontWeight: 'bold'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  refreshIcon: {
    fontSize: 24,
    color: '#7B287D',
    fontWeight: 'bold'
  },
  content: {
    flex: 1
  },
  actionsSection: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 15
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  populateButton: {
    backgroundColor: '#7B287D'
  },
  loadButton: {
    backgroundColor: '#7067CF'
  },
  authButton: {
    backgroundColor: '#F79256'
  },
  clearButton: {
    backgroundColor: '#EF4444'
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: 12
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  statsSection: {
    padding: 20
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  statIcon: {
    fontSize: 32,
    marginRight: 12
  },
  statContent: {
    flex: 1
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#330C2F'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  dataViewSection: {
    padding: 20
  },
  dataSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  dataSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F9FAFB'
  },
  dataSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330C2F'
  },
  expandIcon: {
    fontSize: 14,
    color: '#6B7280'
  },
  dataSectionContent: {
    padding: 15,
    backgroundColor: '#1F2937',
    maxHeight: 300
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#10B981',
    lineHeight: 18
  },
  loadingOverlay: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280'
  }
});
