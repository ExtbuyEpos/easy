
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

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
  // Check if an app is already initialized to avoid "duplicate app" errors
  if (!getApps().length) {
    app = initializeApp(finalConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize Firestore with modernized persistent cache settings
  // This replaces enableIndexedDbPersistence for a more robust multi-tab experience
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  console.error("CRITICAL: Failed to initialize Firebase or Firestore:", e);
  // Fallback to basic firestore if initialization fails (e.g. storage quota exceeded)
  try {
    if (app) db = getFirestore(app);
  } catch (fallbackError) {
    console.error("CRITICAL: Firebase fallback initialization also failed:", fallbackError);
  }
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
