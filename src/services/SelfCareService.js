import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const SelfCareService = {
  // ============ ACTIVITIES MANAGEMENT ============

  // Get all self-care activities
  getAllActivities: async () => {
    try {
      console.log('📚 Fetching all self-care activities');
      const activitiesRef = collection(db, 'selfCareActivities');
      const q = query(activitiesRef, orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);

      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Retrieved ${activities.length} activities`);
      return activities;
    } catch (error) {
      console.error('❌ Error fetching activities:', error);
      return [];
    }
  },

  // Get activities by mood category
  getActivitiesByMood: async (moodCategory) => {
    try {
      console.log(`📚 Fetching activities for mood: ${moodCategory}`);
      const activitiesRef = collection(db, 'selfCareActivities');
      const q = query(
        activitiesRef,
        where('moodCategory', '==', moodCategory),
        orderBy('order', 'asc')
      );
      const querySnapshot = await getDocs(q);

      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Retrieved ${activities.length} activities for ${moodCategory} mood`);
      return activities;
    } catch (error) {
      console.error('❌ Error fetching activities by mood:', error);
      return [];
    }
  },

  // Create a new activity
  createActivity: async (activityData) => {
    try {
      console.log('➕ Creating new self-care activity');
      const activity = {
        title: activityData.title || 'Untitled Activity',
        description: activityData.description || '',
        emoji: activityData.emoji || '✨',
        moodCategory: activityData.moodCategory || 'general', // low, medium, high, general
        action: activityData.action || 'guide', // guide, link
        link: activityData.link || null,
        order: activityData.order || 0,
        isActive: activityData.isActive !== undefined ? activityData.isActive : true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const activitiesRef = collection(db, 'selfCareActivities');
      const docRef = await addDoc(activitiesRef, activity);

      console.log('✅ Activity created with ID:', docRef.id);
      return { id: docRef.id, ...activity };
    } catch (error) {
      console.error('❌ Error creating activity:', error);
      throw error;
    }
  },

  // Update an activity
  updateActivity: async (activityId, updates) => {
    try {
      console.log(`📝 Updating activity ${activityId}`);
      const activityRef = doc(db, 'selfCareActivities', activityId);
      await updateDoc(activityRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });

      console.log('✅ Activity updated successfully');
    } catch (error) {
      console.error('❌ Error updating activity:', error);
      throw error;
    }
  },

  // Delete an activity
  deleteActivity: async (activityId) => {
    try {
      console.log(`🗑️ Deleting activity ${activityId}`);
      const activityRef = doc(db, 'selfCareActivities', activityId);
      await deleteDoc(activityRef);

      console.log('✅ Activity deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting activity:', error);
      throw error;
    }
  },

  // ============ ACTIVITY COMPLETION TRACKING ============

  // Record activity completion
  recordCompletion: async (userId, activityId, activityTitle) => {
    try {
      console.log(`✅ Recording completion for user ${userId}`);
      const completion = {
        userId,
        activityId,
        activityTitle,
        completedAt: Timestamp.now(),
        date: new Date().toISOString().split('T')[0]
      };

      const completionsRef = collection(db, 'users', userId, 'selfCareCompletions');
      const docRef = await addDoc(completionsRef, completion);

      console.log('✅ Completion recorded with ID:', docRef.id);
      return { id: docRef.id, ...completion };
    } catch (error) {
      console.error('❌ Error recording completion:', error);
      throw error;
    }
  },

  // Get user's completion history
  getUserCompletions: async (userId, days = 30) => {
    try {
      console.log(`📊 Fetching completions for user ${userId} (last ${days} days)`);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const completionsRef = collection(db, 'users', userId, 'selfCareCompletions');
      const q = query(completionsRef, orderBy('completedAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const completions = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const completedAt = data.completedAt?.toDate?.() || new Date(data.completedAt);

        if (completedAt >= startDate) {
          completions.push({
            id: doc.id,
            ...data,
            completedAt
          });
        }
      });

      console.log(`✅ Retrieved ${completions.length} completions`);
      return completions;
    } catch (error) {
      console.error('❌ Error fetching completions:', error);
      return [];
    }
  },

  // Get completion count for today
  getTodayCompletionCount: async (userId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const completionsRef = collection(db, 'users', userId, 'selfCareCompletions');
      const q = query(completionsRef, where('date', '==', today));
      const querySnapshot = await getDocs(q);

      console.log(`📊 User completed ${querySnapshot.size} activities today`);
      return querySnapshot.size;
    } catch (error) {
      console.error('❌ Error fetching today\'s completions:', error);
      return 0;
    }
  },

  // ============ HELPLINE CONTACTS ============

  // Get all helpline contacts
  getHelplineContacts: async () => {
    try {
      console.log('📞 Fetching helpline contacts');
      const contactsRef = collection(db, 'helplineContacts');
      const q = query(contactsRef, orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);

      const contacts = [];
      querySnapshot.forEach((doc) => {
        contacts.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Retrieved ${contacts.length} helpline contacts`);
      return contacts;
    } catch (error) {
      console.error('❌ Error fetching helpline contacts:', error);
      return [];
    }
  },

  // Create a helpline contact
  createHelplineContact: async (contactData) => {
    try {
      console.log('➕ Creating new helpline contact');
      const contact = {
        name: contactData.name || 'Unnamed Contact',
        description: contactData.description || '',
        type: contactData.type || 'helpline', // helpline, whatsapp, website
        phone: contactData.phone || null,
        link: contactData.link || null,
        icon: contactData.icon || '📞',
        order: contactData.order || 0,
        isActive: contactData.isActive !== undefined ? contactData.isActive : true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const contactsRef = collection(db, 'helplineContacts');
      const docRef = await addDoc(contactsRef, contact);

      console.log('✅ Helpline contact created with ID:', docRef.id);
      return { id: docRef.id, ...contact };
    } catch (error) {
      console.error('❌ Error creating helpline contact:', error);
      throw error;
    }
  },

  // Update a helpline contact
  updateHelplineContact: async (contactId, updates) => {
    try {
      console.log(`📝 Updating helpline contact ${contactId}`);
      const contactRef = doc(db, 'helplineContacts', contactId);
      await updateDoc(contactRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });

      console.log('✅ Helpline contact updated successfully');
    } catch (error) {
      console.error('❌ Error updating helpline contact:', error);
      throw error;
    }
  },

  // Delete a helpline contact
  deleteHelplineContact: async (contactId) => {
    try {
      console.log(`🗑️ Deleting helpline contact ${contactId}`);
      const contactRef = doc(db, 'helplineContacts', contactId);
      await deleteDoc(contactRef);

      console.log('✅ Helpline contact deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting helpline contact:', error);
      throw error;
    }
  },

  // ============ INITIALIZATION (Call once to populate database) ============

  // Initialize default activities
  initializeDefaultActivities: async () => {
    try {
      console.log('🔧 Initializing default self-care activities...');

      const defaultActivities = [
        // LOW MOOD ACTIVITIES
        { title: '🧘 Mindfulness Meditation', description: 'Take 5 minutes to focus on your breathing. Inhale for 4, hold for 4, exhale for 4.', emoji: '🧘', moodCategory: 'low', action: 'guide', order: 1 },
        { title: '💭 Breathing Exercise', description: 'Try the 4-7-8 breathing technique to calm your mind and reduce anxiety.', emoji: '💭', moodCategory: 'low', action: 'guide', order: 2 },
        { title: '🎵 Calming Music', description: 'Listen to soothing music or nature sounds for 10-15 minutes.', emoji: '🎵', moodCategory: 'low', action: 'link', link: 'https://www.youtube.com/results?search_query=calming+meditation+music', order: 3 },
        { title: '📝 Journal Your Feelings', description: 'Write down what you\'re feeling. Sometimes expressing it helps process emotions.', emoji: '📝', moodCategory: 'low', action: 'guide', order: 4 },
        { title: '🚶 Short Walk', description: 'Step outside for fresh air. A 5-minute walk can improve your mood.', emoji: '🚶', moodCategory: 'low', action: 'guide', order: 5 },

        // MEDIUM MOOD ACTIVITIES
        { title: '☕ Take a Break', description: 'Pause for 10 minutes. Make your favorite drink and enjoy the moment.', emoji: '☕', moodCategory: 'medium', action: 'guide', order: 1 },
        { title: '📖 Light Reading', description: 'Read a chapter of a book or an inspiring article to shift your focus.', emoji: '📖', moodCategory: 'medium', action: 'guide', order: 2 },
        { title: '🎧 Uplifting Podcast', description: 'Listen to a motivational podcast or audiobook to boost your energy.', emoji: '🎧', moodCategory: 'medium', action: 'guide', order: 3 },
        { title: '🧘 Gentle Stretching', description: 'Do some light stretches or yoga poses to release tension.', emoji: '🧘', moodCategory: 'medium', action: 'link', link: 'https://www.youtube.com/results?search_query=gentle+yoga+stretching', order: 4 },
        { title: '💌 Gratitude List', description: 'Write down 3 things you\'re grateful for today.', emoji: '💌', moodCategory: 'medium', action: 'guide', order: 5 },

        // HIGH MOOD ACTIVITIES
        { title: '🎨 Creative Activity', description: 'Channel your energy into drawing, painting, or crafting something.', emoji: '🎨', moodCategory: 'high', action: 'guide', order: 1 },
        { title: '💃 Dance It Out', description: 'Put on your favorite music and dance! Let your body move freely.', emoji: '💃', moodCategory: 'high', action: 'guide', order: 2 },
        { title: '📞 Connect with Friends', description: 'Call or text someone you care about. Share your positive energy!', emoji: '📞', moodCategory: 'high', action: 'guide', order: 3 },
        { title: '🏃 Physical Exercise', description: 'Go for a jog, do some cardio, or try a workout routine.', emoji: '🏃', moodCategory: 'high', action: 'link', link: 'https://www.youtube.com/results?search_query=home+workout+routine', order: 4 },
        { title: '🌱 Plan Something Fun', description: 'Set a goal or plan an activity you\'ve been wanting to do.', emoji: '🌱', moodCategory: 'high', action: 'guide', order: 5 },

        // GENERAL TIPS
        { title: '💧 Stay Hydrated', description: 'Drink a glass of water. Hydration affects your mood and energy.', emoji: '💧', moodCategory: 'general', action: 'guide', order: 1 },
        { title: '🌞 Get Sunlight', description: 'Spend 10 minutes outside. Sunlight boosts vitamin D and mood.', emoji: '🌞', moodCategory: 'general', action: 'guide', order: 2 },
        { title: '😴 Rest Well', description: 'Ensure you get 7-8 hours of sleep. Rest is crucial for mental health.', emoji: '😴', moodCategory: 'general', action: 'guide', order: 3 }
      ];

      for (const activity of defaultActivities) {
        await SelfCareService.createActivity(activity);
      }

      console.log('✅ Default activities initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing activities:', error);
      throw error;
    }
  },

  // Initialize default helpline contacts
  initializeDefaultContacts: async () => {
    try {
      console.log('🔧 Initializing default helpline contacts...');

      const defaultContacts = [
        { name: 'Mental Health Hotline', description: '24/7 emotional support', type: 'helpline', phone: '+60177692748', icon: '📞', order: 1 },
        { name: 'WhatsApp Support', description: 'Chat with a counselor', type: 'whatsapp', phone: '+60177692748', icon: '💬', order: 2 },
        { name: 'Mental Health Resources', description: 'Articles and professional help', type: 'website', link: 'https://www.mindline.sg', icon: '🌐', order: 3 }
      ];

      for (const contact of defaultContacts) {
        await SelfCareService.createHelplineContact(contact);
      }

      console.log('✅ Default helpline contacts initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing contacts:', error);
      throw error;
    }
  }
};

export default SelfCareService;
