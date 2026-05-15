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
    deleteDoc,
    arrayUnion,
    Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { onFirestoreTabVisible, refreshFirestoreConnection } from '../utils/firestoreConnection';
import { useAuth } from './AuthContext';
import {
    ROUTING_DEPARTMENTS,
    CORRESPONDENCE_TYPES,
    DEPARTMENT_ROLE_IDS,
    departmentKeyFromRole,
    departmentLabelFromId,
} from '../constants/departmentWorkflow';

const RecordsContext = createContext();

export const useRecords = () => useContext(RecordsContext);

export { ROUTING_DEPARTMENTS, CORRESPONDENCE_TYPES };

/** Correspondence routing */
export const WORKFLOW_STEPS = {
    WITH_RECORDS: 'with_records',
    WITH_CEO_OFFICE: 'with_ceo_office',
    WITH_DEPARTMENT: 'with_department',
    WITH_CEO: 'with_ceo',
    ROUTED: 'routed',
};

export const WORKFLOW_STEP_LABELS = {
    [WORKFLOW_STEPS.WITH_RECORDS]: 'With Records Office',
    [WORKFLOW_STEPS.WITH_CEO_OFFICE]: "With CEO's PA / Secretary",
    [WORKFLOW_STEPS.WITH_DEPARTMENT]: 'With department (HOD review)',
    [WORKFLOW_STEPS.WITH_CEO]: 'With CEO',
    [WORKFLOW_STEPS.ROUTED]: 'Routed by CEO',
};

export const WORKFLOW_ACTIONS = {
    LETTER_REGISTERED: 'letter_registered',
    FORWARDED_TO_CEO_OFFICE: 'forwarded_to_ceo_office',
    FORWARDED_TO_CEO: 'forwarded_to_ceo',
    SENT_TO_DEPARTMENT: 'sent_to_department',
    DEPARTMENT_FORWARDED_TO_DEPARTMENT: 'department_forwarded_to_department',
    DEPARTMENT_FORWARDED_TO_CEO: 'department_forwarded_to_ceo',
    CEO_MINUTED_AND_ROUTED: 'ceo_minuted_and_routed',
    MEMO_RAISED: 'memo_raised',
    HOD_MINUTED_AND_SIGNED: 'hod_minuted_and_signed',
    CEO_MEMO_DISPATCHED: 'ceo_memo_dispatched',
};

const MEMO_CREATOR_ROLES = ['admin', 'records_unit', 'ceo_office', 'ceo', ...DEPARTMENT_ROLE_IDS];

function normalizeSignatures(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((s) => ({
        ...s,
        signedAt: s.signedAt?.toDate?.() ? s.signedAt.toDate() : s.signedAt,
    }));
}

function buildWorkflowEntry(user, userProfile, action, detail, extras = {}) {
    return {
        id: crypto.randomUUID(),
        at: Timestamp.now(),
        actorUid: user?.uid || '',
        actorName: userProfile?.name || 'Unknown',
        actorRole: userProfile?.role || '',
        action,
        detail: detail || '',
        ...extras,
    };
}

