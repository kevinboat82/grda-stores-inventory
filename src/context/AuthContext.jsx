import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { auth, adminAuth } from '../firebase';
import { getDocument, setDocument, updateDocument, deleteDocument } from '../utils/firestoreRest';

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
        const idToken = await user.getIdToken();
        await setDocument(`users/${user.uid}`, { ...userProfile, ...updates }, idToken);
        setUserProfile(prev => ({ ...prev, ...updates }));
    }, [user, userProfile]);

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
            mustChangePassword: true,
            createdAt: new Date().toISOString()
        };

        // Use the admin's token to write the new user's profile via REST API
        const idToken = await user.getIdToken();
        await setDocument(`users/${newUid}`, newUserProfile, idToken);
        await signOut(adminAuth);

        return { uid: newUid, ...newUserProfile };
    }, [user, userProfile]);

    const updateUserRole = useCallback(async (uid, newRole) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        const idToken = await user.getIdToken();
        await updateDocument(`users/${uid}`, { role: newRole }, idToken);
    }, [user, userProfile]);

    const toggleUserStatus = useCallback(async (uid, currentIsActive) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        const idToken = await user.getIdToken();
        await updateDocument(`users/${uid}`, { isActive: !currentIsActive }, idToken);
    }, [user, userProfile]);

    const deleteUser = useCallback(async (uid) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        const idToken = await user.getIdToken();
        await deleteDocument(`users/${uid}`, idToken);
    }, [user, userProfile]);

    const changePassword = useCallback(async (newPassword) => {
        if (!user) throw new Error('Not authenticated');
        // Update Firebase Auth password
        await updatePassword(user, newPassword);
        // Clear the mustChangePassword flag in Firestore
        const idToken = await user.getIdToken(true);
        await updateDocument(`users/${user.uid}`, { mustChangePassword: false }, idToken);
        setUserProfile(prev => ({ ...prev, mustChangePassword: false }));
    }, [user]);

    const needsProfileSetup = userProfile
        && userProfile.role !== 'audit_unit'
        && (!userProfile.name || !userProfile.position);

    const mustChangePassword = userProfile?.mustChangePassword === true;

    const value = {
        user: user === undefined ? null : user,
        userProfile,
        userRole: userProfile?.role || null,
        loading,
        needsProfileSetup,
        mustChangePassword,
        login,
        logout,
        updateProfile,
        changePassword,
        adminCreateUser,
        updateUserRole,
        toggleUserStatus,
        deleteUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
