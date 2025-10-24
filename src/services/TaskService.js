import { collection, addDoc, query, orderBy, limit, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

export const TaskService = {
  // Create a new task
  createTask: async (userId, taskData) => {
    if (!userId) throw new Error('No user ID provided');
    
    try {
      console.log(`Creating task: "${taskData.title}" for user ${userId}`);
      
      const task = {
        title: taskData.title?.trim() || 'Untitled Task',
        description: taskData.description?.trim() || '',
        completed: false,
        createdAt: new Date(),
        completedAt: null,
        category: taskData.category || 'Reflection',
        energyLevel: taskData.energyLevel || 'Medium',
        difficultyLevel: taskData.difficultyLevel || 'Easy',
        associatedMood: taskData.associatedMood || null,
        isCustom: taskData.isCustom || false
      };

      const tasksRef = collection(db, 'users', userId, 'tasks');
      const docRef = await addDoc(tasksRef, task);
      
      // Update user's total tasks count
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        totalTasks: increment(1)
      });

      console.log('Task created successfully with ID:', docRef.id);
      return { id: docRef.id, ...task };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // Complete a task
  completeTask: async (userId, taskId) => {
    if (!userId) throw new Error('No user ID provided');
    
    try {
      console.log(`✅ Completing task ${taskId} for user ${userId}`);
      
      const taskRef = doc(db, 'users', userId, 'tasks', taskId);
      await updateDoc(taskRef, {
        completed: true,
        completedAt: new Date()
      });
      
      // Update user's completed tasks count
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        completedTasks: increment(1)
      });

      console.log('✅ Task completed successfully');
    } catch (error) {
      console.error('❌ Error completing task:', error);
      throw error;
    }
  },

  // Get all tasks for a user
  getTasks: async (userId) => {
    if (!userId) return [];
    
    try {
      console.log(`📋 Fetching all tasks for user ${userId}`);
      
      const tasksRef = collection(db, 'users', userId, 'tasks');
      const q = query(tasksRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const tasks = [];
      
      querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Retrieved ${tasks.length} tasks`);
      return tasks;
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      return [];
    }
  },

  // Get pending (incomplete) tasks
  getPendingTasks: async (userId) => {
    try {
      console.log(`⏳ Fetching pending tasks for user ${userId}`);
      
      const allTasks = await TaskService.getTasks(userId);
      const pendingTasks = allTasks.filter(task => !task.completed);

      console.log(`✅ Retrieved ${pendingTasks.length} pending tasks`);
      return pendingTasks;
    } catch (error) {
      console.error('❌ Error fetching pending tasks:', error);
      return [];
    }
  },

  // Get completed tasks
  getCompletedTasks: async (userId) => {
    try {
      console.log(`✅ Fetching completed tasks for user ${userId}`);
      
      const allTasks = await TaskService.getTasks(userId);
      const completedTasks = allTasks.filter(task => task.completed);

      console.log(`✅ Retrieved ${completedTasks.length} completed tasks`);
      return completedTasks;
    } catch (error) {
      console.error('❌ Error fetching completed tasks:', error);
      return [];
    }
  },

  // Calculate task statistics
  getTaskStats: async (userId) => {
    try {
      console.log(`📊 Calculating task statistics for user ${userId}`);
      
      const allTasks = await TaskService.getTasks(userId);
      const completedTasks = allTasks.filter(task => task.completed);
      const pendingTasks = allTasks.filter(task => !task.completed);
      
      const completionRate = allTasks.length > 0 
        ? Math.round((completedTasks.length / allTasks.length) * 100) 
        : 0;

      const stats = {
        total: allTasks.length,
        completed: completedTasks.length,
        pending: pendingTasks.length,
        completionRate
      };

      console.log('✅ Task stats calculated:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error calculating task stats:', error);
      return { total: 0, completed: 0, pending: 0, completionRate: 0 };
    }
  },

  // Get task summary for Tasks card (e.g., recent tasks)
  getTaskSummary: async (userId, limitCount = 2) => {
    if (!userId) return [];
    
    try {
      console.log(`📋 Fetching task summary for ${limitCount} entries for user ${userId}`);
      
      const tasksRef = collection(db, 'users', userId, 'tasks');
      const q = query(tasksRef, orderBy('createdAt', 'desc'), limit(limitCount));
      
      const querySnapshot = await getDocs(q);
      const summary = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        summary.push({
          id: doc.id,
          title: data.title,
          completed: data.completed,
          createdAt: data.createdAt
        });
      });

      console.log(`✅ Retrieved ${summary.length} task summary entries`);
      return summary;
    } catch (error) {
      console.error('❌ Error fetching task summary:', error);
      return [];
    }
  }
};

export default TaskService;