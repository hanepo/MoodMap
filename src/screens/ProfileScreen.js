import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../contexts/AppContext';

const { width } = Dimensions.get('window');

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { state } = useApp();
  const [completionRate, setCompletionRate] = useState(0);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [incompleteTasks, setIncompleteTasks] = useState([]);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  useEffect(() => {
    if (state.tasks.length > 0) {
      const completed = state.tasks.filter(task => task.completed);
      const incomplete = state.tasks.filter(task => !task.completed);
      
      setCompletedTasks(completed);
      setIncompleteTasks(incomplete);
      setCompletionRate(Math.round((completed.length / state.tasks.length) * 100));
    }
  }, [state.tasks]);

  const getTodaysMood = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayMood = state.moods.find(mood => mood.date === today);
    return todayMood || { moodLabel: 'No entry', mood: 0 };
  };

  const getProgressDescription = () => {
    if (completionRate >= 75) return "You're crushing it today! Almost done! 🎉";
    if (completionRate >= 50) return "Great progress! You're halfway there! 💪";
    if (completionRate > 0) return "Good start! Keep the momentum going! 🚀";
    return "Ready to tackle your tasks? Let's go! ✨";
  };

  const getMoodEmoji = (mood) => {
    if (mood >= 8) return '😄';
    if (mood >= 6) return '🙂';
    if (mood >= 4) return '😐';
    if (mood >= 2) return '😕';
    return '😢';
  };

  const getMoodQuote = (mood) => {
    if (mood >= 9) {
      return "✨ \"Your smile is a curve that sets everything straight.\" Keep shining bright!";
    } else if (mood >= 7) {
      return "🌟 \"Happiness is not by chance, but by choice.\" You're choosing joy today!";
    } else if (mood >= 5) {
      return "🌸 \"Every moment is a fresh beginning.\" Keep moving forward gently.";
    } else if (mood >= 3) {
      return "🌧️ \"The sun will rise and we will try again.\" Tomorrow is a new day.";
    } else if (mood >= 1) {
      return "💙 \"It's okay to not be okay.\" Be gentle with yourself today.";
    } else {
      return "💜 \"Every mood teaches us something.\" You're doing your best.";
    }
  };

  const todaysMood = getTodaysMood();

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
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Today's Mood Card */}
        <View style={styles.moodCard}>
          <Text style={styles.cardTitle}>Today's Mood</Text>
          <View style={styles.moodContainer}>
            <View style={styles.moodIconContainer}>
              <Text style={styles.moodEmoji}>{getMoodEmoji(todaysMood.mood)}</Text>
            </View>
            <View style={styles.moodDetails}>
              <Text style={styles.moodLabel}>{todaysMood.moodLabel}</Text>
              <Text style={styles.moodRating}>{todaysMood.mood}/10</Text>
              {todaysMood.description && (
                <Text style={styles.moodDescription} numberOfLines={2}>
                  {todaysMood.description}
                </Text>
              )}
            </View>
          </View>
          {todaysMood.mood > 0 && (
            <View style={styles.moodQuoteContainer}>
              <Text style={styles.moodQuote}>{getMoodQuote(todaysMood.mood)}</Text>
            </View>
          )}
        </View>

        {/* Daily Tasks Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Tasks</Text>
          <Text style={styles.cardSubtitle}>Overview of your tasks for today</Text>
          
          {/* Progress Circle */}
          <View style={styles.progressCircleContainer}>
            <View style={[styles.progressCircle, {
              backgroundColor: completionRate >= 75 ? '#7067CF' : 
                              completionRate >= 50 ? '#7B287D' : '#F79256'
            }]}>
              <Text style={styles.progressText}>{completionRate}%</Text>
            </View>
          </View>
          
          <Text style={styles.progressDescription}>
            {getProgressDescription()}
          </Text>

          {/* Task Stats */}
          <View style={styles.taskStats}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{completedTasks.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{incompleteTasks.length}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{state.tasks.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          {/* Completed Tasks Checklist */}
          {completedTasks.length > 0 && (
            <View style={styles.taskSection}>
              <Text style={styles.taskSectionTitle}>✓ Completed Today</Text>
              {(showAllCompleted ? completedTasks : completedTasks.slice(0, 3)).map(task => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.checkboxCompleted}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                  <Text style={styles.taskTextCompleted}>{task.title}</Text>
                </View>
              ))}
              {completedTasks.length > 3 && (
                <TouchableOpacity onPress={() => setShowAllCompleted(!showAllCompleted)}>
                  <Text style={styles.moreText}>
                    {showAllCompleted
                      ? 'Show less'
                      : `+${completedTasks.length - 3} more`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Missed Tasks Card */}
        {incompleteTasks.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pending Tasks</Text>
            <Text style={styles.cardSubtitle}>
              {incompleteTasks.length} task{incompleteTasks.length !== 1 ? 's' : ''} waiting for you
            </Text>
            
            <View style={styles.missedTasksContainer}>
              {incompleteTasks.map(task => (
                <View key={task.id} style={styles.missedTaskCard}>
                  <View style={styles.missedTaskHeader}>
                    <View style={styles.checkbox} />
                    <View style={styles.missedTaskContent}>
                      <Text style={styles.missedTaskTitle}>{task.title}</Text>
                      {task.category && (
                        <Text style={styles.missedTaskCategory}>{task.category}</Text>
                      )}
                    </View>
                  </View>
                  {task.description && (
                    <Text style={styles.missedTaskDescription} numberOfLines={2}>
                      {task.description}
                    </Text>
                  )}
                </View>
              ))}
            </View>
            
            <Text style={styles.encouragementText}>
              💪 Don't worry! You can catch up anytime.
            </Text>
          </View>
        )}

        {/* Empty State */}
        {state.tasks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No Tasks Yet</Text>
            <Text style={styles.emptyText}>
              Start by logging your mood and get personalized task recommendations!
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('MoodTracker')}
            >
              <Text style={styles.emptyButtonText}>Log Your Mood</Text>
            </TouchableOpacity>
          </View>
        )}
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
  moodCard: {
    backgroundColor: '#7B287D',
    padding: 25,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  card: { 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  cardTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: 'white',
    marginBottom: 15,
    textAlign: 'center'
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center'
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  moodEmoji: {
    fontSize: 40,
  },
  moodDetails: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  moodRating: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  moodDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  moodQuoteContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  moodQuote: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },
  progressCircleContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  progressCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  progressText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  progressDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  taskStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7B287D',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  taskSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  taskSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 15,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxCompleted: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7067CF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskTextCompleted: {
    fontSize: 15,
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  moreText: {
    fontSize: 14,
    color: '#7B287D',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  missedTasksContainer: {
    marginVertical: 15,
  },
  missedTaskCard: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F79256',
  },
  missedTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    marginTop: 2,
  },
  missedTaskContent: {
    flex: 1,
  },
  missedTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#330C2F',
    marginBottom: 4,
  },
  missedTaskCategory: {
    fontSize: 12,
    color: '#7B287D',
    fontWeight: '500',
    marginBottom: 8,
  },
  missedTaskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 32,
    lineHeight: 20,
  },
  encouragementText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#330C2F',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#7B287D',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;