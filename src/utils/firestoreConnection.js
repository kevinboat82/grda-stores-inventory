import { disableNetwork, enableNetwork } from 'firebase/firestore';

/** Nudge Firestore to drop stale WebChannel sessions (common after sleep / VPN / long idle tabs). */
export async function refreshFirestoreConnection(db) {
    try {
        await disableNetwork(db);
        await enableNetwork(db);
    } catch (err) {
        console.warn('[Firestore] refresh connection failed:', err?.code || err?.message || err);
    }
}

export function onFirestoreTabVisible(db, callback) {
    if (typeof document === 'undefined') return () => {};

    const handleVisibility = () => {
        if (document.visibilityState !== 'visible') return;
        refreshFirestoreConnection(db).then(() => callback?.());
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
}
