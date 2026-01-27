
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

// Use the provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCL8ue8SMmLdDVaj-dofxm_nYmJznaV4yI",
  authDomain: "extbuy-flutter-ai.firebaseapp.com",
  projectId: "extbuy-flutter-ai",
  storageBucket: "extbuy-flutter-ai.firebasestorage.app",
  messagingSenderId: "856022079884",
  appId: "1:856022079884:web:bfb08ce547b42a50f31ea9"
};

const savedConfigStr = localStorage.getItem('easyPOS_firebaseConfig');
const finalConfig = savedConfigStr ? JSON.parse(savedConfigStr) : firebaseConfig;

try {
  app = initializeApp(finalConfig);
  db = getFirestore(app);

  // Enable offline persistence for a seamless POS experience
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a a time.
      console.warn('Firebase offline persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn('Firebase offline persistence not supported');
    }
  });
} catch (e) {
  console.error("Failed to initialize Firebase:", e);
}

export { db, app };

export const saveFirebaseConfig = (configStr: string) => {
  try {
    // Validate JSON
    JSON.parse(configStr);
    localStorage.setItem('easyPOS_firebaseConfig', configStr);
    return true;
  } catch (e) {
    return false;
  }
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem('easyPOS_firebaseConfig');
};
