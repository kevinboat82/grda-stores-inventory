import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail, deleteUser as deleteAuthUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, adminAuth, db } from '../firebase';
import { logActivity, ACTIONS } from '../utils/auditLog';
import { normalizeUserRoleFromFirestore, pickRoleField } from '../utils/userRole';
import { buildUserProfileForFirestore, firebaseAuthErrorMessage } from '../utils/userProfile';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

/** Load `users/{uid}` via Firestore SDK (same auth channel as rules evaluation; avoids REST 403 issues). */
async function fetchUserProfileFromFirestore(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
}

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
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists && snap.data()?.forceLogout === true) {
                    console.warn('[Auth] Force logout triggered by admin');
                    await updateDoc(doc(db, 'users', user.uid), { forceLogout: false });
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
                    const profileData = await fetchUserProfileFromFirestore(firebaseUser.uid);

                    if (profileData) {
                        const normalizedRole = normalizeUserRoleFromFirestore(pickRoleField(profileData));
                        profile = { ...profileData, role: normalizedRole };

                        if (profile.isActive === false) {
                            console.warn('[Auth] Account is deactivated:', firebaseUser.uid);
                            await signOut(auth);
                            setUser(null);
                            setUserProfile(null);
                            setLoading(false);
                            return;
                        }

                        // Track session — write lastLogin timestamp
                        await updateDoc(doc(db, 'users', firebaseUser.uid), {
                            lastLogin: new Date().toISOString(),
                            isOnline: true,
                        });

                        console.log('[Auth] User profile loaded:', profile.email, 'Role:', profile.role, 'Firestore role field:', profileData.role);

                        // Keep Firestore role canonical so security rules recognize admins.
                        if (normalizedRole === 'admin' && profileData.role !== 'admin') {
                            try {
                                await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
                                profile.role = 'admin';
                            } catch (roleFixErr) {
                                console.warn('[Auth] Could not normalize admin role in Firestore:', roleFixErr);
                            }
                        }
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
                await updateDoc(doc(db, 'users', user.uid), { isOnline: false });
                const idToken = await user.getIdToken();
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
        await setDoc(doc(db, 'users', user.uid), { ...userProfile, ...updates }, { merge: true });
        setUserProfile(prev => {
            const merged = { ...prev, ...updates };
            if (updates.role !== undefined) {
                merged.role = normalizeUserRoleFromFirestore(updates.role);
            }
            return merged;
        });
    }, [user, userProfile]);

    const adminCreateUser = useCallback(async (email, password, role, position, name) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');

        const normalizedEmail = email.trim().toLowerCase();
        const newUserProfile = buildUserProfileForFirestore({
            email: normalizedEmail,
            role,
            position,
            name,
            createdByUid: user.uid,
        });

        let createdAuthUser = null;
        try {
            const userCredential = await createUserWithEmailAndPassword(adminAuth, normalizedEmail, password);
            createdAuthUser = userCredential.user;
            // Sign out secondary app before writing profile so Firestore uses the admin session.
            await signOut(adminAuth);
            await user.getIdToken(true);
            await setDoc(doc(db, 'users', createdAuthUser.uid), newUserProfile);
        } catch (err) {
            if (createdAuthUser) {
                try {
                    await deleteAuthUser(createdAuthUser);
                } catch (cleanupErr) {
                    console.error('[Auth] Could not roll back Auth user after profile write failure:', cleanupErr);
                }
            }
            try {
                await signOut(adminAuth);
            } catch (_) { /* ignore */ }
            const message = firebaseAuthErrorMessage(err);
            throw new Error(message);
        }

        try {
            await signOut(adminAuth);
        } catch (_) { /* ignore */ }

        const idToken = await user.getIdToken();
        try {
            await logActivity({
                action: ACTIONS.USER_CREATED,
                details: `Created user: ${normalizedEmail} (${newUserProfile.role})`,
                userId: user.uid,
                userName: userProfile?.name || userProfile?.email,
                targetId: createdAuthUser.uid,
                targetType: 'user',
            }, idToken);
        } catch (_) {
            /* audit_log is best-effort */
        }

        return { uid: createdAuthUser.uid, ...newUserProfile };
    }, [user, userProfile]);

    const adminUpdateUser = useCallback(async (uid, updates) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        if (!uid) throw new Error('Missing user id');

        const snap = await getDoc(doc(db, 'users', uid));
        const existing = snap.exists() ? snap.data() : {};

        const merged = buildUserProfileForFirestore({
            email: updates.email ?? existing.email,
            role: updates.role ?? existing.role,
            position: updates.position ?? existing.position,
            name: updates.name ?? existing.name,
            createdByUid: existing.createdBy || user.uid,
            existing,
        });

        if (updates.mustChangePassword !== undefined) {
            merged.mustChangePassword = updates.mustChangePassword;
        }
        if (updates.isActive !== undefined) {
            merged.isActive = updates.isActive;
        }

        await setDoc(doc(db, 'users', uid), merged, { merge: true });

        const idToken = await user.getIdToken();
        try {
            await logActivity({
                action: ACTIONS.USER_ROLE_CHANGED,
                details: `Updated account for ${merged.email} (role: ${merged.role})`,
                userId: user.uid,
                userName: userProfile?.name || userProfile?.email,
                targetId: uid,
                targetType: 'user',
            }, idToken);
        } catch (_) { /* best-effort */ }

        return { uid, ...merged };
    }, [user, userProfile]);

    const updateUserRole = useCallback(async (uid, newRole) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');
        await updateDoc(doc(db, 'users', uid), { role: newRole });

        const idToken = await user.getIdToken();
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
        await updateDoc(doc(db, 'users', uid), { isActive: newStatus });

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
        await deleteDoc(doc(db, 'users', uid));

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
        await updateDoc(doc(db, 'users', user.uid), { mustChangePassword: false });
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
        await updateDoc(doc(db, 'users', uid), { forceLogout: true });

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
        && userProfile.role !== 'none'
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
        adminUpdateUser,
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
