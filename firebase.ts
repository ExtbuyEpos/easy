
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getMessaging, Messaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { getAnalytics, Analytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCL8ue8SMmLdDVaj-dofxm_nYmJznaV4yI",
  authDomain: "extbuy-flutter-ai.firebaseapp.com",
  projectId: "extbuy-flutter-ai",
  storageBucket: "extbuy-flutter-ai.firebasestorage.app",
  messagingSenderId: "856022079884",
  appId: "1:856022079884:web:bfb08ce547b42a50f31ea9"
};

// Singleton storage
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

try {
  // 1. Initialize core App
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // 2. Initialize core services immediately to trigger internal component registration
  auth = getAuth(app);
  db = getFirestore(app);

  // 3. Setup optional services and persistence in background
  const setupOptional = async () => {
    try {
      if (await isMessagingSupported()) messaging = getMessaging(app);
      if (await isAnalyticsSupported()) analytics = getAnalytics(app);
      
      // Attempt to enable offline persistence for better POS performance
      await enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firebase: Persistence failed due to multiple tabs.");
        } else if (err.code === 'unimplemented') {
          console.warn("Firebase: Persistence not supported by browser.");
        }
      });
    } catch (e) {
      console.warn("Firebase: Optional services skipped.", e);
    }
  };
  
  setupOptional();
} catch (error) {
  console.error("Firebase: Initialization sequence failed critical check.", error);
}

// Ensure exports are available
export { db, app, auth, messaging, analytics };

export const saveFirebaseConfig = (configStr: string) => {
  try {
    localStorage.setItem('easyPOS_firebaseConfig', configStr);
    window.location.reload();
    return true;
  } catch (e) {
    return false;
  }
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem('easyPOS_firebaseConfig');
  window.location.reload();
};
