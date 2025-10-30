// src/services/adminService.js
// Firebase Admin Service - Modular v9 SDK
// All functions return { ok: boolean, data?: any, error?: string }

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Helper to wrap responses in consistent shape
const createResponse = (ok, data = null, error = null) => ({ ok, data, error });

/**
 * Get paginated users list with optional filters
 * @param {Object} params - { limit: number, lastKey: DocumentSnapshot, q: string, status: 'active'|'inactive' }
 * @returns {Promise<{ok, data: {users: [], lastDoc}, error}>}
 */
export const getUsers = async ({ limit: pageLimit = 20, lastKey = null, q = '', status = null }) => {
  try {
    const usersRef = collection(db, 'users');
    let constraints = [orderBy('createdAt', 'desc')];

    // Filter by status (active/inactive)
    if (status === 'active') {
      constraints.push(where('isActive', '==', true));
    } else if (status === 'inactive') {
      constraints.push(where('isActive', '==', false));
    }

    // Add pagination
    constraints.push(limit(pageLimit));
    if (lastKey) {
      constraints.push(startAfter(lastKey));
    }

    const q_query = query(usersRef, ...constraints);
    const snapshot = await getDocs(q_query);

    let users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || null,
      lastLogin: doc.data().lastLogin?.toDate?.() || null
    }));

    // Client-side filter by search query (displayName or email)
    // Note: For production, consider using Algolia or similar for full-text search
    if (q) {
      const searchLower = q.toLowerCase();
      users = users.filter(user =>
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }

    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return createResponse(true, { users, lastDoc });
  } catch (error) {
    console.error('getUsers error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Subscribe to real-time user updates
 * @param {Function} callback - Called with { ok, data: users[], error }
 * @returns {Function} unsubscribe function
 */
export const subscribeUsers = (callback) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          lastLogin: doc.data().lastLogin?.toDate?.() || null
        }));
        callback(createResponse(true, users));
      },
      (error) => {
        console.error('subscribeUsers error:', error);
        callback(createResponse(false, null, error.message));
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('subscribeUsers setup error:', error);
    callback(createResponse(false, null, error.message));
    return () => {}; // noop unsubscribe
  }
};

/**
 * Update user data
 * @param {string} uid - User ID
 * @param {Object} payload - Fields to update (e.g., { role: 'admin', displayName: 'New Name' })
 * @returns {Promise<{ok, data, error}>}
 */
