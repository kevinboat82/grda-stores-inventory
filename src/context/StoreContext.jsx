import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { listDocuments, addDocument as addDocRest, updateDocument, deleteDocument } from '../utils/firestoreRest';
import { logActivity, ACTIONS } from '../utils/auditLog';

// SDK imports (used locally where SDK works)
import {
    collection, addDoc, doc, updateDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy
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
    const [useRest, setUseRest] = useState(isDeployed);
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

        if (useRest) {
            fetchAllViaRest();
            return;
        }

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
            await logActivity({
                action: ACTIONS.ITEM_CREATED,
                details: `Added item: ${newItem.name} (${newItem.sku})`,
                userId: user.uid,
                userName: userProfile?.name || userProfile?.email,
                targetId: result.id,
                targetType: 'item',
            }, idToken);
            return result;
        } else {
            await addDoc(collection(db, 'items'), itemData);
        }
    }, [useRest, user, userProfile]);

    const updateItem = useCallback(async (itemId, updates) => {
        if (useRest && user) {
            const idToken = await user.getIdToken();
            await updateDocument(`items/${itemId}`, updates, idToken);
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
            await logActivity({
                action: ACTIONS.ITEM_UPDATED,
                details: `Updated item: ${updates.name || itemId}`,
                userId: user.uid,
                userName: userProfile?.name || userProfile?.email,
                targetId: itemId,
                targetType: 'item',
            }, idToken);
        } else {
            const itemRef = doc(db, 'items', itemId);
            await updateDoc(itemRef, updates);
        }
    }, [useRest, user, userProfile]);

    const deleteItem = useCallback(async (itemId) => {
        const item = items.find(i => i.id === itemId);
        if (useRest && user) {
            const idToken = await user.getIdToken();
            await deleteDocument(`items/${itemId}`, idToken);
            setItems(prev => prev.filter(i => i.id !== itemId));
            await logActivity({
                action: ACTIONS.ITEM_DELETED,
                details: `Deleted item: ${item?.name || itemId}`,
                userId: user.uid,
                userName: userProfile?.name || userProfile?.email,
                targetId: itemId,
                targetType: 'item',
            }, idToken);
        } else {
            await deleteDoc(doc(db, 'items', itemId));
            setItems(prev => prev.filter(i => i.id !== itemId));
        }
    }, [items, useRest, user, userProfile]);

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
            await logActivity({
                action: type === 'IN' ? ACTIONS.STOCK_IN : ACTIONS.STOCK_OUT,
                details: `${type === 'IN' ? 'Received' : 'Issued'} ${qty} × ${item.name}`,
                userId: user.uid,
                userName: userProfile?.name || userProfile?.email,
                targetId: itemId,
                targetType: 'item',
            }, idToken);
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
        updateItem,
        deleteItem,
        addTransaction,
        refreshData: fetchAllViaRest,
    };

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};

