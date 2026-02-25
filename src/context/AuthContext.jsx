import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, adminAuth } from '../firebase';
import { getDocument, setDocument, updateDocument, deleteDocument } from '../utils/firestoreRest';
import { logActivity, ACTIONS } from '../utils/auditLog';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const FORCE_LOGOUT_CHECK_MS = 30 * 1000; // Check every 30 seconds

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(undefined);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const inactivityTimer = useRef(null);
    const forceLogoutTimer = useRef(null);

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

        if (user) {
            events.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
            resetInactivityTimer();
        }

        return () => {
            events.forEach(evt => window.removeEventListener(evt, handleActivity));
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        };
    }, [user, resetInactivityTimer]);

    // --- Force logout polling ---
    useEffect(() => {
        if (!user) {
            if (forceLogoutTimer.current) clearInterval(forceLogoutTimer.current);
            return;
        }

        const checkForceLogout = async () => {
            try {
                const idToken = await user.getIdToken();
                const profile = await getDocument(`users/${user.uid}`, idToken);
                if (profile?.forceLogout === true) {
                    console.warn('[Auth] Force logout triggered by admin');
                    // Clear the flag first
                    await updateDocument(`users/${user.uid}`, { forceLogout: false }, idToken);
                    await signOut(auth);
                }
            } catch (err) {
                // Silently fail — connection issues shouldn't break the check
            }
        };

        forceLogoutTimer.current = setInterval(checkForceLogout, FORCE_LOGOUT_CHECK_MS);

        return () => {
            if (forceLogoutTimer.current) clearInterval(forceLogoutTimer.current);
        };
    }, [user]);

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

                        // Track session — write lastLogin timestamp
                        await updateDocument(`users/${firebaseUser.uid}`, {
                            lastLogin: new Date().toISOString(),
                            isOnline: true,
                        }, idToken);

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
        const credential = await signInWithEmailAndPassword(auth, email, password);
        // Log login activity
        try {
            const idToken = await credential.user.getIdToken();
            await logActivity({
                action: ACTIONS.USER_LOGIN,
                details: `User logged in: ${email}`,
                userId: credential.user.uid,
                userName: email,
            }, idToken);
        } catch (e) { /* silent */ }
        return credential;
    }, []);

    const logout = useCallback(async () => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        if (forceLogoutTimer.current) clearInterval(forceLogoutTimer.current);

        // Mark offline and log logout
        if (user) {
            try {
                const idToken = await user.getIdToken();
                await updateDocument(`users/${user.uid}`, { isOnline: false }, idToken);
                await logActivity({
                    action: ACTIONS.USER_LOGOUT,
                    details: `User logged out: ${userProfile?.email || 'unknown'}`,
                    userId: user.uid,
                    userName: userProfile?.name || userProfile?.email || 'Unknown',
                }, idToken);
            } catch (e) { /* silent */ }
        }

        return signOut(auth);
    }, [user, userProfile]);

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
            isOnline: false,
            createdAt: new Date().toISOString()
        };

        const idToken = await user.getIdToken();
        await setDocument(`users/${newUid}`, newUserProfile, idToken);
        await signOut(adminAuth);

        // Audit log
        await logActivity({
            action: ACTIONS.USER_CREATED,
            details: `Created user: ${email} (${role})`,
            userId: user.uid,
            userName: userProfile?.name || userProfile?.email,
            targetId: newUid,
            targetType: 'user',
        }, idToken);

        return { uid: newUid, ...newUserProfile };
    }, [user, userProfile]);

    const updateUserRole = useCallback(async (uid, newRole) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        const idToken = await user.getIdToken();
        await updateDocument(`users/${uid}`, { role: newRole }, idToken);

        await logActivity({
            action: ACTIONS.USER_ROLE_CHANGED,
            details: `Changed role to "${newRole}" for user ${uid}`,
            userId: user.uid,
            userName: userProfile?.name || userProfile?.email,
            targetId: uid,
            targetType: 'user',
        }, idToken);
    }, [user, userProfile]);

    const toggleUserStatus = useCallback(async (uid, currentIsActive) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        const idToken = await user.getIdToken();
        const newStatus = !currentIsActive;
        await updateDocument(`users/${uid}`, { isActive: newStatus }, idToken);

        await logActivity({
            action: ACTIONS.USER_STATUS_CHANGED,
            details: `${newStatus ? 'Reactivated' : 'Deactivated'} user ${uid}`,
            userId: user.uid,
            userName: userProfile?.name || userProfile?.email,
            targetId: uid,
            targetType: 'user',
        }, idToken);
    }, [user, userProfile]);

    const deleteUser = useCallback(async (uid) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        const idToken = await user.getIdToken();
        await deleteDocument(`users/${uid}`, idToken);

        await logActivity({
            action: ACTIONS.USER_DELETED,
            details: `Deleted user ${uid}`,
            userId: user.uid,
            userName: userProfile?.name || userProfile?.email,
            targetId: uid,
            targetType: 'user',
        }, idToken);
    }, [user, userProfile]);

    const changePassword = useCallback(async (newPassword) => {
        if (!user) throw new Error('Not authenticated');
        await updatePassword(user, newPassword);
        const idToken = await user.getIdToken(true);
        await updateDocument(`users/${user.uid}`, { mustChangePassword: false }, idToken);
        setUserProfile(prev => ({ ...prev, mustChangePassword: false }));

        await logActivity({
            action: ACTIONS.PASSWORD_CHANGED,
            details: 'User changed their password',
            userId: user.uid,
            userName: userProfile?.name || userProfile?.email,
        }, idToken);
    }, [user, userProfile]);

    const adminResetPassword = useCallback(async (email) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        await sendPasswordResetEmail(auth, email);

        const idToken = await user.getIdToken();
        await logActivity({
            action: ACTIONS.PASSWORD_RESET,
            details: `Admin sent password reset email to ${email}`,
            userId: user.uid,
            userName: userProfile?.name || userProfile?.email,
            targetType: 'user',
        }, idToken);
    }, [user, userProfile]);

    const forceUserLogout = useCallback(async (uid) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        const idToken = await user.getIdToken();
        await updateDocument(`users/${uid}`, { forceLogout: true }, idToken);

        await logActivity({
            action: ACTIONS.USER_FORCE_LOGOUT,
            details: `Admin forced logout for user ${uid}`,
            userId: user.uid,
            userName: userProfile?.name || userProfile?.email,
            targetId: uid,
            targetType: 'user',
        }, idToken);
    }, [user, userProfile]);

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
        deleteUser,
        adminResetPassword,
        forceUserLogout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
