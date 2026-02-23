import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    getDocs,
    writeBatch,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { seedFirestoreData } from '../utils/seedData';

const StoreContext = createContext();

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }) => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const { userProfile } = useAuth();

    // Real-time Firestore listeners
    useEffect(() => {
        setDataLoading(true);

        // Listen to items collection
        const unsubItems = onSnapshot(collection(db, 'items'), (snapshot) => {
            const itemsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setItems(itemsData);
        });

        // Listen to categories collection
        const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
            const catData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCategories(catData);
        });

        // Listen to transactions collection (ordered by date descending)
        const txnQuery = query(collection(db, 'transactions'), orderBy('date', 'desc'));
        const unsubTxns = onSnapshot(txnQuery, (snapshot) => {
            const txnData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setTransactions(txnData);
            setDataLoading(false);
        });

        // Seed data if collections are empty (one-time)
        seedFirestoreData();

        return () => {
            unsubItems();
            unsubCategories();
            unsubTxns();
        };
    }, []);

    const addItem = async (newItem) => {
        try {
            await addDoc(collection(db, 'items'), {
                ...newItem,
                stock: Number(newItem.stock) || 0,
                reorderLevel: Number(newItem.reorderLevel) || 0,
                createdAt: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    };

    const addTransaction = async (transactionData) => {
        const { itemId, type, quantity } = transactionData;
        const qty = Number(quantity);

        // Find the item
        const item = items.find(i => i.id === itemId);
        if (!item) throw new Error("Item not found");

        const currentStock = Number(item.stock);

        if (type === 'OUT' && qty > currentStock) {
            throw new Error(`Cannot issue ${qty}. Only ${currentStock} available.`);
        }

        // Calculate new stock
        const newStock = type === 'IN' ? currentStock + qty : currentStock - qty;

        try {
            // Use batch write: update item stock + record transaction
            const batch = writeBatch(db);

            // Update item stock
            const itemRef = doc(db, 'items', itemId);
            batch.update(itemRef, { stock: newStock });

            // Add transaction record
            const txnRef = doc(collection(db, 'transactions'));
            batch.set(txnRef, {
                ...transactionData,
                quantity: qty,
                date: new Date().toISOString(),
                user: userProfile?.name || 'Unknown',
            });

            await batch.commit();
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    };

    const value = {
        items,
        categories,
        transactions,
        dataLoading,
        addItem,
        addTransaction,
    };

    return (
        <StoreContext.Provider value={value}>
            {children}
        </StoreContext.Provider>
    );
};
