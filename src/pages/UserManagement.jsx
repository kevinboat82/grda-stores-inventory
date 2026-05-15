import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, X, UserCheck, UserX, Shield, Edit2, Loader, Trash2, Key, LogOut, CheckCircle2 } from 'lucide-react';
import { USER_ACCOUNT_TYPES, labelForRole } from '../utils/userProfile';
import './Users.css';

const defaultAccountType = 'records_unit';

function accountFromType(accountType) {
    return USER_ACCOUNT_TYPES.find((t) => t.role === accountType) || USER_ACCOUNT_TYPES[0];
}

export default function UserManagement() {
    const { user, adminCreateUser, adminUpdateUser, toggleUserStatus, deleteUser, adminResetPassword, forceUserLogout } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        accountType: defaultAccountType,
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const selectedAccount = useMemo(
        () => accountFromType(formData.accountType),
        [formData.accountType]
    );

    const fetchUsers = useCallback(async () => {
        if (!user) return;
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            const userList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setUsers(userList.map((u) => ({ ...u, uid: u.id })));
        } catch (err) {
            console.error('Error fetching users: ', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const resetAddForm = () => {
        setFormData({ email: '', password: '', name: '', accountType: defaultAccountType });
        setError('');
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setSubmitting(true);

        const { role, position } = selectedAccount;

        try {
            const created = await adminCreateUser(
                formData.email,
                formData.password,
                role,
                position,
                formData.name
            );
            setShowAddModal(false);
            resetAddForm();
            setSuccessMessage(
                `Account created for ${created.email}. Role "${labelForRole(created.role)}" and profile were saved in Firebase — no Console edits needed.`
            );
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        const { role, position } = selectedAccount;

        try {
            await adminUpdateUser(selectedUser.uid, {
                role,
                position,
                name: formData.name || selectedUser.name,
            });
            setShowEditModal(false);
            setSelectedUser(null);
            setSuccessMessage(`Updated ${selectedUser.email} in Firebase.`);
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to update user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStatus = async (targetUser) => {
        if (!window.confirm(`Are you sure you want to ${targetUser.isActive === false ? 'reactivate' : 'deactivate'} this account?`)) return;

        try {
            await toggleUserStatus(targetUser.uid, targetUser.isActive !== false);
            fetchUsers();
        } catch (err) {
            alert('Failed to update status: ' + err.message);
        }
    };

    const handleDeleteUser = async (targetUser) => {
        if (!window.confirm(`Are you sure you want to permanently delete ${targetUser.name || targetUser.email}? This removes their Firestore profile (Auth login may still exist in Firebase Console).`)) return;

        try {
            await deleteUser(targetUser.uid);
            fetchUsers();
        } catch (err) {
            alert('Failed to delete user: ' + err.message);
        }
    };

    const handleResetPassword = async (targetUser) => {
        if (!window.confirm(`Send a password reset email to ${targetUser.email}?`)) return;
        try {
            await adminResetPassword(targetUser.email);
            alert(`Password reset email sent to ${targetUser.email}`);
        } catch (err) {
            alert('Failed to send reset email: ' + err.message);
        }
    };

    const handleForceLogout = async (targetUser) => {
        if (!window.confirm(`Force ${targetUser.name || targetUser.email} to log out?`)) return;
        try {
            await forceUserLogout(targetUser.uid);
            alert(`Force logout triggered for ${targetUser.name || targetUser.email}. They will be logged out within 30 seconds.`);
        } catch (err) {
            alert('Failed to force logout: ' + err.message);
        }
    };

    const openEditModal = (targetUser) => {
        setSelectedUser(targetUser);
        const accountType = USER_ACCOUNT_TYPES.some((t) => t.role === targetUser.role)
            ? targetUser.role
            : defaultAccountType;
        setFormData({
            email: targetUser.email || '',
            password: '',
            name: targetUser.name || '',
            accountType,
        });
        setError('');
        setShowEditModal(true);
    };

    if (loading) {
        return (
            <div className="dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader className="spin" size={32} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div className="dashboard users-page">
            <div className="users-header">
                <div>
                    <h1 className="users-title">User Management</h1>
                    <p className="text-muted">
                        Create accounts here — Firebase Authentication and the full user profile (role, position, access flags) are written automatically.
                    </p>
                </div>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                        resetAddForm();
                        setShowAddModal(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={18} />
                    Add User
                </button>
            </div>

            {successMessage && (
                <div
                    className="card"
                    style={{
                        marginBottom: '1rem',
                        padding: '0.85rem 1rem',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        fontSize: '0.9rem',
                        color: '#065f46',
                    }}
                >
                    <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <span>{successMessage}</span>
                    <button
                        type="button"
                        className="btn-icon"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => setSuccessMessage('')}
                        aria-label="Dismiss"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="card table-card">
                <div className="card-header">
                    <h2 className="card-title">System Users</h2>
                </div>
                <div className="table-container">
                    <table className="table users-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Position</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Session</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => {
                                const isActive = u.isActive !== false;
                                return (
                                    <tr key={u.uid} className={!isActive ? 'user-inactive' : ''}>
                                        <td className="font-medium">{u.name || '—'}</td>
                                        <td className="text-muted">{u.email}</td>
                                        <td>{u.position || '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Shield size={14} color="var(--primary)" />
                                                <span>{labelForRole(u.role)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
                                                {isActive ? 'Active' : 'Deactivated'}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    color: u.isOnline ? '#10b981' : 'var(--text-muted)',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: u.isOnline ? '#10b981' : '#d1d5db',
                                                        display: 'inline-block',
                                                    }}
                                                />
                                                {u.isOnline ? 'Online' : 'Offline'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                                    onClick={() => openEditModal(u)}
                                                    title="Edit account"
                                                >
                                                    <Edit2 size={11} /> Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                                    onClick={() => handleResetPassword(u)}
                                                    title="Send Password Reset Email"
                                                >
                                                    <Key size={11} /> Reset
                                                </button>
                                                {u.isOnline && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline"
                                                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--warning)' }}
                                                        onClick={() => handleForceLogout(u)}
                                                        title="Force Logout"
                                                    >
                                                        <LogOut size={11} /> Kick
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className={`btn ${isActive ? 'btn-danger' : 'btn-primary'}`}
                                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                                    onClick={() => handleToggleStatus(u)}
                                                    title={isActive ? 'Deactivate Account' : 'Reactivate Account'}
                                                >
                                                    {isActive ? <UserX size={11} /> : <UserCheck size={11} />}
                                                    {isActive ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--danger)' }}
                                                    onClick={() => handleDeleteUser(u)}
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && (
                <div className="um-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="um-modal-close" onClick={() => setShowAddModal(false)}>
                            <X size={20} />
                        </button>
                        <h2 className="um-modal-title">Add New User</h2>
                        <p className="text-muted text-sm" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                            Role, position, and access flags are saved to Firestore automatically — you do not need to edit Firebase Console.
                        </p>

                        {error && <div className="um-alert-error">{error}</div>}

                        <form onSubmit={handleAddUser}>
                            <div className="um-form-group">
                                <label className="um-form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="um-form-input"
                                    required
                                    placeholder="e.g. John Mensah"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="um-form-group">
                                <label className="um-form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="um-form-input"
                                    required
                                    placeholder="e.g. john@grda.gov.gh"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="um-form-group">
                                <label className="um-form-label">Temporary Password</label>
                                <input
                                    type="text"
                                    className="um-form-input"
                                    required
                                    minLength={6}
                                    placeholder="Min. 6 characters — user should change on first login"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="um-form-group">
                                <label className="um-form-label">Account type (sets role &amp; position)</label>
                                <select
                                    className="um-form-input"
                                    required
                                    value={formData.accountType}
                                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                                >
                                    {USER_ACCOUNT_TYPES.map((t) => (
                                        <option key={t.role} value={t.role}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-sm text-muted" style={{ marginTop: '0.35rem' }}>
                                    Will save: role <code>{selectedAccount.role}</code>, position &ldquo;{selectedAccount.position}&rdquo;
                                </p>
                            </div>
                            <div className="um-modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)} disabled={submitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Creating…' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && selectedUser && (
                <div className="um-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="um-modal-close" onClick={() => setShowEditModal(false)}>
                            <X size={20} />
                        </button>
                        <h2 className="um-modal-title">Edit {selectedUser.name || selectedUser.email}</h2>

                        {error && <div className="um-alert-error">{error}</div>}

                        <form onSubmit={handleEditUser}>
                            <div className="um-form-group">
                                <label className="um-form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="um-form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="um-form-group">
                                <label className="um-form-label">Account type (sets role &amp; position)</label>
                                <select
                                    className="um-form-input"
                                    required
                                    value={formData.accountType}
                                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                                >
                                    {USER_ACCOUNT_TYPES.map((t) => (
                                        <option key={t.role} value={t.role}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="um-modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)} disabled={submitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Saving…' : 'Save to Firebase'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
