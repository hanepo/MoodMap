// src/services/SupportService.js
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export const SupportService = {
  /**
   * Fetches all support resources (helplines, links, etc.).
   * @returns {Promise<Array>} A promise that resolves to an array of support resources.
   */
  getSupportResources: async () => {
    console.log('Fetching support resources...');
    
    try {
      const supportRef = collection(db, 'support');
      // Order by 'name' or another relevant field if needed
      const q = query(supportRef, orderBy('name', 'asc')); 
      
      const querySnapshot = await getDocs(q);
      const resources = [];
      
      querySnapshot.forEach((doc) => {
        resources.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ Retrieved ${resources.length} support resources`);
      return resources;
    } catch (error) {
      console.error('❌ Error fetching support resources:', error);
      throw new Error('Failed to fetch support resources.');
    }
  }
};

export default SupportService;