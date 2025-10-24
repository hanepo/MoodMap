// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3wp4upMAoz3hMMSIP2bHCwgGyuapaDCI",
  authDomain: "moodmap-mobile.firebaseapp.com",
  projectId: "moodmap-mobile",
  storageBucket: "moodmap-mobile.firebasestorage.app",
  messagingSenderId: "951366682380",
  appId: "1:951366682380:web:b6b2da2f3d384c0f1f6b29",
  measurementId: "G-XL6L9XJ12E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;