// src/services/DatabaseService.js
// Service to view and manage all Firestore data and Firebase Authentication
import { auth, db } from '../config/firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc,
  Timestamp,
  query,
  orderBy,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const DatabaseService = {
  /**
   * Fetch all data from Firestore
   * @returns {Promise<Object>} All collections and their documents
   */
  fetchAllData: async () => {
    try {
      const data = {
        users: [],
        moodEntries: {},
        tasks: {},
        checkIns: {},
        supportResources: [],
        taskCategories: [],
        metadata: {
          fetchedAt: new Date().toISOString(),
          totalUsers: 0,
          totalMoodEntries: 0,
          totalTasks: 0,
          totalCheckIns: 0
        }
      };

      // Fetch all users
      const usersSnap = await getDocs(collection(db, 'users'));
      data.users = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null,
        lastLogin: doc.data().lastLogin?.toDate?.() || null
      }));
      data.metadata.totalUsers = data.users.length;

      // Fetch mood entries for each user
      for (const user of data.users) {
        const moodsSnap = await getDocs(
          query(
            collection(db, 'users', user.id, 'moodEntries'),
            orderBy('createdAt', 'desc')
          )
        );
        data.moodEntries[user.id] = moodsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          timestamp: doc.data().timestamp?.toDate?.() || null
        }));
        data.metadata.totalMoodEntries += data.moodEntries[user.id].length;
      }

      // Fetch tasks for each user
      for (const user of data.users) {
        const tasksSnap = await getDocs(
          query(
            collection(db, 'users', user.id, 'tasks'),
            orderBy('createdAt', 'desc')
          )
        );
        data.tasks[user.id] = tasksSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          completedAt: doc.data().completedAt?.toDate?.() || null
        }));
        data.metadata.totalTasks += data.tasks[user.id].length;
      }

      // Fetch check-ins for each user
      for (const user of data.users) {
        const checkInsSnap = await getDocs(
          collection(db, 'users', user.id, 'checkIns')
        );
        data.checkIns[user.id] = checkInsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        data.metadata.totalCheckIns += data.checkIns[user.id].length;
      }

      // Fetch support resources
      const supportSnap = await getDocs(collection(db, 'supportResources'));
      data.supportResources = supportSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch task categories
      const categoriesSnap = await getDocs(collection(db, 'taskCategories'));
      data.taskCategories = categoriesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching database data:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch all Firebase Authentication users (requires admin SDK in production)
   * Note: This is limited in client SDK, returns current user only
   * @returns {Promise<Object>} Auth user data
   */
  fetchAuthData: async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return {
          success: true,
          data: {
            currentUser: null,
            note: 'No user currently logged in'
          }
        };
      }

      return {
        success: true,
        data: {
          currentUser: {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            emailVerified: currentUser.emailVerified,
            photoURL: currentUser.photoURL,
            phoneNumber: currentUser.phoneNumber,
            createdAt: currentUser.metadata.creationTime,
            lastSignIn: currentUser.metadata.lastSignInTime,
            providerData: currentUser.providerData
          }
        }
      };
    } catch (error) {
      console.error('Error fetching auth data:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Populate database with initial test data
   * @returns {Promise<Object>} Result of population
   */
  populateInitialData: async () => {
    try {
      console.log('Starting database population...');

      // Create test users
      const testUsers = [
        {
          email: 'user1@test.com',
          password: 'password123',
          displayName: 'John Doe',
          role: 'user'
        },
        {
          email: 'user2@test.com',
          password: 'password123',
          displayName: 'Jane Smith',
          role: 'user'
        },
        {
          email: 'admin@test.com',
          password: 'admin123',
          displayName: 'Admin User',
          role: 'admin'
        }
      ];

      const createdUsers = [];

      // Create users in Firebase Auth and Firestore
      for (const testUser of testUsers) {
        try {
          // Create auth user
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            testUser.email,
            testUser.password
          );
          const user = userCredential.user;

          // Create user document in Firestore
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: testUser.email,
            displayName: testUser.displayName,
            role: testUser.role,
            createdAt: Timestamp.now(),
            lastLogin: Timestamp.now(),
            preferences: {
              notificationsEnabled: true,
              reminderTime: '09:00',
              email: {
                news: false,
                updates: true
              }
            }
          });

          createdUsers.push({ uid: user.uid, email: testUser.email, role: testUser.role });
          console.log(`Created user: ${testUser.email}`);
        } catch (error) {
          if (error.code === 'auth/email-already-in-use') {
            console.log(`User ${testUser.email} already exists`);
          } else {
            console.error(`Error creating user ${testUser.email}:`, error);
          }
        }
      }

      // Populate mood entries for regular users
      const regularUsers = createdUsers.filter(u => u.role === 'user');
      for (const user of regularUsers) {
        await DatabaseService.populateMoodEntries(user.uid);
        await DatabaseService.populateTasks(user.uid);
        await DatabaseService.populateCheckIns(user.uid);
      }

      // Populate support resources
      await DatabaseService.populateSupportResources();

      // Populate task categories
      await DatabaseService.populateTaskCategories();

      console.log('Database population complete!');
      return {
        success: true,
        message: 'Database populated successfully',
        users: createdUsers.length
      };
    } catch (error) {
      console.error('Error populating database:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Populate mood entries for a user
   */
  populateMoodEntries: async (userId) => {
    const moodData = [
      { mood: 8, moodLabel: 'Happy', description: 'Had a great day at work!', daysAgo: 0 },
      { mood: 7, moodLabel: 'Good', description: 'Enjoyed time with friends', daysAgo: 1 },
      { mood: 6, moodLabel: 'Okay', description: 'Regular day, nothing special', daysAgo: 2 },
      { mood: 5, moodLabel: 'Neutral', description: 'Feeling balanced', daysAgo: 3 },
      { mood: 7, moodLabel: 'Good', description: 'Productive work session', daysAgo: 4 },
      { mood: 9, moodLabel: 'Very Happy', description: 'Received good news!', daysAgo: 5 },
      { mood: 6, moodLabel: 'Okay', description: 'Bit tired today', daysAgo: 6 },
      { mood: 8, moodLabel: 'Happy', description: 'Weekend plans are exciting', daysAgo: 7 },
      { mood: 4, moodLabel: 'Low', description: 'Stressful meeting', daysAgo: 8 },
      { mood: 7, moodLabel: 'Good', description: 'Exercise made me feel better', daysAgo: 9 }
    ];

    for (const entry of moodData) {
      const date = new Date();
      date.setDate(date.getDate() - entry.daysAgo);

      await addDoc(collection(db, 'users', userId, 'moodEntries'), {
        mood: entry.mood,
        moodLabel: entry.moodLabel,
        description: entry.description,
        rawInput: entry.description,
        timestamp: Timestamp.fromDate(date),
        createdAt: Timestamp.fromDate(date),
        userId: userId
      });
    }
    console.log(`Added ${moodData.length} mood entries for user ${userId}`);
  },

  /**
   * Populate tasks for a user
   */
  populateTasks: async (userId) => {
    const taskData = [
      { title: 'Morning meditation', category: 'Wellness', difficulty: 'Easy', completed: true, daysAgo: 0 },
      { title: 'Read a book for 30 minutes', category: 'Leisure', difficulty: 'Easy', completed: true, daysAgo: 0 },
      { title: 'Call a friend', category: 'Social', difficulty: 'Easy', completed: false, daysAgo: 1 },
      { title: 'Go for a walk', category: 'Exercise', difficulty: 'Medium', completed: true, daysAgo: 1 },
      { title: 'Organize workspace', category: 'Productivity', difficulty: 'Medium', completed: false, daysAgo: 2 },
      { title: 'Cook a healthy meal', category: 'Health', difficulty: 'Medium', completed: true, daysAgo: 2 },
      { title: 'Practice gratitude journaling', category: 'Wellness', difficulty: 'Easy', completed: true, daysAgo: 3 },
      { title: 'Plan weekend activities', category: 'Leisure', difficulty: 'Easy', completed: false, daysAgo: 3 },
      { title: 'Yoga session', category: 'Exercise', difficulty: 'Medium', completed: true, daysAgo: 4 },
      { title: 'Learn something new', category: 'Growth', difficulty: 'Hard', completed: false, daysAgo: 5 }
    ];

    for (const task of taskData) {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - task.daysAgo);

      const taskDoc = {
        title: task.title,
        category: task.category,
        difficultyLevel: task.difficulty,
        completed: task.completed,
        createdAt: Timestamp.fromDate(createdDate),
        userId: userId,
        source: 'admin-populated'
      };

      if (task.completed) {
        taskDoc.completedAt = Timestamp.fromDate(createdDate);
      }

      await addDoc(collection(db, 'users', userId, 'tasks'), taskDoc);
    }
    console.log(`Added ${taskData.length} tasks for user ${userId}`);
  },

  /**
   * Populate check-ins for a user
   */
  populateCheckIns: async (userId) => {
    const checkInData = [];

    // Create check-ins for the last 10 days
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      checkInData.push({
        date: dateString,
        timestamp: Timestamp.fromDate(date)
      });
    }

    for (const checkIn of checkInData) {
      await setDoc(doc(db, 'users', userId, 'checkIns', checkIn.date), {
        date: checkIn.date,
        checkedIn: true,
        timestamp: checkIn.timestamp
      });
    }
    console.log(`Added ${checkInData.length} check-ins for user ${userId}`);
  },

  /**
   * Populate support resources
   */
  populateSupportResources: async () => {
    const resources = [
      {
        title: 'Mental Health Hotline',
        description: '24/7 crisis support and counseling',
        type: 'hotline',
        contact: '1-800-273-8255',
        available: '24/7'
      },
      {
        title: 'Online Therapy Platform',
        description: 'Connect with licensed therapists online',
        type: 'service',
        url: 'https://www.betterhelp.com',
        available: 'By appointment'
      },
      {
        title: 'Meditation App',
        description: 'Guided meditation and mindfulness exercises',
        type: 'app',
        url: 'https://www.calm.com',
        available: 'Anytime'
      },
      {
        title: 'Local Support Group',
        description: 'Weekly mental health support meetings',
        type: 'group',
        contact: 'Check local listings',
        available: 'Weekly'
      }
    ];

    for (const resource of resources) {
      await addDoc(collection(db, 'supportResources'), resource);
    }
    console.log(`Added ${resources.length} support resources`);
  },

  /**
   * Populate task categories
   */
  populateTaskCategories: async () => {
    const categories = [
      { name: 'Wellness', icon: '🧘', color: '#7B287D', description: 'Mental and emotional wellbeing' },
      { name: 'Exercise', icon: '🏃', color: '#F79256', description: 'Physical activity and fitness' },
      { name: 'Social', icon: '👥', color: '#7067CF', description: 'Social connections and relationships' },
      { name: 'Leisure', icon: '🎨', color: '#B7C0EE', description: 'Hobbies and relaxation' },
      { name: 'Productivity', icon: '💼', color: '#330C2F', description: 'Work and personal projects' },
      { name: 'Health', icon: '🍎', color: '#CBF3D2', description: 'Physical health and nutrition' },
      { name: 'Growth', icon: '📚', color: '#E8B4BC', description: 'Learning and personal development' }
    ];

    for (const category of categories) {
      await setDoc(doc(db, 'taskCategories', category.name.toLowerCase()), category);
    }
    console.log(`Added ${categories.length} task categories`);
  },

  /**
   * Clear all data from database (use with caution!)
   */
  clearAllData: async () => {
    try {
      console.warn('CLEARING ALL DATABASE DATA...');

      // Get all users
      const usersSnap = await getDocs(collection(db, 'users'));

      // Delete all subcollections for each user
      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;

        // Delete mood entries
        const moodsSnap = await getDocs(collection(db, 'users', userId, 'moodEntries'));
        const batch1 = writeBatch(db);
        moodsSnap.docs.forEach(doc => batch1.delete(doc.ref));
        await batch1.commit();

        // Delete tasks
        const tasksSnap = await getDocs(collection(db, 'users', userId, 'tasks'));
        const batch2 = writeBatch(db);
        tasksSnap.docs.forEach(doc => batch2.delete(doc.ref));
        await batch2.commit();

        // Delete check-ins
        const checkInsSnap = await getDocs(collection(db, 'users', userId, 'checkIns'));
        const batch3 = writeBatch(db);
        checkInsSnap.docs.forEach(doc => batch3.delete(doc.ref));
        await batch3.commit();

        // Delete user document
        await deleteDoc(doc(db, 'users', userId));
      }

      // Delete support resources
      const supportSnap = await getDocs(collection(db, 'supportResources'));
      const batch4 = writeBatch(db);
      supportSnap.docs.forEach(doc => batch4.delete(doc.ref));
      await batch4.commit();

      // Delete task categories
      const categoriesSnap = await getDocs(collection(db, 'taskCategories'));
      const batch5 = writeBatch(db);
      categoriesSnap.docs.forEach(doc => batch5.delete(doc.ref));
      await batch5.commit();

      console.log('All data cleared successfully');
      return { success: true, message: 'All data cleared' };
    } catch (error) {
      console.error('Error clearing data:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get database statistics
   */
  getDatabaseStats: async () => {
    try {
      const stats = {
        users: 0,
        moodEntries: 0,
        tasks: 0,
        checkIns: 0,
        supportResources: 0,
        taskCategories: 0
      };

      const usersSnap = await getDocs(collection(db, 'users'));
      stats.users = usersSnap.size;

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;

        const moodsSnap = await getDocs(collection(db, 'users', userId, 'moodEntries'));
        stats.moodEntries += moodsSnap.size;

        const tasksSnap = await getDocs(collection(db, 'users', userId, 'tasks'));
        stats.tasks += tasksSnap.size;

        const checkInsSnap = await getDocs(collection(db, 'users', userId, 'checkIns'));
        stats.checkIns += checkInsSnap.size;
      }

      const supportSnap = await getDocs(collection(db, 'supportResources'));
      stats.supportResources = supportSnap.size;

      const categoriesSnap = await getDocs(collection(db, 'taskCategories'));
      stats.taskCategories = categoriesSnap.size;

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { success: false, error: error.message };
    }
  }
};

export default DatabaseService;
