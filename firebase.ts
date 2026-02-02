
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

// Singleton storage
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

try {
  // 1. Initialize core App
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // 2. Initialize core services immediately
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

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

/**
 * Uploads a file to Firebase Storage and returns the public download URL.
 */
export const uploadImage = async (file: File, folder: string = 'uploads'): Promise<string> => {
  if (!storage) throw new Error("Firebase Storage not initialized");
  
  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const storageRef = ref(storage, `${folder}/${fileName}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

// Ensure exports are available
export { db, app, auth, storage, messaging, analytics };

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
