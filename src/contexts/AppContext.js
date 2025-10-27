import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Import getDoc
import { auth, db } from '../config/firebase';
import MoodService from '../services/MoodService';
import TaskService from '../services/TaskService';
import SupportService from '../services/SupportService';

const AppContext = createContext();

const initialState = {
  user: null,
  loading: true,
  moods: [],
  moodSummary: [],
  tasks: [],
  taskSummary: [],
  supportResources: [],
  preferences: { // <-- Add preferences object to initial state
    notificationsEnabled: true, // Default value
    reminderTime: '09:00'
  },
  error: null
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_MOODS':
      return { ...state, moods: action.payload };
    case 'ADD_MOOD':
      const newMoods = [action.payload, ...state.moods].sort((a, b) => (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0));
      return { ...state, moods: newMoods };
    case 'SET_MOOD_SUMMARY':
      return { ...state, moodSummary: action.payload };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'ADD_TASK':
      const newTasks = [action.payload, ...state.tasks].sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      return { ...state, tasks: newTasks };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id
            ? { ...task, ...action.payload.updates }
            : task
        )
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload)
      };
    case 'SET_TASK_SUMMARY':
      return { ...state, taskSummary: action.payload };
    case 'SET_SUPPORT_RESOURCES':
      return { ...state, supportResources: action.payload };
    case 'SET_PREFERENCES': // <-- Add reducer case for preferences
      return { ...state, preferences: { ...state.preferences, ...action.payload } };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET_STATE': // <-- Add a case to reset state on logout
        return { ...initialState, loading: false }; // Keep loading false
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    console.log('Setting up auth listener');

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? user.uid : 'No user');
      
      if (user) {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          console.log('Fetching user data for:', user.uid);
          
          // Fetch user doc to get preferences
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};
          
          // Set user with full user data including role
          const fullUserData = {
            ...user,
            role: userData.role || 'user',
            displayName: userData.displayName || user.displayName,
            email: userData.email || user.email,
            phoneNumber: userData.phoneNumber || user.phoneNumber,
            preferences: userData.preferences || {}
          };

          dispatch({ type: 'SET_USER', payload: fullUserData });
          if (userData.preferences) {
              dispatch({ type: 'SET_PREFERENCES', payload: userData.preferences });
          }

          // Fetch other data in parallel
          const [moods, tasks, supportResources] = await Promise.all([
            MoodService.getRecentMoods(user.uid, 30),
            TaskService.getTasks(user.uid),
            SupportService.getSupportResources()
          ]);
          
          // Calculate summaries after fetching main data
          const moodSummary = moods.slice(0, 2);
          const taskSummary = tasks.slice(0, 2).map(t => ({id: t.id, title: t.title, completed: t.completed}));

          console.log('Data fetched and processed');

          dispatch({ type: 'SET_MOODS', payload: moods || [] });
          dispatch({ type: 'SET_TASKS', payload: tasks || [] });
          dispatch({ type: 'SET_MOOD_SUMMARY', payload: moodSummary });
          dispatch({ type: 'SET_TASK_SUMMARY', payload: taskSummary });
          dispatch({ type: 'SET_SUPPORT_RESOURCES', payload: supportResources || [] });
          dispatch({ type: 'CLEAR_ERROR' });
        } catch (error) {
          console.error('Error loading user data:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('No user, resetting state');
        // On logout, reset the entire state to initial values
        dispatch({ type: 'RESET_STATE' });
      }
    });

    return unsubscribe; // Cleanup listener on component unmount
  }, []);

  const value = {
    state,
    dispatch
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};