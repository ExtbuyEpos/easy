import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getMessaging, Messaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { getAnalytics, Analytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

let app: FirebaseApp | undefined;
let db: Firestore | null = null;
let auth: Auth | null = null;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

// Use the provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCL8ue8SMmLdDVaj-dofxm_nYmJznaV4yI",
  authDomain: "extbuy-flutter-ai.firebaseapp.com",
  projectId: "extbuy-flutter-ai",
  storageBucket: "extbuy-flutter-ai.firebasestorage.app",
  messagingSenderId: "856022079884",
  appId: "1:856022079884:web:bfb08ce547b42a50f31ea9"
};

const initFirebase = async () => {
  try {
    const savedConfigStr = localStorage.getItem('easyPOS_firebaseConfig');
    const finalConfig = savedConfigStr ? JSON.parse(savedConfigStr) : firebaseConfig;

    if (!getApps().length) {
      app = initializeApp(finalConfig);
    } else {
      app = getApp();
    }

    if (app) {
      db = getFirestore(app);
      auth = getAuth(app);
      
      const msgSupported = await isMessagingSupported();
      if (msgSupported) {
        messaging = getMessaging(app);
      }

      const analyticsSupported = await isAnalyticsSupported();
      if (analyticsSupported) {
        analytics = getAnalytics(app);
      }
    }
  } catch (e) {
    console.warn("Firebase initialization skipped or failed. Operating in LocalStorage mode.", e);
    app = undefined;
    db = null;
    auth = null;
    messaging = null;
    analytics = null;
  }
};

// Immediate invocation
initFirebase();

export { db, app, auth, messaging, analytics };

export const saveFirebaseConfig = (configStr: string) => {
  try {
    JSON.parse(configStr);
    localStorage.setItem('easyPOS_firebaseConfig', configStr);
    // Re-initialize after config update
    initFirebase();
    return true;
  } catch (e) {
    return false;
  }
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem('easyPOS_firebaseConfig');
  db = null;
  auth = null;
  messaging = null;
  analytics = null;
};