import { ROUTING_DEPARTMENTS } from '../constants/departmentWorkflow';
import { normalizeUserRoleFromFirestore } from './userRole';

/** Single choice in admin UI — sets both Firestore `role` and `position` automatically. */
export const USER_ACCOUNT_TYPES = [
    { role: 'admin', label: 'HOD (Admin)', position: 'HOD (Admin)' },
    { role: 'store_manager', label: 'Store Manager', position: 'Store Manager' },
    { role: 'audit_unit', label: 'Audit Unit', position: 'Audit' },
    { role: 'records_unit', label: 'Records Unit', position: 'Records' },
    { role: 'ceo_office', label: "CEO's Office (PA / Secretary)", position: "CEO's Office (PA / Secretary)" },
    { role: 'ceo', label: 'Chief Executive', position: 'Chief Executive' },
    ...ROUTING_DEPARTMENTS.map((d) => ({
        role: d.role,
        label: `HOD — ${d.label}`,
        position: `HOD — ${d.label}`,
    })),
    { role: 'none', label: 'No access (account disabled)', position: 'No access' },
];

export function accountTypeForRole(role) {
    const canonical = normalizeUserRoleFromFirestore(role);
    return USER_ACCOUNT_TYPES.find((t) => t.role === canonical) || null;
}

export function defaultPositionForRole(role) {
    return accountTypeForRole(role)?.position || '';
}

export function labelForRole(role) {
    return accountTypeForRole(role)?.label || role || '—';
}

/**
 * Full Firestore `users/{uid}` document — admin create/update should use this
 * so every field is set consistently (no manual Console edits).
 */
export function buildUserProfileForFirestore({
    email,
    role,
    name = '',
    position = '',
    createdByUid = null,
    existing = {},
}) {
    const canonicalRole = normalizeUserRoleFromFirestore(role);
    const resolvedPosition = (position || defaultPositionForRole(canonicalRole)).trim();
    const trimmedName = (name || '').trim();
    const normalizedEmail = (email || existing.email || '').trim().toLowerCase();

    return {
        ...existing,
        email: normalizedEmail,
        role: canonicalRole,
        position: resolvedPosition,
        name: trimmedName,
        isActive: canonicalRole !== 'none',
        mustChangePassword: existing.mustChangePassword ?? true,
        isOnline: false,
        forceLogout: false,
        createdAt: existing.createdAt || new Date().toISOString(),
        createdBy: existing.createdBy || createdByUid || null,
        updatedAt: new Date().toISOString(),
    };
}

export function firebaseAuthErrorMessage(err) {
    const code = err?.code || '';
    switch (code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Use a different email or reset the existing account.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/weak-password':
            return 'Password is too weak. Use at least 6 characters.';
        case 'auth/operation-not-allowed':
            return 'Email/password sign-in is not enabled in Firebase Authentication.';
        case 'permission-denied':
            return 'Permission denied writing the user profile. Your account must have role "admin" in Firestore (users document). Deploy the latest rules: firebase deploy --only firestore:rules';
        default:
            return err?.message || 'Something went wrong. Please try again.';
    }
}
