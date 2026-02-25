import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Use initializeFirestore with long-polling fallback to avoid WebSocket blocking
export const db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
});
export const storage = getStorage(app);

// Secondary app instance just for creating new users without logging out the admin
const adminApp = initializeApp(firebaseConfig, 'adminApp');
export const adminAuth = getAuth(adminApp);

export default app;
