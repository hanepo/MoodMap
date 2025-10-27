// src/screens/TaskListScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import TaskService from '../services/TaskService'; // Import TaskService

const TaskListScreen = () => {
  const navigation = useNavigation();
  const { state, dispatch } = useApp(); // Get state and dispatch
  const { user, tasks } = state; // Destructure user and tasks from state

  // Separate tasks into pending and completed
  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  // Function to handle marking a task as complete
  const handleToggleComplete = async (task) => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }
    // Prevent completing already completed tasks via this toggle for now
    if (task.completed) {
        // Optional: Implement un-completing later if needed
        console.log('Task already completed.');
        return;
    }

    try {
      // Call the service to update Firestore
      await TaskService.completeTask(user.uid, task.id);

      // Update the task in the global state
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          id: task.id,
          updates: { completed: true, completedAt: new Date() } // Simulate update
        }
      });
      Alert.alert('Success', `Task "${task.title}" marked as complete!`);

    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to update task status.');
    }
  };

  // Render item for FlatList
  const renderTaskItem = ({ item }) => {
    const isCompleted = item.completed;
    return (
      <View style={[styles.taskItem, isCompleted && styles.taskItemCompleted]}>
        <TouchableOpacity
          style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
          onPress={() => handleToggleComplete(item)}
          disabled={isCompleted} // Disable button if already completed
        >
          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
            {item.title || 'Untitled Task'}
          </Text>
          {item.description && !isCompleted && ( // Show description only if not completed
            <Text style={styles.taskDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          {item.category && (
            <Text style={styles.taskCategory}>
                Category: {item.category} {item.associatedMood ? `(${item.associatedMood})` : ''}
            </Text>
          )}
        </View>
        {/* Optional: Add an edit or delete button here */}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()} // Use goBack for simplicity
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Tasks</Text>
        <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('TaskEditor')} // Link to Task Editor
        >
            <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.container}>
        {/* Pending Tasks Section */}
        {pendingTasks.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending ({pendingTasks.length})</Text>
            <FlatList
              data={pendingTasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false} // Disable inner scrolling
            />
          </View>
        ) : (
          <Text style={styles.emptyText}>No pending tasks. Great job!</Text>
        )}

        {/* Completed Tasks Section */}
        {completedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed ({completedTasks.length})</Text>
            <FlatList
              data={completedTasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false} // Disable inner scrolling
            />
          </View>
        )}

        {/* Empty state if no tasks at all */}
        {tasks.length === 0 && (
             <Text style={styles.emptyText}>You haven't added any tasks yet. Log your mood or add one manually!</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // ✅ For Android devices
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
   addButton: { // Style for the Add (+) button
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7B287D',
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    lineHeight: 26, // Adjust for vertical centering
  },
  container: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 15,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align items to the top
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#4B5563',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  taskItemCompleted: {
    backgroundColor: '#F3F4F6', // Lighter background for completed
    opacity: 0.7, // Slightly faded out
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7067CF', // Purple border for pending
    marginRight: 15,
    marginTop: 2, // Align checkbox slightly lower
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#7067CF', // Filled purple for completed
    borderColor: '#7067CF',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1, // Take remaining space
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330C2F',
    marginBottom: 5,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280', // Gray out text
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  taskCategory: {
      fontSize: 12,
      color: '#A78BFA', // Lighter purple for category/mood
      fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 40,
    paddingHorizontal: 30,
    lineHeight: 24,
  },
});

export default TaskListScreen;