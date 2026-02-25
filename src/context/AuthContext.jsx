import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, adminAuth, db } from '../firebase';
import { getDocument } from '../utils/firestoreRest';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(undefined); // undefined = not yet checked
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                let profile = null;
                try {
                    // Get the user's ID token for REST API auth
                    const idToken = await firebaseUser.getIdToken();
                    const profileData = await getDocument(`users/${firebaseUser.uid}`, idToken);

                    if (profileData) {
                        profile = profileData;

                        // Check if account is deactivated
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
        return signOut(auth);
    }, []);

    const updateProfile = useCallback(async (updates) => {
        if (!user) throw new Error('Not authenticated');
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, updates, { merge: true });
        setUserProfile(prev => ({ ...prev, ...updates }));
    }, [user]);

    // Admin functions for User Management
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
