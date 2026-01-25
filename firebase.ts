import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

const savedConfig = localStorage.getItem('easyPOS_firebaseConfig');

if (savedConfig) {
  try {
    const config = JSON.parse(savedConfig);
    app = initializeApp(config);
    db = getFirestore(app);

    // Enable offline persistence
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Firebase offline persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.log('Firebase offline persistence not supported');
        }
    });
  } catch (e) {
    console.error("Failed to initialize Firebase with saved config:", e);
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
