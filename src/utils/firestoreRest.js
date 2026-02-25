/**
 * Firestore REST API helper.
 * Bypasses the Firestore SDK's WebSocket/long-polling connection issues
 * on Vercel deployments by using direct HTTP calls.
 */

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Convert Firestore REST field values to plain JS values.
 */
const parseFieldValue = (fieldValue) => {
    if ('stringValue' in fieldValue) return fieldValue.stringValue;
    if ('integerValue' in fieldValue) return Number(fieldValue.integerValue);
    if ('doubleValue' in fieldValue) return fieldValue.doubleValue;
    if ('booleanValue' in fieldValue) return fieldValue.booleanValue;
    if ('timestampValue' in fieldValue) return fieldValue.timestampValue;
    if ('nullValue' in fieldValue) return null;
    if ('arrayValue' in fieldValue) {
        return (fieldValue.arrayValue.values || []).map(parseFieldValue);
    }
    if ('mapValue' in fieldValue) {
        return parseFields(fieldValue.mapValue.fields || {});
    }
    return null;
};

/**
 * Convert Firestore REST fields object to a plain JS object.
 */
const parseFields = (fields) => {
    const result = {};
    for (const [key, value] of Object.entries(fields)) {
        result[key] = parseFieldValue(value);
    }
    return result;
};

/**
 * Convert a JS value to Firestore REST field value.
 */
const toFieldValue = (value) => {
    if (value === null || value === undefined) return { nullValue: null };
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return { integerValue: String(value) };
        return { doubleValue: value };
    }
    if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(toFieldValue) } };
    }
    if (typeof value === 'object') {
        const fields = {};
        for (const [k, v] of Object.entries(value)) {
            fields[k] = toFieldValue(v);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(value) };
};

/**
 * Get a single document by path (e.g., 'users/abc123')
 */
export const getDocument = async (path, idToken) => {
    const response = await fetch(`${BASE_URL}/${path}`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
        throw new Error(`Firestore REST error: ${response.status} ${response.statusText}`);
    }
    const doc = await response.json();
    const name = doc.name;
    const id = name.split('/').pop();
    return { id, ...parseFields(doc.fields || {}) };
};

/**
 * List all documents in a collection.
 */
export const listDocuments = async (collectionPath, idToken, orderBy = null) => {
    let url = `${BASE_URL}/${collectionPath}?pageSize=1000`;
    if (orderBy) {
        // Note: Firestore REST ordering requires composite indexes for complex queries
        // For basic ordering, we'll sort client-side
    }
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${idToken}` },
    });
    if (!response.ok) {
        throw new Error(`Firestore REST error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.documents) return [];
    return data.documents.map((doc) => {
        const name = doc.name;
        const id = name.split('/').pop();
        return { id, ...parseFields(doc.fields || {}) };
    });
};

/**
 * Create or overwrite a document.
 */
export const setDocument = async (path, data, idToken) => {
    const fields = {};
    for (const [key, value] of Object.entries(data)) {
        fields[key] = toFieldValue(value);
    }
    const response = await fetch(`${BASE_URL}/${path}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
    });
    if (!response.ok) {
        throw new Error(`Firestore REST error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
};

/**
 * Add a new document to a collection (auto-generated ID).
 */
export const addDocument = async (collectionPath, data, idToken) => {
    const fields = {};
    for (const [key, value] of Object.entries(data)) {
        fields[key] = toFieldValue(value);
    }
    const response = await fetch(`${BASE_URL}/${collectionPath}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
    });
    if (!response.ok) {
        throw new Error(`Firestore REST error: ${response.status} ${response.statusText}`);
    }
    const doc = await response.json();
    const id = doc.name.split('/').pop();
    return { id, ...data };
};

/**
 * Update specific fields on a document.
 */
export const updateDocument = async (path, data, idToken) => {
    const fields = {};
    const updateMask = [];
    for (const [key, value] of Object.entries(data)) {
        fields[key] = toFieldValue(value);
        updateMask.push(key);
    }
    const maskParams = updateMask.map(f => `updateMask.fieldPaths=${f}`).join('&');
    const response = await fetch(`${BASE_URL}/${path}?${maskParams}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
    });
    if (!response.ok) {
        throw new Error(`Firestore REST error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
};

/**
 * Delete a document by path.
 */
export const deleteDocument = async (path, idToken) => {
    const response = await fetch(`${BASE_URL}/${path}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` },
    });
    if (!response.ok && response.status !== 404) {
        throw new Error(`Firestore REST error: ${response.status} ${response.statusText}`);
    }
};
