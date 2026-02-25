import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { listDocuments, addDocument as addDocRest, updateDocument, setDocument } from '../utils/firestoreRest';

// SDK imports as fallback for writes
import {
    collection, addDoc, doc, updateDoc, writeBatch, onSnapshot, query, orderBy
} from 'firebase/firestore';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [useRest, setUseRest] = useState(false);
    const { user, userProfile } = useAuth();

    // Try SDK first, fallback to REST API
    useEffect(() => {
        if (!user) {
            setItems([]);
            setCategories([]);
            setTransactions([]);
            setDataLoading(false);
            return;
        }

        let sdkTimeout;
        let unsubItems, unsubCategories, unsubTxns;
        let sdkWorked = false;

        // Set a timeout: if SDK doesn't deliver data within 5s, switch to REST
        sdkTimeout = setTimeout(async () => {
            if (!sdkWorked) {
                console.warn('[Store] SDK timed out, switching to REST API');
                setUseRest(true);
                // Clean up SDK listeners
                if (unsubItems) unsubItems();
                if (unsubCategories) unsubCategories();
                if (unsubTxns) unsubTxns();
                // Fetch via REST
                await fetchAllViaRest();
            }
        }, 5000);

        // Try SDK listeners
        try {
            unsubItems = onSnapshot(collection(db, 'items'), (snapshot) => {
                sdkWorked = true;
                clearTimeout(sdkTimeout);
                const itemsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setItems(itemsData);
            });

            unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
                const catData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setCategories(catData);
            });

            const txnQuery = query(collection(db, 'transactions'), orderBy('date', 'desc'));
            unsubTxns = onSnapshot(txnQuery, (snapshot) => {
                const txnData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setTransactions(txnData);
                setDataLoading(false);
            });
        } catch (error) {
            console.error('[Store] SDK listener error:', error);
            setUseRest(true);
            fetchAllViaRest();
        }

        return () => {
            clearTimeout(sdkTimeout);
            if (unsubItems) unsubItems();
            if (unsubCategories) unsubCategories();
            if (unsubTxns) unsubTxns();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchAllViaRest = useCallback(async () => {
        if (!user) return;
        try {
            setDataLoading(true);
            const idToken = await user.getIdToken();

            const [itemsData, catData, txnData] = await Promise.all([
                listDocuments('items', idToken),
                listDocuments('categories', idToken),
                listDocuments('transactions', idToken),
            ]);

            setItems(itemsData || []);
            setCategories(catData || []);
            // Sort transactions by date descending (client-side)
            const sortedTxns = (txnData || []).sort((a, b) =>
                (b.date || '').localeCompare(a.date || '')
            );
            setTransactions(sortedTxns);
            setDataLoading(false);
            console.log('[Store] Data loaded via REST API');
        } catch (error) {
            console.error('[Store] REST API fetch error:', error);
            setDataLoading(false);
        }
    }, [user]);

    const addItem = useCallback(async (newItem) => {
        const itemData = {
            ...newItem,
            stock: Number(newItem.stock) || 0,
            reorderLevel: Number(newItem.reorderLevel) || 0,
            createdAt: new Date().toISOString(),
        };

        if (useRest && user) {
            const idToken = await user.getIdToken();
            const result = await addDocRest('items', itemData, idToken);
            setItems(prev => [...prev, result]);
            return result;
        } else {
            await addDoc(collection(db, 'items'), itemData);
        }
    }, [useRest, user]);

    const addTransaction = useCallback(async (transactionData) => {
        const { itemId, type, quantity } = transactionData;
        const qty = Number(quantity);

        const item = items.find(i => i.id === itemId);
        if (!item) throw new Error("Item not found");

        const currentStock = Number(item.stock);

        if (type === 'OUT' && qty > currentStock) {
            throw new Error(`Cannot issue ${qty}. Only ${currentStock} available.`);
        }

        const newStock = type === 'IN' ? currentStock + qty : currentStock - qty;
        const txnRecord = {
            ...transactionData,
            quantity: qty,
            date: new Date().toISOString(),
            user: userProfile?.name || 'Unknown',
        };

        if (useRest && user) {
            const idToken = await user.getIdToken();
            await updateDocument(`items/${itemId}`, { stock: newStock }, idToken);
            const result = await addDocRest('transactions', txnRecord, idToken);
            // Update local state
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, stock: newStock } : i));
            setTransactions(prev => [result, ...prev]);
        } else {
            const batch = writeBatch(db);
            const itemRef = doc(db, 'items', itemId);
            batch.update(itemRef, { stock: newStock });
            const txnRef = doc(collection(db, 'transactions'));
            batch.set(txnRef, txnRecord);
            await batch.commit();
        }
    }, [items, userProfile, useRest, user]);

    const value = {
        items,
        categories,
        transactions,
        dataLoading,
        addItem,
        addTransaction,
        refreshData: fetchAllViaRest,
    };

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};
