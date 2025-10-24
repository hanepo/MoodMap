// src/screens/admin/SystemLogs.js
// Admin System Logs - View app logs and errors
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { getLogs } from '../../services/adminService';

export default function SystemLogs({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | error | warn | info

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchQuery, typeFilter]);

  const loadLogs = async () => {
    setLoading(true);
    const result = await getLogs({
      type: typeFilter !== 'all' ? typeFilter : null
    });

    if (result.ok) {
      setLogs(result.data);
    } else {
      Alert.alert('Error', result.error || 'Failed to load logs');
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.type === typeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        log =>
          log.message?.toLowerCase().includes(query) ||
          log.source?.toLowerCase().includes(query)
      );
    }

    setFilteredLogs(filtered);
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return '🔴';
      case 'warn':
        return '🟡';
      case 'info':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return '#EF4444';
      case 'warn':
        return '#F59E0B';
      case 'info':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const formatTimestamp = (date) => {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    }
  };

  const renderLog = ({ item }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.logLeft}>
          <Text style={styles.logIcon}>{getLogIcon(item.type)}</Text>
          <View style={styles.logMeta}>
            <Text style={[styles.logType, { color: getLogColor(item.type) }]}>
              {item.type.toUpperCase()}
            </Text>
            <Text style={styles.logSource}>{item.source}</Text>
          </View>
        </View>
        <Text style={styles.logTime}>{formatTimestamp(item.timestamp)}</Text>
      </View>
      <Text style={styles.logMessage}>{item.message}</Text>
      {item.userId && (
        <Text style={styles.logUserId}>User: {item.userId}</Text>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📜</Text>
      <Text style={styles.emptyText}>No logs found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery ? 'Try a different search term' : 'Logs will appear here'}
      </Text>
    </View>
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
        <Text style={styles.headerTitle}>System Logs</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadLogs}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search logs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, typeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setTypeFilter('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                typeFilter === 'all' && styles.filterTabTextActive
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              typeFilter === 'error' && styles.filterTabActive
            ]}
            onPress={() => setTypeFilter('error')}
          >
            <Text
              style={[
                styles.filterTabText,
                typeFilter === 'error' && styles.filterTabTextActive
              ]}
            >
              🔴 Errors
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              typeFilter === 'warn' && styles.filterTabActive
            ]}
            onPress={() => setTypeFilter('warn')}
          >
            <Text
              style={[
                styles.filterTabText,
                typeFilter === 'warn' && styles.filterTabTextActive
              ]}
            >
              🟡 Warnings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              typeFilter === 'info' && styles.filterTabActive
            ]}
            onPress={() => setTypeFilter('info')}
          >
            <Text
              style={[
                styles.filterTabText,
                typeFilter === 'info' && styles.filterTabTextActive
              ]}
            >
              🔵 Info
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logs List */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#7B287D" />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderLog}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
        />
      )}
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
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  refreshIcon: {
    fontSize: 20
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333'
  },
  clearIcon: {
    fontSize: 16,
    color: '#9CA3AF',
    padding: 4
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6'
  },
  filterTabActive: {
    backgroundColor: '#7B287D'
  },
  filterTabText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500'
  },
  filterTabTextActive: {
    color: 'white'
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280'
  },
  listContent: {
    padding: 20,
    flexGrow: 1
  },
  logCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  logIcon: {
    fontSize: 16,
    marginRight: 8
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  logType: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  logSource: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500'
  },
  logTime: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  logMessage: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 4
  },
  logUserId: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280'
  }
});
