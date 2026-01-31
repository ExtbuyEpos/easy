
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

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

try {
  // Ensure app is initialized only once
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Initialize services IMMEDIATELY to register components in the Firebase internal container
  auth = getAuth(app);
  db = getFirestore(app);

  // Background setup for optional features to prevent blocking
  const initializeOptionalServices = async () => {
    try {
      if (await isMessagingSupported()) messaging = getMessaging(app);
      if (await isAnalyticsSupported()) analytics = getAnalytics(app);
      
      // Attempt to enable offline persistence for better POS performance
      await enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("Persistence failed: Multiple tabs open.");
        } else if (err.code === 'unimplemented') {
          console.warn("Persistence failed: Browser not supported.");
        }
      });
    } catch (e) {
      console.warn("Optional Firebase services failed to load", e);
    }
  };
  
  initializeOptionalServices();
} catch (error) {
  console.error("Firebase Critical Init Error:", error);
}

// @ts-ignore - Exporting even if potentially uninitialized to avoid broken imports elsewhere, 
// though try-block should ensure they exist for valid config.
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
