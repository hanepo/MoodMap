// src/navigation/requireAdmin.js
// Admin access control guard
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Hook to check if current user is an admin
 * @returns {{ isAdmin: boolean, loading: boolean, user: object }}
 */
export const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Fetch user document from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser(userData);
          setIsAdmin(userData.role === 'admin');
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }

      setLoading(false);
    };

    checkAdminStatus();

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(() => {
      checkAdminStatus();
    });

    return () => unsubscribe();
  }, []);

  return { isAdmin, loading, user };
};

/**
 * Check if user has admin role (simple promise version)
 * @returns {Promise<boolean>}
 */
export const checkIsAdmin = async () => {
  const currentUser = auth.currentUser;

  if (!currentUser) return false;

  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    return userDoc.exists() && userDoc.data().role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};
