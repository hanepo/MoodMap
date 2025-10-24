import { collection, addDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Helper function to calculate streak from sorted check-in dates
const calculateStreak = (sortedDates) => {
  if (sortedDates.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if user checked in today or yesterday (to maintain streak)
  const mostRecentDate = new Date(sortedDates[0]);
  mostRecentDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today - mostRecentDate) / (1000 * 60 * 60 * 24));

  // If last check-in was more than 1 day ago, streak is broken
  if (daysDiff > 1) return 0;

  // Count consecutive days
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i]);
    currentDate.setHours(0, 0, 0, 0);

    if (i === 0) {
      streak = 1;
    } else {
      const prevDate = new Date(sortedDates[i - 1]);
      prevDate.setHours(0, 0, 0, 0);

      const diff = Math.floor((prevDate - currentDate) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        streak++;
      } else {
        break; // Streak broken
      }
    }
  }

  return streak;
};

export const CheckInService = {
  // Record a daily check-in
  recordCheckIn: async (userId) => {
    if (!userId) throw new Error('No user ID provided');
    
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log(`Recording check-in for ${today}`);
      
      // Check if already checked in today
      const checkInsRef = collection(db, 'users', userId, 'checkIns');
      const q = query(checkInsRef, where('date', '==', today));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log('Already checked in today');
        return { alreadyCheckedIn: true };
      }
      
      // Get streak count
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const yesterdayQuery = query(checkInsRef, where('date', '==', yesterday));
      const yesterdaySnapshot = await getDocs(yesterdayQuery);
      
      let streakCount = 1;
      if (!yesterdaySnapshot.empty) {
        const yesterdayData = yesterdaySnapshot.docs[0].data();
        streakCount = (yesterdayData.streakCount || 0) + 1;
      }
      
      // Create check-in
      const checkIn = {
        date: today,
        timestamp: new Date(),
        streakCount
      };
      
      await addDoc(checkInsRef, checkIn);
      
      console.log('Check-in recorded successfully');
      return { success: true, streakCount };
    } catch (error) {
      console.error('Error recording check-in:', error);
      throw error;
    }
  },
  
  // Get check-in status for the week - now returns all check-ins with dates
  getWeekCheckIns: async (userId) => {
    if (!userId) return { checkInsByDay: {}, checkInDates: [], currentStreak: 0 };

    try {
        const checkInsRef = collection(db, 'users', userId, 'checkIns');
        const querySnapshot = await getDocs(checkInsRef);

        const checkInsByDay = {};
        const checkInDates = [];
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0); // Start of Sunday

        // Get all check-in dates
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          checkInDates.push(data.date);
        });

        // Sort dates in descending order (most recent first)
        checkInDates.sort((a, b) => new Date(b) - new Date(a));

        // Mark which days of the current week have check-ins
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.date) return; // Skip if no date field

          // Parse date string as local date to avoid timezone issues
          const dateParts = data.date.split('-');
          if (dateParts.length !== 3) return; // Skip if invalid format

          const [year, month, day] = dateParts.map(Number);
          const checkInDate = new Date(year, month - 1, day);
          checkInDate.setHours(0, 0, 0, 0);

          // Check if this check-in is within the current week
          if (checkInDate >= startOfWeek && checkInDate <= today) {
              const dayIndex = checkInDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
              checkInsByDay[dayIndex] = true;
          }
        });

        // Calculate current streak
        const currentStreak = calculateStreak(checkInDates);

        console.log('Week check-ins:', checkInsByDay);
        console.log('All check-in dates:', checkInDates);
        console.log('Current streak:', currentStreak);

        return { checkInsByDay, checkInDates, currentStreak };
    } catch (error) {
        console.error('Error fetching check-ins:', error);
        return { checkInsByDay: {}, checkInDates: [], currentStreak: 0 };
    }
  },

  // Get all check-ins for calendar display
    getAllCheckIns: async (userId) => {
    if (!userId) return [];
    
    try {
        const checkInsRef = collection(db, 'users', userId, 'checkIns');
        const querySnapshot = await getDocs(checkInsRef);
        
        const checkIns = [];
        querySnapshot.forEach((doc) => {
        checkIns.push({
            id: doc.id,
            ...doc.data()
        });
        });
        
        console.log(`Retrieved ${checkIns.length} check-ins`);
        return checkIns;
    } catch (error) {
        console.error('Error fetching all check-ins:', error);
        return [];
    }
    },
};

export default CheckInService;