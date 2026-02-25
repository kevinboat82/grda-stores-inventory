import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Debug: verify config is loaded (remove after confirming)
console.log('[Firebase] Config check:', {
    apiKey: firebaseConfig.apiKey ? '✅ set' : '❌ MISSING',
    authDomain: firebaseConfig.authDomain ? '✅ set' : '❌ MISSING',
    projectId: firebaseConfig.projectId ? '✅ set' : '❌ MISSING',
    storageBucket: firebaseConfig.storageBucket ? '✅ set' : '❌ MISSING',
    messagingSenderId: firebaseConfig.messagingSenderId ? '✅ set' : '❌ MISSING',
    appId: firebaseConfig.appId ? '✅ set' : '❌ MISSING',
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Secondary app instance just for creating new users without logging out the admin
const adminApp = initializeApp(firebaseConfig, 'adminApp');
export const adminAuth = getAuth(adminApp);

export default app;
