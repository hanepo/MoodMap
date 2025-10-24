// src/screens/admin/UserManagement.js
// Admin User Management - List, search, filter, edit, delete users with realtime updates
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch
} from 'react-native';
import {
  getUsers,
  subscribeUsers,
  updateUser,
  deactivateUser,
  reactivateUser,
  deleteUser as deleteUserService
} from '../../services/adminService';

export default function UserManagement({ navigation }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Modals
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Edit form state
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editCanCreateTasks, setEditCanCreateTasks] = useState(true);
  const [editCanExportData, setEditCanExportData] = useState(false);
  const [saving, setSaving] = useState(false);

  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Subscribe to realtime updates
    subscribeToUsers();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  useEffect(() => {
    // Filter users whenever search or status filter changes
    applyFilters();
  }, [users, searchQuery, statusFilter]);

  const subscribeToUsers = () => {
    const unsubscribe = subscribeUsers((result) => {
      if (result.ok) {
        // Ensure unique users by filtering duplicates based on id
        const uniqueUsers = result.data.reduce((acc, user) => {
          if (!acc.find(u => u.id === user.id)) {
            acc.push(user);
          }
          return acc;
        }, []);
        setUsers(uniqueUsers);
      } else {
        Alert.alert('Error', result.error || 'Failed to subscribe to users');
      }
      setLoading(false);
    });
    unsubscribeRef.current = unsubscribe;
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.displayName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((user) => user.isActive !== false);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((user) => user.isActive === false);
    }

    // Ensure unique users in filtered list (additional safety check)
    const uniqueFiltered = filtered.reduce((acc, user) => {
      if (user.id && !acc.find(u => u.id === user.id)) {
        acc.push(user);
      }
      return acc;
    }, []);

    setFilteredUsers(uniqueFiltered);
  };

  const loadMoreUsers = async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    const result = await getUsers({ limit: 20, lastKey: lastDoc });
    if (result.ok) {
      const newUsers = result.data.users;
      if (newUsers.length > 0) {
        setUsers((prev) => [...prev, ...newUsers]);
        setLastDoc(result.data.lastDoc);
      } else {
        setHasMore(false);
      }
    }
    setLoadingMore(false);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setViewModalVisible(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditDisplayName(user.displayName || '');
    setEditRole(user.role || 'user');
    setEditIsActive(user.isActive !== false);
    setEditCanCreateTasks(user.permissions?.canCreateTasks !== false);
    setEditCanExportData(user.permissions?.canExportData || false);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    setSaving(true);
    const payload = {
      displayName: editDisplayName,
      role: editRole,
      isActive: editIsActive,
      permissions: {
        canCreateTasks: editCanCreateTasks,
        canExportData: editCanExportData
      }
    };

    const result = await updateUser(selectedUser.id, payload);
    setSaving(false);

    if (result.ok) {
      Alert.alert('Success', 'User updated successfully');
      setEditModalVisible(false);
      // Realtime listener will update the list automatically
    } else {
      Alert.alert('Error', result.error || 'Failed to update user');
    }
  };

  const handleDeactivate = (user) => {
    Alert.alert(
      'Deactivate User',
      `Are you sure you want to deactivate ${user.displayName}? They will not be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            const result = await deactivateUser(user.id);
            if (result.ok) {
              Alert.alert('Success', 'User deactivated');
            } else {
              Alert.alert('Error', result.error || 'Failed to deactivate user');
            }
          }
        }
      ]
    );
  };

  const handleReactivate = async (user) => {
    const result = await reactivateUser(user.id);
    if (result.ok) {
      Alert.alert('Success', 'User reactivated');
    } else {
      Alert.alert('Error', result.error || 'Failed to reactivate user');
    }
  };

  const handleDelete = (user) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to permanently delete ${user.displayName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteUserService(user.id);
            if (result.ok) {
              Alert.alert('Success', 'User deleted');
            } else {
              Alert.alert('Error', result.error || 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const renderUser = ({ item }) => {
    const isActive = item.isActive !== false;
    const initials = item.displayName?.charAt(0)?.toUpperCase() || 'U';

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => handleViewUser(item)}
      >
        <View style={styles.userLeft}>
          {/* Avatar */}
          <View style={[styles.avatar, !isActive && styles.avatarInactive]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.displayName || 'Unknown'}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <View style={styles.userMeta}>
              <View
                style={[
                  styles.statusBadge,
                  isActive ? styles.statusActive : styles.statusInactive
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isActive ? styles.statusActiveText : styles.statusInactiveText
                  ]}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
              {item.role === 'admin' && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>Admin</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleEditUser(item)}
        >
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>👥</Text>
      <Text style={styles.emptyText}>No users found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery ? 'Try a different search term' : 'Users will appear here'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#7B287D" />
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
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search users..."
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
            style={[styles.filterTab, statusFilter === 'all' && styles.filterTabActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                statusFilter === 'all' && styles.filterTabTextActive
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              statusFilter === 'active' && styles.filterTabActive
            ]}
            onPress={() => setStatusFilter('active')}
          >
            <Text
              style={[
                styles.filterTabText,
                statusFilter === 'active' && styles.filterTabTextActive
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              statusFilter === 'inactive' && styles.filterTabActive
            ]}
            onPress={() => setStatusFilter('inactive')}
          >
            <Text
              style={[
                styles.filterTabText,
                statusFilter === 'inactive' && styles.filterTabTextActive
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* User List */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#7B287D" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item, index) => item.id || `user-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMoreUsers}
          onEndReachedThreshold={0.5}
          extraData={filteredUsers.length}
        />
      )}

      {/* View User Modal */}
      <Modal
        visible={viewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedUser && (
                <>
                  <View style={styles.modalAvatarContainer}>
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarText}>
                        {selectedUser.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>
                      {selectedUser.displayName || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedUser.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Role</Text>
                    <Text style={styles.detailValue}>
                      {selectedUser.role || 'user'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={styles.detailValue}>
                      {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Joined</Text>
                    <Text style={styles.detailValue}>
                      {selectedUser.createdAt
                        ? new Date(selectedUser.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Last Login</Text>
                    <Text style={styles.detailValue}>
                      {selectedUser.lastLogin
                        ? new Date(selectedUser.lastLogin).toLocaleString()
                        : 'Never'}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => {
                  setViewModalVisible(false);
                  handleEditUser(selectedUser);
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Edit</Text>
              </TouchableOpacity>
              {selectedUser?.isActive !== false ? (
                <TouchableOpacity
                  style={styles.modalButtonDanger}
                  onPress={() => {
                    setViewModalVisible(false);
                    handleDeactivate(selectedUser);
                  }}
                >
                  <Text style={styles.modalButtonDangerText}>Deactivate</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.modalButtonPrimary}
                  onPress={() => {
                    setViewModalVisible(false);
                    handleReactivate(selectedUser);
                  }}
                >
                  <Text style={styles.modalButtonPrimaryText}>Reactivate</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                style={styles.modalInput}
                placeholder="Enter name"
              />

              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setEditRole('user')}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      editRole === 'user' && styles.radioCircleSelected
                    ]}
                  />
                  <Text style={styles.radioLabel}>User</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setEditRole('admin')}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      editRole === 'admin' && styles.radioCircleSelected
                    ]}
                  />
                  <Text style={styles.radioLabel}>Admin</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch
                  value={editIsActive}
                  onValueChange={setEditIsActive}
                  trackColor={{ false: '#D1D5DB', true: '#7B287D' }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={styles.sectionLabel}>Permissions</Text>
              <View style={styles.permissionRow}>
                <View style={styles.permissionLeft}>
                  <Text style={styles.permissionLabel}>Can Create Tasks</Text>
                  <Text style={styles.permissionDesc}>
                    Allow user to create and manage tasks
                  </Text>
                </View>
                <Switch
                  value={editCanCreateTasks}
                  onValueChange={setEditCanCreateTasks}
                  trackColor={{ false: '#D1D5DB', true: '#7B287D' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.permissionRow}>
                <View style={styles.permissionLeft}>
                  <Text style={styles.permissionLabel}>Can Export Data</Text>
                  <Text style={styles.permissionDesc}>
                    Allow user to export their data
                  </Text>
                </View>
                <Switch
                  value={editCanExportData}
                  onValueChange={setEditCanExportData}
                  trackColor={{ false: '#D1D5DB', true: '#7B287D' }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  setEditModalVisible(false);
                  handleDelete(selectedUser);
                }}
              >
                <Text style={styles.deleteButtonText}>Delete User</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButtonSecondary,
                  { flex: 1, marginRight: 8 }
                ]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButtonPrimary,
                  { flex: 1 },
                  saving && styles.buttonDisabled
                ]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F6'
  },
  filterTabActive: {
    backgroundColor: '#7B287D'
  },
  filterTabText: {
    fontSize: 14,
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
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7B287D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarInactive: {
    backgroundColor: '#9CA3AF'
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6
  },
  userMeta: {
    flexDirection: 'row',
    gap: 6
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8
  },
  statusActive: {
    backgroundColor: '#D1FAE5'
  },
  statusInactive: {
    backgroundColor: '#FEE2E2'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  statusActiveText: {
    color: '#065F46'
  },
  statusInactiveText: {
    color: '#991B1B'
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#E0E7FF'
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3730A3'
  },
  menuButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuIcon: {
    fontSize: 20,
    color: '#9CA3AF'
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
  },
  footerLoader: {
    paddingVertical: 20
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#330C2F'
  },
  modalClose: {
    fontSize: 24,
    color: '#9CA3AF'
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  modalAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7B287D',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalAvatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold'
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  detailLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600'
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#7B287D',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalButtonPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalButtonSecondaryText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalButtonDanger: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalButtonDangerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 12
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333'
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 8
  },
  radioCircleSelected: {
    borderColor: '#7B287D',
    backgroundColor: '#7B287D'
  },
  radioLabel: {
    fontSize: 15,
    color: '#1F2937'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937'
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#330C2F',
    marginTop: 20,
    marginBottom: 8
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  permissionLeft: {
    flex: 1,
    marginRight: 12
  },
  permissionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2
  },
  permissionDesc: {
    fontSize: 13,
    color: '#6B7280'
  },
  deleteButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center'
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