function normalizeWorkflowHistory(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((entry) => ({
        ...entry,
        at: entry.at?.toDate?.() ? entry.at.toDate() : entry.at,
    }));
}

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
    const { user, userProfile } = useAuth();

    useEffect(() => {
        const lettersQuery = query(collection(db, 'letters'), orderBy('createdAt', 'desc'));
        let unsubscribe = () => {};
        let retryTimer = null;
        let retryAttempt = 0;
        let disposed = false;

        const applySnapshot = (snapshot) => {
            const letterData = snapshot.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || new Date(),
                    workflowStep: data.workflowStep || WORKFLOW_STEPS.WITH_RECORDS,
                    workflowHistory: normalizeWorkflowHistory(data.workflowHistory),
                    routedTo: data.routedTo || '',
                    correspondenceType: data.correspondenceType || 'letter_outside_company',
                    assignedDepartment: data.assignedDepartment || '',
                    raisedByDepartment: data.raisedByDepartment || '',
                    ccDepartments: data.ccDepartments || [],
                    signatures: normalizeSignatures(data.signatures),
                };
            });
            setLetters(letterData);
            setDataLoading(false);
            retryAttempt = 0;
        };

        const subscribe = () => {
            unsubscribe();
            unsubscribe = onSnapshot(
                lettersQuery,
                applySnapshot,
                (error) => {
                    if (disposed) return;
                    console.warn('[Records] Firestore listener error, will retry:', error?.code || error?.message);
                    setDataLoading(false);
                    const delayMs = Math.min(30_000, 1000 * 2 ** retryAttempt);
                    retryAttempt += 1;
                    clearTimeout(retryTimer);
                    retryTimer = setTimeout(async () => {
                        if (disposed) return;
                        await refreshFirestoreConnection(db);
                        subscribe();
                    }, delayMs);
                }
            );
        };

        subscribe();
        const removeVisibilityHandler = onFirestoreTabVisible(db, () => {
            if (disposed) return;
            setDataLoading(true);
            refreshFirestoreConnection(db).then(subscribe);
        });

        return () => {
            disposed = true;
            clearTimeout(retryTimer);
            removeVisibilityHandler();
            unsubscribe();
        };
    }, []);

    const uploadFile = useCallback(async (file) => {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageRef = ref(storage, `letters/${timestamp}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return { downloadURL, storagePath: snapshot.ref.fullPath };
    }, []);

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

        const historyEntry = {
            id: crypto.randomUUID(),
            at: Timestamp.now(),
            actorUid: user?.uid || '',
            actorName: userProfile?.name || 'Unknown',
            actorRole: userProfile?.role || '',
            action: WORKFLOW_ACTIONS.LETTER_REGISTERED,
            detail: '',
        };

        const docData = {
            type: letterData.type,
            subject: letterData.subject,
            sender: letterData.sender || '',
            recipient: letterData.recipient || '',
            referenceNo: letterData.referenceNo || '',
            letterDate: letterData.letterDate || '',
            classification: letterData.classification,
            correspondenceType: letterData.correspondenceType || 'letter_outside_company',
            status: 'Pending',
            fileUrl,
            fileName,
            storagePath,
            notes: letterData.notes || '',
            createdBy: userProfile?.name || 'Unknown',
            createdAt: serverTimestamp(),
            workflowStep: WORKFLOW_STEPS.WITH_RECORDS,
            workflowHistory: [historyEntry],
            routedTo: '',
            assignedDepartment: '',
        };

        const docRef = await addDoc(collection(db, 'letters'), docData);
        return docRef.id;
    }, [user, userProfile, uploadFile]);

    const updateLetter = useCallback(async (letterId, updates) => {
        const letterRef = doc(db, 'letters', letterId);
        await updateDoc(letterRef, updates);
    }, []);

    const deleteLetter = useCallback(async (letterId) => {
        await deleteDoc(doc(db, 'letters', letterId));
    }, []);

    const pushWorkflowEntry = useCallback(async (letterId, entry, extraFields = {}) => {
        const letterRef = doc(db, 'letters', letterId);
        const payload = {
            ...entry,
            id: entry.id || crypto.randomUUID(),
            at: entry.at || Timestamp.now(),
        };
        await updateDoc(letterRef, {
            ...extraFields,
            workflowHistory: arrayUnion(payload),
        });
    }, []);

    const makeSignatureRecord = useCallback((signatureDataUrl, minute, departmentId = '') => {
        if (!signatureDataUrl) throw new Error('Digital signature is required.');
        const trimmedMinute = (minute || '').trim();
        if (!trimmedMinute) throw new Error('Please enter a minute before signing.');
        return {
            uid: user?.uid || '',
            name: userProfile?.name || 'Unknown',
            role: userProfile?.role || '',
            departmentId: departmentId || departmentKeyFromRole(userProfile?.role) || '',
            signatureDataUrl,
            minute: trimmedMinute,
            signedAt: Timestamp.now(),
        };
    }, [user, userProfile]);

    const forwardToCeoOffice = useCallback(async (letterId, note = '') => {
        const role = userProfile?.role;
        if (!['records_unit', 'admin'].includes(role)) {
            throw new Error('Only Records (or Admin) can forward to the CEO office.');
        }
        const letter = letters.find((l) => l.id === letterId);
        const step = letter?.workflowStep || WORKFLOW_STEPS.WITH_RECORDS;
        if (step !== WORKFLOW_STEPS.WITH_RECORDS) {
            throw new Error('This letter is not waiting with Records.');
        }
        const entry = {
            actorUid: user?.uid || '',
            actorName: userProfile?.name || 'Unknown',
            actorRole: role,
            action: WORKFLOW_ACTIONS.FORWARDED_TO_CEO_OFFICE,
            detail: note || '',
        };
        await pushWorkflowEntry(letterId, entry, {
            workflowStep: WORKFLOW_STEPS.WITH_CEO_OFFICE,
            status: 'Forwarded',
        });
    }, [letters, user, userProfile, pushWorkflowEntry]);

    const forwardToCeo = useCallback(async (letterId, note = '') => {
        const role = userProfile?.role;
        if (role !== 'ceo_office' && role !== 'admin') {
            throw new Error("Only the CEO's office staff (or Admin) can forward to the CEO.");
        }
        const letter = letters.find((l) => l.id === letterId);
        const step = letter?.workflowStep;
        if (step !== WORKFLOW_STEPS.WITH_CEO_OFFICE) {
            throw new Error('This letter is not with the CEO office.');
        }
        const entry = {
            actorUid: user?.uid || '',
            actorName: userProfile?.name || 'Unknown',
            actorRole: role,
            action: WORKFLOW_ACTIONS.FORWARDED_TO_CEO,
            detail: note || '',
        };
        await pushWorkflowEntry(letterId, entry, {
            workflowStep: WORKFLOW_STEPS.WITH_CEO,
        });
    }, [letters, user, userProfile, pushWorkflowEntry]);

    /** Records or CEO office sends item to a department HOD for review / onward routing */
    const sendToDepartment = useCallback(async (letterId, departmentId, note = '') => {
        const role = userProfile?.role;
        if (!['records_unit', 'ceo_office', 'admin'].includes(role)) {
            throw new Error("Only Records, the CEO's office, or Admin can send to a department.");
        }
        if (!ROUTING_DEPARTMENTS.some((d) => d.id === departmentId)) {
            throw new Error('Invalid department.');
        }
        const letter = letters.find((l) => l.id === letterId);
        const step = letter?.workflowStep;
        const allowed =
            (['records_unit', 'admin'].includes(role) && step === WORKFLOW_STEPS.WITH_RECORDS) ||
            (['ceo_office', 'admin'].includes(role) && step === WORKFLOW_STEPS.WITH_CEO_OFFICE);
        if (!allowed) {
            throw new Error('This letter cannot be sent to a department from its current stage.');
        }
        const entry = {
            actorUid: user?.uid || '',
            actorName: userProfile?.name || 'Unknown',
            actorRole: role,
            action: WORKFLOW_ACTIONS.SENT_TO_DEPARTMENT,
            detail: note || '',
            routedTo: ROUTING_DEPARTMENTS.find((d) => d.id === departmentId)?.label || departmentId,
        };
        await pushWorkflowEntry(letterId, entry, {
            workflowStep: WORKFLOW_STEPS.WITH_DEPARTMENT,
            assignedDepartment: departmentId,
            status: 'Forwarded',
        });
    }, [letters, user, userProfile, pushWorkflowEntry]);

    /** Department HOD forwards to another department (minute + signature required) */
    const departmentForwardToDepartment = useCallback(async (letterId, targetDepartmentId, minute, signatureDataUrl) => {
        const role = userProfile?.role;
        const letter = letters.find((l) => l.id === letterId);
        if (!letter || letter.workflowStep !== WORKFLOW_STEPS.WITH_DEPARTMENT) {
            throw new Error('This letter is not with a department.');
        }
        const myDept = ROUTING_DEPARTMENTS.find((d) => d.role === role);
        if (!myDept && role !== 'admin') {
            throw new Error('Only a department head (or Admin) can forward between departments.');
        }
        if (role !== 'admin' && letter.assignedDepartment !== myDept?.id) {
            throw new Error('This letter is not assigned to your department.');
        }
        if (!ROUTING_DEPARTMENTS.some((d) => d.id === targetDepartmentId)) {
            throw new Error('Invalid department.');
        }
        const trimmedMinute = (minute || '').trim();
        if (!trimmedMinute) throw new Error('Please enter your minute.');
        const sig = makeSignatureRecord(signatureDataUrl, trimmedMinute, myDept?.id || letter.assignedDepartment);
        const targetLabel = ROUTING_DEPARTMENTS.find((d) => d.id === targetDepartmentId)?.label || targetDepartmentId;
        const entry = buildWorkflowEntry(user, userProfile, WORKFLOW_ACTIONS.HOD_MINUTED_AND_SIGNED, trimmedMinute, {
            routedTo: targetLabel,
        });
        await updateDoc(doc(db, 'letters', letterId), {
            assignedDepartment: targetDepartmentId,
            workflowHistory: arrayUnion(entry),
            signatures: arrayUnion(sig),
        });
    }, [letters, user, userProfile, makeSignatureRecord]);

    /** Department HOD forwards directly to the CEO (minute + signature required) */
    const departmentForwardToCeo = useCallback(async (letterId, minute, signatureDataUrl) => {
        const role = userProfile?.role;
        const letter = letters.find((l) => l.id === letterId);
        if (!letter || letter.workflowStep !== WORKFLOW_STEPS.WITH_DEPARTMENT) {
            throw new Error('This letter is not with a department.');
        }
        const myDept = ROUTING_DEPARTMENTS.find((d) => d.role === role);
        if (!myDept && role !== 'admin') {
            throw new Error('Only a department head (or Admin) can forward to the CEO.');
        }
        if (role !== 'admin' && letter.assignedDepartment !== myDept?.id) {
            throw new Error('This letter is not assigned to your department.');
        }
        const trimmedMinute = (minute || '').trim();
        if (!trimmedMinute) throw new Error('Please enter your minute.');
        const sig = makeSignatureRecord(signatureDataUrl, trimmedMinute, myDept?.id || letter.assignedDepartment);
        const entry = buildWorkflowEntry(user, userProfile, WORKFLOW_ACTIONS.DEPARTMENT_FORWARDED_TO_CEO, trimmedMinute);
        await updateDoc(doc(db, 'letters', letterId), {
            workflowStep: WORKFLOW_STEPS.WITH_CEO,
            assignedDepartment: '',
            status: 'Forwarded',
            workflowHistory: arrayUnion(entry),
            signatures: arrayUnion(sig),
        });
    }, [letters, user, userProfile, makeSignatureRecord]);

    /** Raise an internal memo — departments, records, CEO office, or CEO */
    const raiseMemo = useCallback(async (memoData, file, routeViaDepartmentId = '') => {
        const role = userProfile?.role;
        if (!MEMO_CREATOR_ROLES.includes(role)) {
            throw new Error('You are not allowed to raise memos.');
        }

        let fileUrl = '';
        let fileName = '';
        let storagePath = '';
        if (file) {
            const upload = await uploadFile(file);
            fileUrl = upload.downloadURL;
            fileName = file.name;
            storagePath = upload.storagePath;
        }

        const myDept = departmentKeyFromRole(role);
        const trimmedMinute = (memoData.minute || '').trim();
        if (!trimmedMinute) throw new Error('Please enter a minute on the memo.');
        const sig = memoData.signatureDataUrl
            ? makeSignatureRecord(memoData.signatureDataUrl, trimmedMinute, myDept || '')
            : null;

        const viaDept = routeViaDepartmentId && ROUTING_DEPARTMENTS.some((d) => d.id === routeViaDepartmentId)
            ? routeViaDepartmentId
            : '';

        let workflowStep = WORKFLOW_STEPS.WITH_DEPARTMENT;
        let assignedDepartment = viaDept || myDept || '';

        if (!viaDept && (role === 'ceo' || role === 'ceo_office')) {
            workflowStep = role === 'ceo' ? WORKFLOW_STEPS.WITH_CEO : WORKFLOW_STEPS.WITH_CEO_OFFICE;
            assignedDepartment = '';
        } else if (!viaDept && ['records_unit', 'admin'].includes(role)) {
            workflowStep = WORKFLOW_STEPS.WITH_RECORDS;
            assignedDepartment = '';
        } else if (!viaDept && myDept) {
            assignedDepartment = myDept;
        }

        const historyEntry = buildWorkflowEntry(user, userProfile, WORKFLOW_ACTIONS.MEMO_RAISED, trimmedMinute, {
            routedTo: viaDept
                ? ROUTING_DEPARTMENTS.find((d) => d.id === viaDept)?.label
                : role === 'ceo'
                  ? 'CEO'
                  : myDept
                    ? departmentLabelFromId(myDept)
                    : 'Records',
        });

        const docData = {
            type: 'outgoing',
            subject: memoData.subject,
            sender: memoData.sender || userProfile?.name || '',
            recipient: memoData.recipient || 'Chief Executive',
            referenceNo: memoData.referenceNo || '',
            letterDate: memoData.letterDate || new Date().toISOString().slice(0, 10),
            classification: memoData.classification || 'General',
            correspondenceType: 'memo',
            status: 'Pending',
            fileUrl,
            fileName,
            storagePath,
            notes: memoData.notes || '',
            createdBy: userProfile?.name || 'Unknown',
            createdAt: serverTimestamp(),
            workflowStep,
            workflowHistory: [historyEntry],
            routedTo: '',
            assignedDepartment,
            raisedByDepartment: myDept || '',
            ccDepartments: [],
            signatures: sig ? [sig] : [],
        };

        const docRef = await addDoc(collection(db, 'letters'), docData);
        return docRef.id;
    }, [user, userProfile, uploadFile, makeSignatureRecord]);

    /** CEO dispatches memo: minute, route target, CC departments, return to HOD inboxes */
    const ceoDispatchMemo = useCallback(async (letterId, { minute, routedTo, ccDepartmentIds = [], returnDepartmentIds = [] }) => {
        const role = userProfile?.role;
        if (role !== 'ceo' && role !== 'admin') {
            throw new Error('Only the CEO (or Admin) can dispatch memos.');
        }
        const letter = letters.find((l) => l.id === letterId);
        if (!letter || letter.workflowStep !== WORKFLOW_STEPS.WITH_CEO) {
            throw new Error('This memo is not with the CEO.');
        }
        const trimmedMinute = (minute || '').trim();
        const trimmedRoute = (routedTo || '').trim();
        if (!trimmedMinute) throw new Error('Please enter the CEO minute.');
        if (!trimmedRoute && returnDepartmentIds.length === 0) {
            throw new Error('Enter who this is routed to, or select departments to return the memo to.');
        }

        const cc = [...new Set([...(ccDepartmentIds || []), ...(returnDepartmentIds || []).slice(1)])];
        const entry = buildWorkflowEntry(user, userProfile, WORKFLOW_ACTIONS.CEO_MEMO_DISPATCHED, trimmedMinute, {
            routedTo: trimmedRoute,
            ccDepartments: cc,
        });

        if (returnDepartmentIds.length > 0) {
            await updateDoc(doc(db, 'letters', letterId), {
                workflowStep: WORKFLOW_STEPS.WITH_DEPARTMENT,
                assignedDepartment: returnDepartmentIds[0],
                routedTo: trimmedRoute,
                ccDepartments: cc,
                status: 'Forwarded',
                workflowHistory: arrayUnion(entry),
            });
        } else {
            await updateDoc(doc(db, 'letters', letterId), {
                workflowStep: WORKFLOW_STEPS.ROUTED,
                routedTo: trimmedRoute,
                ccDepartments: cc,
                assignedDepartment: '',
                status: 'Forwarded',
                workflowHistory: arrayUnion(entry),
            });
        }
    }, [letters, user, userProfile]);

    const ceoMinuteAndRoute = useCallback(async (letterId, minuteText, routedTo) => {
        const role = userProfile?.role;
        if (role !== 'ceo' && role !== 'admin') {
            throw new Error('Only the CEO (or Admin) can minute and route.');
        }
        const letter = letters.find((l) => l.id === letterId);
        const step = letter?.workflowStep;
        if (step !== WORKFLOW_STEPS.WITH_CEO) {
            throw new Error('This letter is not with the CEO.');
        }
        const trimmedMinute = (minuteText || '').trim();
        const trimmedRoute = (routedTo || '').trim();
        if (!trimmedMinute) throw new Error('Please enter the CEO minute.');
        if (!trimmedRoute) throw new Error('Please enter who or which department this is routed to.');
        const entry = {
            actorUid: user?.uid || '',
            actorName: userProfile?.name || 'Unknown',
            actorRole: role,
            action: WORKFLOW_ACTIONS.CEO_MINUTED_AND_ROUTED,
            detail: trimmedMinute,
            routedTo: trimmedRoute,
        };
        await pushWorkflowEntry(letterId, entry, {
            workflowStep: WORKFLOW_STEPS.ROUTED,
            routedTo: trimmedRoute,
            status: 'Forwarded',
        });
    }, [letters, user, userProfile, pushWorkflowEntry]);

    const value = {
        letters,
        dataLoading,
        addLetter,
        raiseMemo,
        updateLetter,
        deleteLetter,
        forwardToCeoOffice,
        forwardToCeo,
        sendToDepartment,
        departmentForwardToDepartment,
        departmentForwardToCeo,
        ceoMinuteAndRoute,
        ceoDispatchMemo,
        LETTER_CLASSIFICATIONS,
        LETTER_STATUSES,
        WORKFLOW_STEPS,
        WORKFLOW_STEP_LABELS,
        WORKFLOW_ACTIONS,
    };

    return (
        <RecordsContext.Provider value={value}>
            {children}
        </RecordsContext.Provider>
    );
};
