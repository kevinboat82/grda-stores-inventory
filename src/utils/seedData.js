import { collection, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase';

const SEED_CATEGORIES = [
    { id: 'C1', name: 'Office Supplies' },
    { id: 'C2', name: 'Hardware & Tools' },
    { id: 'C3', name: 'Electronics' },
    { id: 'C4', name: 'Safety Gear' },
];

const SEED_ITEMS = [
    { name: 'A4 Printer Paper (500 sheets)', sku: 'PPR-A4', category: 'Office Supplies', unit: 'Ream', stock: 45, reorderLevel: 50 },
    { name: 'Safety Helmets (Yellow)', sku: 'SAF-HLM-Y', category: 'Safety Gear', unit: 'Pcs', stock: 12, reorderLevel: 15 },
    { name: 'Heavy Duty Measuring Tape 5m', sku: 'TLS-TAP-5M', category: 'Hardware & Tools', unit: 'Pcs', stock: 8, reorderLevel: 10 },
    { name: 'Extension Cord 10m', sku: 'ELE-EXT-10M', category: 'Electronics', unit: 'Pcs', stock: 25, reorderLevel: 10 },
    { name: 'High-Visibility Vests', sku: 'SAF-VST-O', category: 'Safety Gear', unit: 'Pcs', stock: 100, reorderLevel: 50 },
    { name: 'Claw Hammer 16oz', sku: 'TLS-HAM-16', category: 'Hardware & Tools', unit: 'Pcs', stock: 5, reorderLevel: 10 },
];

const SEED_USERS = [
    { email: 'admin@grda.gov.gh', password: 'Admin@123', name: 'Jane Doe', role: 'admin' },
    { email: 'storekeeper@grda.gov.gh', password: 'Store@123', name: 'John Smith', role: 'storekeeper' },
    { email: 'audit@grda.gov.gh', password: 'Audit@123', name: 'Audit Unit', role: 'audit_unit' },
];

/**
 * Seeds Firestore collections if they are empty.
 * Also creates Firebase Auth users and their Firestore profile documents.
 */
export const seedFirestoreData = async () => {
    try {
        // Check if items already seeded
        const itemsSnapshot = await getDocs(collection(db, 'items'));
        if (itemsSnapshot.size === 0) {
            console.log('Seeding items...');
            for (const item of SEED_ITEMS) {
                await addDoc(collection(db, 'items'), item);
            }
            console.log(`Seeded ${SEED_ITEMS.length} items.`);
        }

        // Check if categories already seeded
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        if (categoriesSnapshot.size === 0) {
            console.log('Seeding categories...');
            for (const cat of SEED_CATEGORIES) {
                await setDoc(doc(db, 'categories', cat.id), { name: cat.name });
            }
            console.log(`Seeded ${SEED_CATEGORIES.length} categories.`);
        }

        console.log('Firestore seeding complete.');
    } catch (error) {
        console.error('Error seeding Firestore:', error);
    }
};

/**
 * Creates Firebase Auth user accounts and corresponding Firestore user profiles.
 * Call this separately (e.g. from browser console) since creating users
 * signs out the current user. Alternatively, create users manually in Firebase Console.
 */
export const createSeedUsers = async () => {
    for (const userData of SEED_USERS) {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                userData.email,
                userData.password
            );
            // Create user profile document in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                name: userData.name,
                email: userData.email,
                role: userData.role,
                createdAt: new Date().toISOString(),
            });
            console.log(`Created user: ${userData.email} (${userData.role})`);
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.log(`User ${userData.email} already exists, skipping...`);
            } else {
                console.error(`Error creating ${userData.email}:`, error);
            }
        }
    }
};

export default { seedFirestoreData, createSeedUsers, SEED_USERS };
