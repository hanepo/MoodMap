import { collection, addDoc, query, orderBy, limit, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

export const MoodService = {
  // Log a new mood entry
  logMood: async (userId, moodData) => {
    if (!userId) throw new Error('No user ID provided');
    
    try {
      console.log(`Logging mood: ${moodData.mood}/10 for user ${userId}`);
      
      const moodEntry = {
        mood: parseInt(moodData.mood),
        moodLabel: moodData.moodLabel,
        moodCategory: moodData.moodCategory, // low/medium/high
        rawInput: moodData.rawInput || null,  // Store original text
        description: moodData.description || '',
        timestamp: new Date(),
        date: new Date().toISOString().split('T')[0]
      };
      
      const moodEntriesRef = collection(db, 'users', userId, 'moodEntries');
      const docRef = await addDoc(moodEntriesRef, moodEntry);
      
      // Update user's total mood entries count
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        totalMoodEntries: increment(1),
        lastLogin: new Date() // Update last login time
      });

      console.log('Mood logged successfully with ID:', docRef.id);
      return { id: docRef.id, ...moodEntry };
    } catch (error) {
      console.error('Error logging mood:', error);
      throw error;
    }
  },

  // Get recent mood entries (default: last 10)
  getRecentMoods: async (userId, limitCount = 10) => {
    if (!userId) return [];
    
    try {
      console.log(`📊 Fetching last ${limitCount} moods for user ${userId}`);
      
      const moodEntriesRef = collection(db, 'users', userId, 'moodEntries');
      const q = query(moodEntriesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      
      const querySnapshot = await getDocs(q);
      const moods = [];
      
      querySnapshot.forEach((doc) => {
        moods.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Retrieved ${moods.length} mood entries`);
      return moods;
    } catch (error) {
      console.error('❌ Error fetching moods:', error);
      return [];
    }
  },

  // Get today's mood entry
  getTodayMood: async (userId) => {
    if (!userId) return null;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log(`🗓️ Checking for today's mood (${today}) for user ${userId}`);
      
      const moodEntriesRef = collection(db, 'users', userId, 'moodEntries');
      const q = query(moodEntriesRef, orderBy('timestamp', 'desc'), limit(20));
      
      const querySnapshot = await getDocs(q);
      let todayMood = null;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date === today) {
          todayMood = { id: doc.id, ...data };
        }
      });

      if (todayMood) {
        console.log(`✅ Found today's mood: ${todayMood.mood}/10`);
      } else {
        console.log('ℹ️ No mood logged today');
      }
      
      return todayMood;
    } catch (error) {
      console.error('❌ Error fetching today\'s mood:', error);
      return null;
    }
  },

  // Get mood summary for Mood History card (e.g., recent moods with labels)
  getMoodSummary: async (userId, limitCount = 2) => {
    if (!userId) return [];
    
    try {
      console.log(`📋 Fetching mood summary for ${limitCount} entries for user ${userId}`);
      
      const moodEntriesRef = collection(db, 'users', userId, 'moodEntries');
      const q = query(moodEntriesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      
      const querySnapshot = await getDocs(q);
      const summary = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        summary.push({
          id: doc.id,
          moodLabel: data.mood >= 7 ? 'Happy' : data.mood <= 3 ? 'Sad' : 'Neutral',
          mood: data.mood,
          date: data.date
        });
      });

      console.log(`✅ Retrieved ${summary.length} mood summary entries`);
      return summary;
    } catch (error) {
      console.error('❌ Error fetching mood summary:', error);
      return [];
    }
  },

  // Calculate mood statistics
  getMoodStats: async (userId) => {
    if (!userId) return { average: 0, total: 0, trend: 'neutral' };
    
    try {
      console.log(`📈 Calculating mood statistics for user ${userId}`);
      
      const moods = await MoodService.getRecentMoods(userId, 30); // Last 30 entries
      
      if (moods.length === 0) {
        return { average: 0, total: 0, trend: 'neutral' };
      }

      const average = moods.reduce((sum, mood) => sum + mood.mood, 0) / moods.length;
      const recent5 = moods.slice(0, 5);
      const previous5 = moods.slice(5, 10);
      
      let trend = 'neutral';
      if (recent5.length >= 3 && previous5.length >= 3) {
        const recentAvg = recent5.reduce((sum, mood) => sum + mood.mood, 0) / recent5.length;
        const previousAvg = previous5.reduce((sum, mood) => sum + mood.mood, 0) / previous5.length;
        
        if (recentAvg > previousAvg + 0.5) trend = 'improving';
        else if (recentAvg < previousAvg - 0.5) trend = 'declining';
      }

      const stats = {
        average: Math.round(average * 10) / 10,
        total: moods.length,
        trend
      };

      console.log('✅ Mood stats calculated:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error calculating mood stats:', error);
      return { average: 0, total: 0, trend: 'neutral' };
    }
  },
};

export default MoodService;