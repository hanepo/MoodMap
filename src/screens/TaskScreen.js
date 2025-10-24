import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert // Import Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RecommendationService from '../services/RecommendationService';
import TaskService from '../services/TaskService'; // Import TaskService
import { useApp } from '../contexts/AppContext'; // Import useApp

const TaskScreen = ({ route }) => {
  const navigation = useNavigation();
  const { state, dispatch } = useApp(); // Get state and dispatch

  console.log('========== TASK SCREEN DEBUG ==========');
  console.log('route.params:', route.params);

  const { mood, moodCategory } = route.params || { mood: 'Good', moodCategory: 'medium' };

  console.log('Received mood:', mood);
  console.log('Received moodCategory:', moodCategory);
  console.log('=======================================');

  const [selectedTasks, setSelectedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add submitting state

  useEffect(() => {
    console.log('📋 Fetching tasks for moodCategory:', moodCategory);
    fetchTasks();
  }, [moodCategory]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      console.log('🔍 Calling RecommendationService with:', moodCategory);
      const fetchedTasks = await RecommendationService.getRecommendations(moodCategory);
      console.log('✅ Received', fetchedTasks.length, 'recommendations');
      setRecommendations(fetchedTasks);
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      Alert.alert('Error', 'Could not fetch recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const moodEmojis = {
    'Terrible': '😢',
    'Very Bad': '😟',
    'Bad': '😕',
    'Poor': '😐',
    'Okay': '😌',
    'Good': '🙂',
    'Very Good': '😊',
    'Great': '😄',
    'Amazing': '😁',
    'Perfect': '🤩'
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSubmit = async () => {
    if (selectedTasks.length === 0) {
      Alert.alert('No Tasks', 'Please select at least one task!');
      return;
    }

    if (!state.user?.uid) {
      Alert.alert('Error', 'You must be logged in to add tasks.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find the full task objects that were selected
      const tasksToAdd = recommendations.filter(task => 
        selectedTasks.includes(task.id)
      );

      let successCount = 0;

      // Loop through each selected task and create it in the database
      for (const task of tasksToAdd) {
        const taskData = {
          title: task.name,
          description: task.description,
          category: task.category,
          energyLevel: moodCategory, // Associate with the current mood
          difficultyLevel: task.level,
          associatedMood: mood,
          isCustom: false // It's a recommended task
        };
        
        // Use TaskService to create the task
        const newTask = await TaskService.createTask(state.user.uid, taskData);
        
        // Add the new task to our global state
        dispatch({ type: 'ADD_TASK', payload: newTask });
        successCount++;
      }

      Alert.alert(
        'Success!',
        `Successfully added ${successCount} new task${successCount > 1 ? 's' : ''} to your list.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }] // Go to Home
      );

    } catch (error) {
      console.error('Error submitting tasks:', error);
      Alert.alert('Error', 'Failed to save your tasks. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddYourOwn = () => {
    navigation.navigate('TaskEditor');
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'Easy': return '#4CAF50';
      case 'Medium': return '#FF9800';
      case 'Hard': return '#F44336';
      default: return '#757575';
    }
  };

  const getEnergyLevelColor = (energyLevel) => {
    switch (energyLevel) {
      case 'low': return '#60A5FA'; // Blue for low energy (calm)
      case 'medium': return '#FBBF24'; // Yellow for medium energy
      case 'high': return '#34D399'; // Green for high energy (productive)
      default: return '#9CA3AF'; // Gray for unknown
    }
  };

  const getEnergyLevelLabel = (energyLevel) => {
    switch (energyLevel) {
      case 'low': return 'Low Energy';
      case 'medium': return 'Medium Energy';
      case 'high': return 'High Energy';
      default: return energyLevel;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Mindfulness': return '🧘';
      case 'Reflection': return '📝';
      case 'Physical': return '💪';
      case 'Social': return '👥';
      case 'Creative': return '🎨';
      case 'Self-Care': return '💖';
      default: return '📋';
    }
  };

  const renderTaskItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.taskItem, selectedTasks.includes(item.id) && styles.selectedTask]}
      onPress={() => toggleTaskSelection(item.id)}
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskIcon}>{getCategoryIcon(item.category)}</Text>
        <View style={styles.taskContent}>
          <Text style={styles.taskName}>{item.name}</Text>
          <Text style={styles.taskDescription}>{item.description}</Text>
        </View>
        <View style={styles.taskMeta}>
          {/* Show Energy Level Badge */}
          <View style={[styles.levelBadge, { backgroundColor: getEnergyLevelColor(item.energyLevel) }]}>
            <Text style={styles.levelText}>{getEnergyLevelLabel(item.energyLevel)}</Text>
          </View>
          {/* Optionally show difficulty level below */}
          {item.level && item.level !== 'Medium' && (
            <View style={[styles.difficultyBadge, { backgroundColor: getLevelColor(item.level) }]}>
              <Text style={styles.difficultyText}>{item.level}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#7B287D" style={{ marginTop: 40 }} />;
    }
    
    if (recommendations.length === 0) {
      return <Text style={styles.emptyText}>No recommendations found for this mood. Try creating your own!</Text>;
    }

    return (
      <FlatList
        data={recommendations}
        renderItem={renderTaskItem}
        keyExtractor={item => item.id}
        extraData={selectedTasks}
        scrollEnabled={false}
        style={styles.taskList}
      />
    );
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
        <Text style={styles.headerTitle}>Tasks for You</Text>
        <TouchableOpacity style={styles.menuButton}>
          <View style={styles.menuDot} />
          <View style={styles.menuDot} />
          <View style={styles.menuDot} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.moodSection}>
          <Text style={styles.sectionTitle}>Current Mood</Text>
          <View style={styles.moodDisplay}>
            <View style={styles.moodSummaryBox}>
              <Text style={styles.moodSummaryText}>
                You're feeling {mood.toLowerCase()} today {moodEmojis[mood] || '🙂'}
              </Text>
              <Text style={styles.moodRecommendation}>
                Based on your mood, here are some activities that might help:
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.recommendationsSection}>
          <View style={styles.recommendationsHeader}>
            <Text style={styles.sectionTitle}>Your Recommended Tasks</Text>
            <Text style={styles.sectionSubtitle}>
              {recommendations.length} activities found
            </Text>
          </View>
          {renderContent()}
        </View>

        <View style={styles.addSection}>
          <Text style={styles.addHeading}>
            Don't see what you need? <Text style={styles.addLink} onPress={handleAddYourOwn}>Add your own!</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton, 
            (selectedTasks.length === 0 || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={selectedTasks.length === 0 || isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting 
              ? 'Adding...' 
              : `Add Task${selectedTasks.length !== 1 ? 's' : ''} (${selectedTasks.length})`
            }
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  menuButton: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  menuDot: {
    width: 5,
    height: 5,
    backgroundColor: '#333',
    borderRadius: 2.5,
    marginVertical: 1.5,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  moodSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  moodDisplay: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  moodSummaryBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 15,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  moodSummaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330C2F',
    marginBottom: 5,
  },
  moodRecommendation: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  recommendationsSection: {
    marginBottom: 30,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  taskList: {
    marginBottom: 20,
  },
  taskItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedTask: {
    borderColor: '#7B287D',
    backgroundColor: '#F8F4FF',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  taskIcon: {
    fontSize: 24,
    marginRight: 15,
    width: 30,
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330C2F',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  taskMeta: {
    alignItems: 'flex-end',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  addSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  addHeading: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  addLink: {
    color: '#7B287D',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#330C2F',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 30,
    paddingHorizontal: 20
  }
});

export default TaskScreen;