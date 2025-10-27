import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';
import TaskService from '../services/TaskService';

const TaskEditorScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { state, dispatch } = useApp();
  
  // Check if we're editing an existing task
  const taskToEdit = route.params?.taskToEdit;
  const isEditMode = !!taskToEdit;
  
  // Form state
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);
  const [effort, setEffort] = useState(5);
  const [focus, setFocus] = useState(5);
  const [urgency, setUrgency] = useState(false);
  const [category, setCategory] = useState('Reflection');

  // Load existing task data when in edit mode
  useEffect(() => {
    if (isEditMode && taskToEdit) {
      setTaskName(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setSelectedMood(taskToEdit.associatedMood || null);
      setEffort(taskToEdit.effort || 5);
      setFocus(taskToEdit.focus || 5);
      setUrgency(taskToEdit.urgency || false);
      setCategory(taskToEdit.category || 'Reflection');
    }
  }, [isEditMode, taskToEdit]);

  // Mood categories matching your schema
  const moodOptions = [
    { label: 'Happy', emoji: '😊', energyLevel: 'high' },
    { label: 'Sad', emoji: '😢', energyLevel: 'low' },
    { label: 'Neutral', emoji: '😐', energyLevel: 'medium' },
    { label: 'Angry', emoji: '😠', energyLevel: 'low' },
    { label: 'Calm', emoji: '😌', energyLevel: 'medium' },
  ];

  const categories = ['Mindfulness', 'Reflection', 'Physical', 'Social', 'Creative'];

  // Compute energy level from effort and focus
  const computeEnergyLevel = () => {
    const score = (effort + focus) / 2;
    if (score < 3) return 'Low';
    if (score < 7) return 'Medium';
    return 'High';
  };

  // Compute difficulty level
  const computeDifficultyLevel = () => {
    const score = (effort + focus) / 2;
    if (score < 4) return 'Easy';
    if (score < 7) return 'Medium';
    return 'Hard';
  };

  const handleSubmitTask = async () => {
    if (!taskName.trim()) {
      Alert.alert('Error', 'Please enter a task name!');
      return;
    }

    if (!selectedMood) {
      Alert.alert('Error', 'Please select a mood/emotion!');
      return;
    }

    if (!state.user?.uid) {
      Alert.alert('Error', 'Please log in to create tasks');
      return;
    }

    try {
      const taskData = {
        title: taskName.trim(),
        description: description.trim(),
        category: category,
        effort: effort,
        focus: focus,
        energyLevel: computeEnergyLevel(),
        difficultyLevel: computeDifficultyLevel(),
        urgency: urgency,
        associatedMood: selectedMood,
        isCustom: true
      };

      if (isEditMode) {
        // Update existing task
        await TaskService.updateTask(state.user.uid, taskToEdit.id, taskData);
        
        dispatch({
          type: 'UPDATE_TASK',
          payload: {
            id: taskToEdit.id,
            updates: taskData
          }
        });

        Alert.alert('Success', 'Task updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new task
        const newTask = await TaskService.createTask(state.user.uid, taskData);
        
        dispatch({
          type: 'ADD_TASK',
          payload: newTask
        });

        Alert.alert('Success', 'Task created successfully!', [
          { text: 'OK', onPress: () => {
            // Reset form
            setTaskName('');
            setDescription('');
            setSelectedMood(null);
            setEffort(5);
            setFocus(5);
            setUrgency(false);
            navigation.goBack();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} task. Please try again.`);
    }
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
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Task' : 'Task Editor'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{isEditMode ? 'Edit Your Task' : 'Create Custom Task'}</Text>
          <Text style={styles.infoText}>
            {isEditMode 
              ? 'Update your task details to better match your current needs.'
              : 'Design tasks that match your mood and energy levels. These will appear as recommendations when you log your mood.'
            }
          </Text>
        </View>

        {/* Task Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Details</Text>
          
          {/* Task Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Task Name *</Text>
            <TextInput
              style={styles.input}
              value={taskName}
              onChangeText={setTaskName}
              placeholder="e.g., Morning meditation"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add details about this task..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextActive
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Mood Association Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Associated Mood *</Text>
          <Text style={styles.sectionSubtitle}>
            Select when this task is most helpful
          </Text>
          
          <View style={styles.moodContainer}>
            {moodOptions.map((mood) => (
              <TouchableOpacity
                key={mood.label}
                style={[
                  styles.moodItem,
                  selectedMood === mood.label && styles.moodItemActive
                ]}
                onPress={() => setSelectedMood(mood.label)}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[
                  styles.moodLabel,
                  selectedMood === mood.label && styles.moodLabelActive
                ]}>
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Task Requirements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Requirements</Text>
          
          {/* Effort Level */}
          <View style={styles.sliderGroup}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>Effort Required</Text>
              <Text style={styles.sliderValue}>{effort}/10</Text>
            </View>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${(effort / 10) * 100}%` }]} />
            </View>
            <View style={styles.sliderButtons}>
              {[1,2,3,4,5,6,7,8,9,10].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[styles.sliderButton, effort === val && styles.sliderButtonActive]}
                  onPress={() => setEffort(val)}
                >
                  <Text style={[
                    styles.sliderButtonText,
                    effort === val && styles.sliderButtonTextActive
                  ]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Focus Level */}
          <View style={styles.sliderGroup}>
            <View style={styles.sliderHeader}>
              <Text style={styles.label}>Focus Required</Text>
              <Text style={styles.sliderValue}>{focus}/10</Text>
            </View>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${(focus / 10) * 100}%` }]} />
            </View>
            <View style={styles.sliderButtons}>
              {[1,2,3,4,5,6,7,8,9,10].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[styles.sliderButton, focus === val && styles.sliderButtonActive]}
                  onPress={() => setFocus(val)}
                >
                  <Text style={[
                    styles.sliderButtonText,
                    focus === val && styles.sliderButtonTextActive
                  ]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Computed Energy Level Display */}
          <View style={styles.computedDisplay}>
            <Text style={styles.computedLabel}>Energy Level: </Text>
            <Text style={styles.computedValue}>{computeEnergyLevel()}</Text>
            <Text style={styles.computedLabel}> • Difficulty: </Text>
            <Text style={styles.computedValue}>{computeDifficultyLevel()}</Text>
          </View>

          {/* Urgency Toggle */}
          <TouchableOpacity 
            style={styles.urgencyToggle}
            onPress={() => setUrgency(!urgency)}
          >
            <View style={[styles.checkbox, urgency && styles.checkboxActive]}>
              {urgency && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.urgencyText}>Mark as urgent/high priority</Text>
          </TouchableOpacity>
        </View>

        {/* Info Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            💡 This task will be filtered and displayed as an option when you log your mood matching the selected emotion.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitTask}>
          <Text style={styles.submitButtonText}>{isEditMode ? 'Save Changes' : 'Create Task'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
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
  container: { 
    flex: 1 
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40
  },
  infoCard: {
    backgroundColor: '#7B287D',
    padding: 20,
    borderRadius: 16,
    marginBottom: 25,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#330C2F',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: '#E9D5FF',
    borderColor: '#7B287D',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#7B287D',
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodItem: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  moodItemActive: {
    backgroundColor: '#E9D5FF',
    borderColor: '#7B287D',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  moodLabelActive: {
    color: '#7B287D',
  },
  sliderGroup: {
    marginBottom: 25,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7B287D',
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 12,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#7B287D',
    borderRadius: 4,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  sliderButtonActive: {
    backgroundColor: '#7B287D',
  },
  sliderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  sliderButtonTextActive: {
    color: 'white',
  },
  computedDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 15,
  },
  computedLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  computedValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7B287D',
  },
  urgencyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#7B287D',
    borderColor: '#7B287D',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  urgencyText: {
    fontSize: 15,
    color: '#330C2F',
    fontWeight: '500',
  },
  noteCard: {
    backgroundColor: '#FEF3C7',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  noteText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#330C2F',
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TaskEditorScreen;