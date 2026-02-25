import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, adminAuth, db } from '../firebase';
import { getDocument } from '../utils/firestoreRest';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(undefined);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const inactivityTimer = useRef(null);

    // --- Inactivity auto-logout ---
    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(async () => {
            console.warn('[Auth] Inactivity timeout — logging out');
            await signOut(auth);
        }, INACTIVITY_TIMEOUT_MS);
    }, []);

    useEffect(() => {
        const events = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'scroll'];
        const handleActivity = () => resetInactivityTimer();

        // Only set up listeners if user is logged in
        if (user) {
            events.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
            resetInactivityTimer(); // Start the timer
        }

        return () => {
            events.forEach(evt => window.removeEventListener(evt, handleActivity));
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        };
    }, [user, resetInactivityTimer]);

    // --- Auth state listener ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                let profile = null;
                try {
                    const idToken = await firebaseUser.getIdToken();
                    const profileData = await getDocument(`users/${firebaseUser.uid}`, idToken);

                    if (profileData) {
                        profile = profileData;

                        if (profile.isActive === false) {
                            console.warn('[Auth] Account is deactivated:', firebaseUser.uid);
                            await signOut(auth);
                            setUser(null);
                            setUserProfile(null);
                            setLoading(false);
                            return;
                        }

                        console.log('[Auth] User profile loaded:', profile.email, 'Role:', profile.role);
                    } else {
                        console.warn('[Auth] No user profile found for UID:', firebaseUser.uid);
                        profile = {
                            name: '',
                            role: 'none',
                            email: firebaseUser.email,
                            isActive: true,
                        };
                    }
                } catch (error) {
                    console.error('[Auth] Error fetching user profile:', error);
                    profile = {
                        name: '',
                        role: 'none',
                        email: firebaseUser.email,
                        isActive: true,
                    };
                }
                setUserProfile(profile);
                setUser(firebaseUser);
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    }, []);

    const logout = useCallback(async () => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        return signOut(auth);
    }, []);

    const updateProfile = useCallback(async (updates) => {
        if (!user) throw new Error('Not authenticated');
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, updates, { merge: true });
        setUserProfile(prev => ({ ...prev, ...updates }));
    }, [user]);

    const adminCreateUser = useCallback(async (email, password, role, position, name) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');

        const userCredential = await createUserWithEmailAndPassword(adminAuth, email, password);
        const newUid = userCredential.user.uid;

        const newUserProfile = {
            email,
            role,
            position: position || '',
            name: name || '',
            isActive: true,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', newUid), newUserProfile);
        await signOut(adminAuth);

        return { uid: newUid, ...newUserProfile };
    }, [userProfile]);

    const updateUserRole = useCallback(async (uid, newRole) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { role: newRole });
    }, [userProfile]);

    const toggleUserStatus = useCallback(async (uid, currentIsActive) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { isActive: !currentIsActive });
    }, [userProfile]);

    const needsProfileSetup = userProfile
        && userProfile.role !== 'audit_unit'
        && (!userProfile.name || !userProfile.position);

    const value = {
        user: user === undefined ? null : user,
        userProfile,
        userRole: userProfile?.role || null,
        loading,
        needsProfileSetup,
        login,
        logout,
        updateProfile,
        adminCreateUser,
        updateUserRole,
        toggleUserStatus
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
