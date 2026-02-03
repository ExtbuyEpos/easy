
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getMessaging, Messaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { getAnalytics, Analytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBfVt6vqEK4Ett-suudk-AWVgfF0CgZFfQ",
  authDomain: "easyposlogin.firebaseapp.com",
  projectId: "easyposlogin",
  storageBucket: "easyposlogin.firebasestorage.app",
  messagingSenderId: "767239854610",
  appId: "1:767239854610:web:c0d1d9b6984a3f33b4d6cb",
  measurementId: "G-59VY3VC09L"
};

// Singleton instances
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

// Initialize Core Services
// We do not wrap this in try-catch to ensure the app fails loudly if config/versions are wrong
app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
auth = getAuth(app);
db = getFirestore(app);

// Initialize Optional Services & Persistence
const setupOptional = async () => {
  try {
    if (await isMessagingSupported()) {
      messaging = getMessaging(app);
    }
    
    if (await isAnalyticsSupported()) {
      analytics = getAnalytics(app);
    }
    
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

export const googleProvider = new GoogleAuthProvider();

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
