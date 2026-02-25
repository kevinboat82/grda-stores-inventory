import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { listDocuments, addDocument as addDocRest, updateDocument } from '../utils/firestoreRest';

// SDK imports (used locally where SDK works)
import {
    collection, addDoc, doc, updateDoc, writeBatch, onSnapshot, query, orderBy
} from 'firebase/firestore';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

// Detect if we're on a deployed (non-localhost) environment
const isDeployed = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');

export const StoreProvider = ({ children }) => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [useRest, setUseRest] = useState(isDeployed); // Go straight to REST on Vercel
    const { user, userProfile } = useAuth();

    // Fetch data via REST API
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

    // Data loading effect
    useEffect(() => {
        if (!user) {
            setItems([]);
            setCategories([]);
            setTransactions([]);
            setDataLoading(false);
            return;
        }

        // On deployed environments, skip SDK entirely and use REST
        if (useRest) {
            fetchAllViaRest();
            return;
        }

        // On localhost, use SDK real-time listeners
        const unsubItems = onSnapshot(collection(db, 'items'), (snapshot) => {
            const itemsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setItems(itemsData);
        });

        const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
            const catData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCategories(catData);
        });

        const txnQuery = query(collection(db, 'transactions'), orderBy('date', 'desc'));
        const unsubTxns = onSnapshot(txnQuery, (snapshot) => {
            const txnData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setTransactions(txnData);
            setDataLoading(false);
        });

        return () => {
            unsubItems();
            unsubCategories();
            unsubTxns();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, useRest]);

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