export const updateUser = async (uid, payload) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...payload,
      updatedAt: serverTimestamp()
    });
    return createResponse(true, { uid, updated: payload });
  } catch (error) {
    console.error('updateUser error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Deactivate user (soft delete - sets isActive: false)
 * @param {string} uid
 * @returns {Promise<{ok, data, error}>}
 */
export const deactivateUser = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isActive: false,
      deactivatedAt: serverTimestamp()
    });
    return createResponse(true, { uid, deactivated: true });
  } catch (error) {
    console.error('deactivateUser error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Reactivate user
 * @param {string} uid
 * @returns {Promise<{ok, data, error}>}
 */
export const reactivateUser = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isActive: true,
      reactivatedAt: serverTimestamp()
    });
    return createResponse(true, { uid, reactivated: true });
  } catch (error) {
    console.error('reactivateUser error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Permanently delete user (hard delete)
 * @param {string} uid
 * @returns {Promise<{ok, data, error}>}
 */
export const deleteUser = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    // NOTE: In production, consider archiving to a 'deletedUsers' collection instead
    await deleteDoc(userRef);
    return createResponse(true, { uid, deleted: true });
  } catch (error) {
    console.error('deleteUser error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Get analytics/KPIs - OPTIMIZED VERSION
 * @param {Object} params - { range: '7d' | '30d' | '90d' }
 * @returns {Promise<{ok, data: {totalUsers, activeToday, tasksLast7d, unresolvedAlerts}, error}>}
 */
export const getAnalytics = async ({ range = '7d' }) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Execute all queries in parallel for faster loading
    const [usersSnapshot, activeSnapshot] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(query(
        collection(db, 'users'),
        where('lastLogin', '>=', Timestamp.fromDate(oneDayAgo))
      ))
    ]);

    const totalUsers = usersSnapshot.size;
    const activeToday = activeSnapshot.size;

    // Get tasks from all users in parallel (limited to first 50 users for performance)
    const userDocs = usersSnapshot.docs.slice(0, 50); // Limit for performance
    const taskPromises = userDocs.map(userDoc =>
      getDocs(query(
        collection(db, 'users', userDoc.id, 'tasks'),
        where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
      ))
    );

    const taskSnapshots = await Promise.all(taskPromises);
    const tasksLast7d = taskSnapshots.reduce((sum, snapshot) => sum + snapshot.size, 0);

    // Unresolved alerts (stub)
    const unresolvedAlerts = 0;

    return createResponse(true, {
      totalUsers,
      activeToday,
      tasksLast7d,
      unresolvedAlerts,
      range,
      calculatedAt: now.toISOString()
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Get task categories from Firestore
 * @returns {Promise<{ok, data: [], error}>}
 */
export const getTaskCategories = async () => {
  try {
    const categoriesRef = collection(db, 'taskCategories');
    const q = query(categoriesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || null
    }));

    console.log(`âœ… Fetched ${categories.length} task categories`);
    return createResponse(true, categories);
  } catch (error) {
    console.error('getTaskCategories error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Create a new task category
 * @param {Object} categoryData - { name, color, icon }
 * @returns {Promise<{ok, data, error}>}
 */
export const createTaskCategory = async (categoryData) => {
  try {
    const categoriesRef = collection(db, 'taskCategories');
    const newCategory = {
      ...categoryData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(categoriesRef, newCategory);
    console.log(`âœ… Created task category: ${categoryData.name}`);

    return createResponse(true, { id: docRef.id, ...categoryData });
  } catch (error) {
    console.error('createTaskCategory error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Update a task category
 * @param {string} categoryId - Category ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{ok, data, error}>}
 */
export const updateTaskCategory = async (categoryId, updates) => {
  try {
    const categoryRef = doc(db, 'taskCategories', categoryId);
    await updateDoc(categoryRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    console.log(`âœ… Updated task category: ${categoryId}`);
    return createResponse(true, { id: categoryId, ...updates });
  } catch (error) {
    console.error('updateTaskCategory error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Delete a task category
 * @param {string} categoryId - Category ID
 * @returns {Promise<{ok, data, error}>}
 */
export const deleteTaskCategory = async (categoryId) => {
  try {
    const categoryRef = doc(db, 'taskCategories', categoryId);
    await deleteDoc(categoryRef);

    console.log(`âœ… Deleted task category: ${categoryId}`);
    return createResponse(true, { id: categoryId });
  } catch (error) {
    console.error('deleteTaskCategory error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Get detailed analytics stats for reports - OPTIMIZED VERSION
 * @param {Object} params - { range: '7d' | '30d' | '90d' }
 * @returns {Promise<{ok, data, error}>}
 */
export const getDetailedAnalytics = async ({ range = '7d' }) => {
  try {
    const now = new Date();
    const daysAgo = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;

    // Limit to first 30 users for performance
    const userDocs = usersSnapshot.docs.slice(0, 30);

    // Run all user queries in parallel for much faster loading
    const userDataPromises = userDocs.map(async (userDoc) => {
      const [tasksSnapshot, moodSnapshot] = await Promise.all([
        getDocs(query(
          collection(db, 'users', userDoc.id, 'tasks'),
          where('createdAt', '>=', Timestamp.fromDate(startDate))
        )),
        getDocs(query(
          collection(db, 'users', userDoc.id, 'moodEntries'),
          where('timestamp', '>=', Timestamp.fromDate(startDate))
        ))
      ]);

      const tasks = tasksSnapshot.docs.map(d => d.data());
      const moods = moodSnapshot.docs.map(d => d.data());

      return {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.completed).length,
        totalMoods: moods.length,
        positiveMoods: moods.filter(m => m.mood >= 6).length,
        hasActivity: moods.length > 0 || tasks.length > 0
      };
    });

    const userDataResults = await Promise.all(userDataPromises);

    // Aggregate results
    const aggregated = userDataResults.reduce(
      (acc, curr) => ({
        totalTasks: acc.totalTasks + curr.totalTasks,
        tasksCompleted: acc.tasksCompleted + curr.completedTasks,
        totalMoods: acc.totalMoods + curr.totalMoods,
        positiveMoods: acc.positiveMoods + curr.positiveMoods,
        activeUsers: acc.activeUsers + (curr.hasActivity ? 1 : 0)
      }),
      { totalTasks: 0, tasksCompleted: 0, totalMoods: 0, positiveMoods: 0, activeUsers: 0 }
    );

    const positiveMoodPercentage = aggregated.totalMoods > 0
      ? Math.round((aggregated.positiveMoods / aggregated.totalMoods) * 100)
      : 0;

    const engagementRate = totalUsers > 0
      ? Math.round((aggregated.activeUsers / totalUsers) * 100)
      : 0;

    // Calculate percentage changes (mock for now - would need historical data)
    const userChange = '+12%';
    const taskChange = aggregated.totalTasks > 0 ? '+8%' : '0%';
    const moodChange = positiveMoodPercentage > 50 ? '+5%' : '-2%';
    const engagementChange = engagementRate > 50 ? '+3%' : '-1%';

    return createResponse(true, {
      totalUsers,
      tasksCompleted: aggregated.tasksCompleted,
      totalTasks: aggregated.totalTasks,
      positiveMoodPercentage,
      totalMoods: aggregated.totalMoods,
      engagementRate,
      changes: {
        users: userChange,
        tasks: taskChange,
        moods: moodChange,
        engagement: engagementChange
      },
      range,
      calculatedAt: now.toISOString()
    });
  } catch (error) {
    console.error('getDetailedAnalytics error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Generate CSV report
 * @param {Object} params - { type: 'users' | 'tasks' | 'moods' | 'engagement', from: Date, to: Date, range: string }
 * @returns {Promise<{ok, data: {csvData, recordCount}, error}>}
 */
export const generateReport = async (params) => {
  try {
    const { type, from, to } = params;
    let csvData = '';
    let recordCount = 0;

    console.log(`ðŸ“Š Generating ${type} report from ${from} to ${to}`);

    if (type === 'users') {
      // Generate user report
      const usersSnapshot = await getDocs(collection(db, 'users'));
      csvData = 'User ID,Name,Email,Role,Created At,Last Login,Active\n';

      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        csvData += `${doc.id},${data.displayName || 'N/A'},${data.email},${data.role || 'user'},${data.createdAt?.toDate?.().toISOString() || 'N/A'},${data.lastLogin?.toDate?.().toISOString() || 'Never'},${data.isActive !== false ? 'Yes' : 'No'}\n`;
        recordCount++;
      });
    } else if (type === 'tasks') {
      // Generate task report
      csvData = 'Task ID,Title,Category,Energy Level,Difficulty,Completed,Created At\n';
      const tasksSnapshot = await getDocs(collection(db, 'tasks'));

      tasksSnapshot.docs.forEach(doc => {
        const data = doc.data();
        csvData += `${doc.id},${data.title},${data.category || 'N/A'},${data.energyLevel},${data.difficultyLevel || 'N/A'},${data.completed ? 'Yes' : 'No'},${data.createdAt?.toDate?.().toISOString() || 'N/A'}\n`;
        recordCount++;
      });
    } else if (type === 'moods') {
      // Generate mood report
      csvData = 'User ID,Mood Value,Mood Label,Category,Description,Timestamp\n';
      const usersSnapshot = await getDocs(collection(db, 'users'));

      for (const userDoc of usersSnapshot.docs) {
        const moodQuery = query(
          collection(db, 'users', userDoc.id, 'moodEntries'),
          where('timestamp', '>=', Timestamp.fromDate(from)),
          where('timestamp', '<=', Timestamp.fromDate(to)),
          orderBy('timestamp', 'desc')
        );
        const moodSnapshot = await getDocs(moodQuery);

        moodSnapshot.docs.forEach(doc => {
          const data = doc.data();
          csvData += `${userDoc.id},${data.mood},${data.moodLabel || 'N/A'},${data.moodCategory || 'N/A'},"${data.description || ''}",${data.timestamp?.toDate?.().toISOString() || 'N/A'}\n`;
          recordCount++;
        });
      }
    } else if (type === 'engagement') {
      // Generate engagement report
      csvData = 'User ID,Name,Email,Mood Entries,Tasks Created,Check-ins,Last Active\n';
      const usersSnapshot = await getDocs(collection(db, 'users'));

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();

        const moodCount = (await getDocs(collection(db, 'users', userDoc.id, 'moodEntries'))).size;
        const taskCount = (await getDocs(collection(db, 'users', userDoc.id, 'tasks'))).size;
        const checkInCount = (await getDocs(collection(db, 'users', userDoc.id, 'checkIns'))).size;

        csvData += `${userDoc.id},${userData.displayName || 'N/A'},${userData.email},${moodCount},${taskCount},${checkInCount},${userData.lastLogin?.toDate?.().toISOString() || 'Never'}\n`;
        recordCount++;
      }
    }

    console.log(`âœ… Generated ${type} report with ${recordCount} records`);

    return createResponse(true, { csvData, recordCount, type });
  } catch (error) {
    console.error('generateReport error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Get system logs from Firestore
 * @param {Object} params - { type: 'error'|'info'|'warn', from: Date, to: Date, q: string }
 * @returns {Promise<{ok, data: [], error}>}
 */
export const getLogs = async ({ type = null, from = null, to = null, q = '' }) => {
  try {
    const logsRef = collection(db, 'systemLogs');
    let constraints = [orderBy('timestamp', 'desc'), limit(100)];

    // Filter by type if specified
    if (type) {
      constraints.unshift(where('type', '==', type));
    }

    // Filter by date range if specified
    if (from) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(from)));
    }
    if (to) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(to)));
    }

    const q_query = query(logsRef, ...constraints);
    const snapshot = await getDocs(q_query);

    let logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || null
    }));

    // Client-side search filter
    if (q) {
      const searchLower = q.toLowerCase();
      logs = logs.filter(log =>
        log.message?.toLowerCase().includes(searchLower) ||
        log.source?.toLowerCase().includes(searchLower)
      );
    }

    console.log(`âœ… Fetched ${logs.length} system logs`);
    return createResponse(true, logs);
  } catch (error) {
    console.error('getLogs error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Create a system log entry
 * @param {Object} logData - { type: 'error'|'info'|'warn', message: string, source: string, userId?: string }
 * @returns {Promise<{ok, data, error}>}
 */
export const createLog = async (logData) => {
  try {
    const logsRef = collection(db, 'systemLogs');
    const newLog = {
      ...logData,
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(logsRef, newLog);
    console.log(`âœ… Created ${logData.type} log: ${logData.message}`);

    return createResponse(true, { id: docRef.id, ...logData });
  } catch (error) {
    console.error('createLog error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Get all documentation files from Firestore
 * @returns {Promise<{ok, data: [], error}>}
 */
export const getDocuments = async () => {
  try {
    const docsRef = collection(db, 'documentation');
    const q = query(docsRef, orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);

    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate?.() || null
    }));

    console.log(`âœ… Fetched ${documents.length} documents`);
    return createResponse(true, documents);
  } catch (error) {
    console.error('getDocuments error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Upload documentation metadata to Firestore
 * Note: For simplicity, this stores metadata only. Full implementation would upload to Firebase Storage
 * @param {Object} file - File metadata { name, size, type }
 * @returns {Promise<{ok, data, error}>}
 */
export const uploadDocumentation = async (file) => {
  try {
    const docsRef = collection(db, 'documentation');
    const newDoc = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/pdf',
      uploadedAt: serverTimestamp(),
      uploadedBy: 'Admin',
      icon: 'ðŸ“„'
    };

    const docRef = await addDoc(docsRef, newDoc);
    console.log(`âœ… Created document metadata: ${file.name}`);

    return createResponse(true, { id: docRef.id, ...newDoc });
  } catch (error) {
    console.error('uploadDocumentation error:', error);
    return createResponse(false, null, error.message);
  }
};

/**
 * Delete a documentation file
 * @param {string} docId - Document ID
 * @returns {Promise<{ok, data, error}>}
 */
export const deleteDocumentation = async (docId) => {
  try {
    const docRef = doc(db, 'documentation', docId);
    await deleteDoc(docRef);

    console.log(`âœ… Deleted document: ${docId}`);
    return createResponse(true, { id: docId });
  } catch (error) {
    console.error('deleteDocumentation error:', error);
    return createResponse(false, null, error.message);
  }
};
