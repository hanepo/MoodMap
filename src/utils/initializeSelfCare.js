/**
 * Initialize Self-Care Database
 *
 * This script populates the Firestore database with default self-care activities
 * and helpline contacts. Run this ONCE to set up the initial data.
 *
 * Usage:
 * 1. Import this file in your AdminHome.js or any admin screen
 * 2. Call initializeSelfCareData() function from a button
 * 3. Only run it once to avoid duplicate data
 */

import SelfCareService from '../services/SelfCareService';
import { Alert } from 'react-native';

export const initializeSelfCareData = async () => {
  try {
    console.log('🚀 Starting Self-Care data initialization...');

    // Initialize activities
    await SelfCareService.initializeDefaultActivities();
    console.log('✅ Activities initialized');

    // Initialize helpline contacts
    await SelfCareService.initializeDefaultContacts();
    console.log('✅ Helpline contacts initialized');

    console.log('🎉 Self-Care data initialization complete!');
    Alert.alert(
      'Success',
      'Self-care activities and helpline contacts have been initialized successfully!'
    );

    return true;
  } catch (error) {
    console.error('❌ Error initializing self-care data:', error);
    Alert.alert(
      'Error',
      'Failed to initialize self-care data. Please check the console for details.'
    );
    return false;
  }
};

export default initializeSelfCareData;
