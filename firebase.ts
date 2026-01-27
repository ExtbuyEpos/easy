
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

let app: FirebaseApp;
let db: Firestore;

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
  // Ensure the app is initialized only once
  if (!getApps().length) {
    app = initializeApp(finalConfig);
  } else {
    app = getApp();
  }

  // Basic initialization to avoid registration issues in modular environments
  db = getFirestore(app);
  
} catch (e) {
  console.error("CRITICAL: Firebase/Firestore initialization failed:", e);
  // @ts-ignore - Exporting null db to let App.tsx fall back to LocalStorage
  db = null;
}

export { db, app };

export const saveFirebaseConfig = (configStr: string) => {
  try {
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
