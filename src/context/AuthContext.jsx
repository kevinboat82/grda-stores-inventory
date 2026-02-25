import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, adminAuth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helper: fetch user profile with retry logic for network resilience
const fetchUserProfile = async (uid, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            return userDoc;
        } catch (error) {
            console.warn(`[Auth] Profile fetch attempt ${attempt}/${maxRetries} failed:`, error.message);
            if (attempt === maxRetries) throw error;
            // Wait before retrying (500ms, 1000ms, 1500ms)
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(undefined); // undefined = not yet checked
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch profile BEFORE updating any state
                let profile = null;
                try {
                    const userDoc = await fetchUserProfile(firebaseUser.uid);
                    if (userDoc.exists()) {
                        profile = userDoc.data();

                        // Check if account is deactivated
                        if (profile.isActive === false) {
                            console.warn('[Auth] Account is deactivated:', firebaseUser.uid);
                            await signOut(auth);
                            setUser(null);
                            setUserProfile(null);
                            setLoading(false);
                            return; // Stop here
                        }

                        console.log('[Auth] User profile loaded:', profile.email, 'Role:', profile.role);
                    } else {
                        console.warn('[Auth] No user profile found for UID:', firebaseUser.uid);
                        profile = {
                            name: '',
                            role: 'none',
                            email: firebaseUser.email,
                            isActive: true, // default to true if missing
                        };
                    }
                } catch (error) {
                    console.error('[Auth] Error fetching user profile after retries:', error);
                    profile = {
                        name: '',
                        role: 'none',
                        email: firebaseUser.email,
                        isActive: true,
                    };
                }
                // Update all state together
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
        // Refresh local profile
        setUserProfile(prev => ({ ...prev, ...updates }));
    }, [user]);

    // Admin functions for User Management
    const adminCreateUser = useCallback(async (email, password, role, position, name) => {
        if (userProfile?.role !== 'admin') throw new Error('Unauthorized');

        // 1. Create the user in the secondary adminApp Firebase auth instance
        // This prevents the current admin user from being signed out.
        const userCredential = await createUserWithEmailAndPassword(adminAuth, email, password);
        const newUid = userCredential.user.uid;

        // 2. Create the Firestore profile
        const newUserProfile = {
            email,
            role,
            position: position || '',
            name: name || '',
            isActive: true,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', newUid), newUserProfile);

        // 3. Promptly sign out of the secondary app so it stays clean
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


    // Whether the user still needs to complete profile setup
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
