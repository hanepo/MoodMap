// src/screens/admin/TaskCategories.js
// Admin Task Categories Management - View and manage task categories
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import {
  getTaskCategories,
  createTaskCategory,
  updateTaskCategory,
  deleteTaskCategory
} from '../../services/adminService';

export default function TaskCategories({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Form state
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#7B287D');
  const [categoryIcon, setCategoryIcon] = useState('📋');

  const availableColors = [
    '#7B287D', '#686DE0', '#52C4B0', '#F79256', '#EF4444',
    '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'
  ];

  const availableIcons = [
    '💼', '🏠', '❤️', '📋', '🎯', '💪', '🧘', '📚', '🎨', '🎵',
    '🏃', '🍎', '💻', '✈️', '🎮', '📱', '🌟', '⭐', '🔥', '✨'
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    const result = await getTaskCategories();
    if (result.ok) {
      setCategories(result.data);
    } else {
      setError(result.error);
      Alert.alert('Error', result.error || 'Failed to load categories');
    }
    setLoading(false);
  };

  const handleAddCategory = () => {
    setCategoryName('');
    setCategoryColor('#7B287D');
    setCategoryIcon('📋');
    setAddModalVisible(true);
  };

  const handleSaveNew = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setLoading(true);
    const result = await createTaskCategory({
      name: categoryName,
      color: categoryColor,
      icon: categoryIcon
    });

    setLoading(false);

    if (result.ok) {
      setAddModalVisible(false);
      Alert.alert('Success', 'Category added successfully');
      loadCategories(); // Reload to get fresh data
    } else {
      Alert.alert('Error', result.error || 'Failed to create category');
    }
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setCategoryColor(category.color);
    setCategoryIcon(category.icon);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setLoading(true);
    const result = await updateTaskCategory(selectedCategory.id, {
      name: categoryName,
      color: categoryColor,
      icon: categoryIcon
    });

    setLoading(false);

    if (result.ok) {
      setEditModalVisible(false);
      Alert.alert('Success', 'Category updated successfully');
      loadCategories(); // Reload to get fresh data
    } else {
      Alert.alert('Error', result.error || 'Failed to update category');
    }
  };

  const handleDeleteCategory = (category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await deleteTaskCategory(category.id);
            setLoading(false);

            if (result.ok) {
              Alert.alert('Success', 'Category deleted');
              loadCategories(); // Reload to get fresh data
            } else {
              Alert.alert('Error', result.error || 'Failed to delete category');
            }
          }
        }
      ]
    );
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleEditCategory(item)}
    >
      <View style={styles.categoryLeft}>
        <View style={[styles.categoryIconContainer, { backgroundColor: item.color }]}>
          <Text style={styles.categoryIconText}>{item.icon}</Text>
        </View>
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteCategory(item)}
      >
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📂</Text>
      <Text style={styles.emptyText}>No categories yet</Text>
      <Text style={styles.emptySubtext}>Add your first category to get started</Text>
    </View>
  );

  const CategoryForm = () => (
    <ScrollView
      style={styles.modalBody}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
    >
      <Text style={styles.inputLabel}>Category Name</Text>
      <TextInput
        value={categoryName}
        onChangeText={setCategoryName}
        style={styles.modalInput}
        placeholder="Enter category name"
        placeholderTextColor="#9CA3AF"
        autoFocus={false}
      />

      <Text style={styles.inputLabel}>Icon</Text>
      <View style={styles.iconGrid}>
        {availableIcons.map((icon) => (
          <TouchableOpacity
            key={icon}
            style={[
              styles.iconOption,
              categoryIcon === icon && styles.iconOptionSelected
            ]}
            onPress={() => setCategoryIcon(icon)}
          >
            <Text style={styles.iconOptionText}>{icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.inputLabel}>Color</Text>
      <View style={styles.colorGrid}>
        {availableColors.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              categoryColor === color && styles.colorOptionSelected
            ]}
            onPress={() => setCategoryColor(color)}
          />
        ))}
      </View>

      <View style={styles.previewContainer}>
        <Text style={styles.previewLabel}>Preview</Text>
        <View style={styles.previewCard}>
          <View style={[styles.previewIcon, { backgroundColor: categoryColor }]}>
            <Text style={styles.previewIconText}>{categoryIcon}</Text>
          </View>
          <Text style={styles.previewName}>{categoryName || 'Category Name'}</Text>
        </View>
      </View>
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#7B287D" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Task Categories</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Categories List */}
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
      />

      {/* Add Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add Category</Text>
                    <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <CategoryForm />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButtonSecondary, { flex: 1, marginRight: 8 }]}
                      onPress={() => setAddModalVisible(false)}
                    >
                      <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButtonPrimary, { flex: 1 }]}
                      onPress={handleSaveNew}
                    >
                      <Text style={styles.modalButtonPrimaryText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Edit Category</Text>
                    <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <CategoryForm />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalButtonSecondary, { flex: 1, marginRight: 8 }]}
                      onPress={() => setEditModalVisible(false)}
                    >
                      <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButtonPrimary, { flex: 1 }]}
                      onPress={handleSaveEdit}
                    >
                      <Text style={styles.modalButtonPrimaryText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7B287D',
    justifyContent: 'center',
    alignItems: 'center'
  },
  addIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold'
  },
  listContent: {
    padding: 20,
    flexGrow: 1
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  categoryIconText: {
    fontSize: 24
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  deleteIcon: {
    fontSize: 20
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
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  iconOptionSelected: {
    borderColor: '#7B287D',
    backgroundColor: '#F3E8FF'
  },
  iconOptionText: {
    fontSize: 24
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'transparent'
  },
  colorOptionSelected: {
    borderColor: '#1F2937'
  },
  previewContainer: {
    marginTop: 20,
    marginBottom: 10
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  previewIconText: {
    fontSize: 24
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16
  },
  modalButtonPrimary: {
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
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalButtonSecondaryText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
