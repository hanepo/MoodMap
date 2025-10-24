import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fetches recommended tasks and self-care activities based on mood.
 * @param {string} moodCategory - The user's mood category ('low', 'medium', 'high').
 * @returns {Promise<Array>} A promise that resolves to an array of tasks.
 */
export const RecommendationService = {
  getRecommendations: async (moodCategory) => {
    if (!moodCategory) {
      console.warn('❌ No mood category provided for recommendations.');
      return [];
    }

    console.log('========== RECOMMENDATION SERVICE DEBUG ==========');
    console.log('🔎 Searching for tasks with energyLevel:', moodCategory);

    // 1. Prepare queries based on the data structure
    // We will query two different collections and merge them
    const taskQuery = query(
      collection(db, 'tasks'),
      where('energyLevel', '==', moodCategory)
    );

    const selfCareQuery = query(
      collection(db, 'selfcare'),
      where('moodMatch', 'array-contains', moodCategory)
    );

    try {
      // 2. Execute queries in parallel
      const [taskSnapshot, selfCareSnapshot] = await Promise.all([
        getDocs(taskQuery),
        getDocs(selfCareQuery)
      ]);

      console.log('📦 Tasks found from "tasks" collection:', taskSnapshot.size);
      console.log('📦 Tasks found from "selfcare" collection:', selfCareSnapshot.size);

      let recommendations = [];

      // 3. Process results from 'tasks' collection
      taskSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - Task: "${data.title}" (energyLevel: ${data.energyLevel}, difficultyLevel: ${data.difficultyLevel})`);
        recommendations.push({
          id: doc.id,
          name: data.title, // 'name' from 'tasks' collection
          description: data.description,
          level: data.difficultyLevel || 'Medium', // Map difficultyLevel
          energyLevel: data.energyLevel, // Add energyLevel to the recommendation
          category: data.category || 'General',
          isSelfCare: false
        });
      });

      // 4. Process results from 'selfcare' collection
      selfCareSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`  - SelfCare: "${data.title}" (moodMatch: ${data.moodMatch})`);
        recommendations.push({
          id: doc.id,
          name: data.title, // 'title' from 'selfcare' collection
          description: data.description,
          level: 'Easy', // Self-care is generally low-stress
          energyLevel: moodCategory, // Use the requested mood category
          category: data.category || 'Self-Care',
          isSelfCare: true
        });
      });

      console.log(`✅ Total recommendations found: ${recommendations.length}`);
      console.log('==================================================');
      return recommendations;

    } catch (error) {
      console.error("Error fetching recommendations: ", error);
      throw new Error('Failed to fetch recommendations.');
    }
  }
};

export default RecommendationService;