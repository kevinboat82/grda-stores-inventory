import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    collection,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    query,
    orderBy,
    serverTimestamp,
    deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from './AuthContext';

const RecordsContext = createContext();

export const useRecords = () => useContext(RecordsContext);

export const LETTER_CLASSIFICATIONS = [
    'Chief Executive',
    'Finance',
    'Human Resources',
    'Operations',
    'Engineering',
    'Legal',
    'Procurement',
    'General',
    'Confidential',
];

export const LETTER_STATUSES = [
    'Pending',
    'Acknowledged',
    'Forwarded',
    'Filed',
    'Responded',
];

export const RecordsProvider = ({ children }) => {
    const [letters, setLetters] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const { userProfile } = useAuth();

    // Real-time Firestore listener for letters
    useEffect(() => {
        const q = query(collection(db, 'letters'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const letterData = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.toDate?.() || new Date(),
            }));
            setLetters(letterData);
            setDataLoading(false);
        }, (error) => {
            console.error('[Records] Firestore listener error:', error);
            setDataLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Upload file to Firebase Storage
    const uploadFile = useCallback(async (file) => {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageRef = ref(storage, `letters/${timestamp}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return { downloadURL, storagePath: snapshot.ref.fullPath };
    }, []);

    // Add a new letter
    const addLetter = useCallback(async (letterData, file) => {
        let fileUrl = '';
        let fileName = '';
        let storagePath = '';

        if (file) {
            const upload = await uploadFile(file);
            fileUrl = upload.downloadURL;
            fileName = file.name;
            storagePath = upload.storagePath;
        }

        const docData = {
            type: letterData.type, // 'incoming' | 'outgoing'
            subject: letterData.subject,
            sender: letterData.sender || '',
            recipient: letterData.recipient || '',
            referenceNo: letterData.referenceNo || '',
            letterDate: letterData.letterDate || '',
            classification: letterData.classification,
            status: 'Pending',
            fileUrl,
            fileName,
            storagePath,
            notes: letterData.notes || '',
            createdBy: userProfile?.name || 'Unknown',
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'letters'), docData);
        return docRef.id;
    }, [userProfile, uploadFile]);

    // Update letter status or details
    const updateLetter = useCallback(async (letterId, updates) => {
        const letterRef = doc(db, 'letters', letterId);
        await updateDoc(letterRef, updates);
    }, []);

    // Delete a letter
    const deleteLetter = useCallback(async (letterId) => {
        await deleteDoc(doc(db, 'letters', letterId));
    }, []);

    const value = {
        letters,
        dataLoading,
        addLetter,
        updateLetter,
        deleteLetter,
        LETTER_CLASSIFICATIONS,
        LETTER_STATUSES,
    };

    return (
        <RecordsContext.Provider value={value}>
            {children}
        </RecordsContext.Provider>
    );
};
