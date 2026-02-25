/**
 * Activity / Audit Log utility.
 * Logs user actions to the 'audit_log' Firestore collection via REST API.
 */
import { addDocument } from './firestoreRest';

/**
 * Log an activity to the audit trail.
 * @param {Object} params
 * @param {string} params.action - e.g. 'user_created', 'stock_in', 'item_deleted'
 * @param {string} params.details - Human-readable description
 * @param {string} params.userId - UID of the user performing the action
 * @param {string} params.userName - Name of the user performing the action
 * @param {string} [params.targetId] - ID of the affected resource
 * @param {string} [params.targetType] - Type: 'user', 'item', 'transaction'
 * @param {string} idToken - Firebase auth token
 */
export const logActivity = async ({ action, details, userId, userName, targetId, targetType }, idToken) => {
    try {
        await addDocument('audit_log', {
            action,
            details,
            userId,
            userName: userName || 'Unknown',
            targetId: targetId || '',
            targetType: targetType || '',
            timestamp: new Date().toISOString(),
        }, idToken);
    } catch (err) {
        // Audit logging should never break the app — fail silently
        console.error('[AuditLog] Failed to log activity:', err);
    }
};

// Action constants for consistency
export const ACTIONS = {
    // Auth
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    PASSWORD_CHANGED: 'password_changed',
    PASSWORD_RESET: 'password_reset',

    // User management
    USER_CREATED: 'user_created',
    USER_DELETED: 'user_deleted',
    USER_ROLE_CHANGED: 'user_role_changed',
    USER_STATUS_CHANGED: 'user_status_changed',
    USER_FORCE_LOGOUT: 'user_force_logout',

    // Inventory
    ITEM_CREATED: 'item_created',
    ITEM_UPDATED: 'item_updated',
    ITEM_DELETED: 'item_deleted',
    STOCK_IN: 'stock_in',
    STOCK_OUT: 'stock_out',
};
