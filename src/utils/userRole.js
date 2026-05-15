import { DEPARTMENT_ROLE_IDS } from '../constants/departmentWorkflow';

/** Roles the app understands (must match ProtectedRoute / UserManagement ids). */
export const CANONICAL_ROLES = [
    'admin',
    'store_manager',
    'audit_unit',
    'records_unit',
    'ceo_office',
    'ceo',
    'none',
    ...DEPARTMENT_ROLE_IDS,
];

const ROLE_ALIASES = {
    admin: 'admin',
    administrator: 'admin',
    hod: 'admin',
    'hod (admin)': 'admin',
    'hod admin': 'admin',
    superadmin: 'admin',
    store_manager: 'store_manager',
    storemanager: 'store_manager',
    storekeeper: 'store_manager',
    'store keeper': 'store_manager',
    'store-keeper': 'store_manager',
    audit: 'audit_unit',
    audit_unit: 'audit_unit',
    records: 'records_unit',
    records_unit: 'records_unit',
    'records unit': 'records_unit',
    ceo_office: 'ceo_office',
    'ceo office': 'ceo_office',
    "ceo's office": 'ceo_office',
    'pa / secretary': 'ceo_office',
    secretary: 'ceo_office',
    ceo: 'ceo',
    chief_executive: 'ceo',
    'chief executive': 'ceo',
    none: 'none',
};

/**
 * Map Firestore / manual Console values to a canonical role string.
 * Fixes common mistakes: "Admin" vs "admin", wrong field casing, typos.
 */
export function normalizeUserRoleFromFirestore(rawRole) {
    if (rawRole === null || rawRole === undefined) return 'none';
    const s = String(rawRole).trim().toLowerCase();
    if (!s) return 'none';
    if (CANONICAL_ROLES.includes(s)) return s;
    if (ROLE_ALIASES[s]) return ROLE_ALIASES[s];
    if (DEPARTMENT_ROLE_IDS.includes(s)) return s;
    console.warn('[Auth] Unknown role value from Firestore; using "none":', rawRole);
    return 'none';
}

/**
 * Read role from a Firestore user document (supports common alternate field names).
 */
export function pickRoleField(profile) {
    if (!profile || typeof profile !== 'object') return undefined;
    return profile.role ?? profile.userRole ?? profile.Role ?? profile.user_role;
}
