import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { listDocuments } from '../utils/firestoreRest';
import { Plus, X, UserCheck, UserX, Shield, Edit2, Loader, Trash2, Key, LogOut } from 'lucide-react';
import './Users.css';

const POSITIONS = [
    'HOD (Admin)',
    'Store Manager',
    'Audit',
    'Records'
];

const ROLES = [
    { id: 'admin', label: 'HOD (Admin)' },
    { id: 'store_manager', label: 'Store Manager' },
    { id: 'audit_unit', label: 'Audit Unit' },
    { id: 'records_unit', label: 'Records Unit' },
    { id: 'none', label: 'No Access' }
];

export default function UserManagement() {
    const { user, adminCreateUser, updateUserRole, toggleUserStatus, deleteUser, adminResetPassword, forceUserLogout } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Forms
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        position: '',
        role: 'none'
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        if (!user) return;
        try {
            const idToken = await user.getIdToken();
            const userList = await listDocuments('users', idToken);
            // Map 'id' to 'uid' for consistency
            setUsers(userList.map(u => ({ ...u, uid: u.id })));
        } catch (err) {
            console.error("Error fetching users: ", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await adminCreateUser(
                formData.email,
                formData.password,
                formData.role,
                formData.position,
                formData.name
            );
            setShowAddModal(false);
            setFormData({ email: '', password: '', name: '', position: '', role: 'none' });
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditRole = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await updateUserRole(selectedUser.uid, formData.role);
            setShowEditModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to update user role');
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
        if (!window.confirm(`Are you sure you want to permanently delete ${targetUser.name || targetUser.email}? This cannot be undone.`)) return;

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
        setFormData({ ...formData, role: targetUser.role });
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
                    <p className="text-muted">Manage system access, roles, and user accounts.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setFormData({ email: '', password: '', name: '', position: '', role: 'none' });
                        setError('');
                        setShowAddModal(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={18} />
                    Add User
                </button>
            </div>

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
                            {users.map(u => {
                                const isActive = u.isActive !== false;
                                return (
                                    <tr key={u.uid} className={!isActive ? 'user-inactive' : ''}>
                                        <td className="font-medium">{u.name || '-'}</td>
                                        <td className="text-muted">{u.email}</td>
                                        <td>{u.position || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Shield size={14} color="var(--primary)" />
                                                <span className="capitalize">{(u.role || '').replace('_', ' ')}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
                                                {isActive ? 'Active' : 'Deactivated'}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                fontSize: '0.75rem', fontWeight: 500,
                                                color: u.isOnline ? '#10b981' : 'var(--text-muted)'
                                            }}>
                                                <span style={{
                                                    width: '6px', height: '6px', borderRadius: '50%',
                                                    background: u.isOnline ? '#10b981' : '#d1d5db',
                                                    display: 'inline-block'
                                                }}></span>
                                                {u.isOnline ? 'Online' : 'Offline'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                                    onClick={() => openEditModal(u)}
                                                    title="Change Role"
                                                >
                                                    <Edit2 size={11} /> Role
                                                </button>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                                    onClick={() => handleResetPassword(u)}
                                                    title="Send Password Reset Email"
                                                >
                                                    <Key size={11} /> Reset
                                                </button>
                                                {u.isOnline && (
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--warning)' }}
                                                        onClick={() => handleForceLogout(u)}
                                                        title="Force Logout"
                                                    >
                                                        <LogOut size={11} /> Kick
                                                    </button>
                                                )}
                                                <button
                                                    className={`btn ${isActive ? 'btn-danger' : 'btn-primary'}`}
                                                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                                    onClick={() => handleToggleStatus(u)}
                                                    title={isActive ? 'Deactivate Account' : 'Reactivate Account'}
                                                >
                                                    {isActive ? <UserX size={11} /> : <UserCheck size={11} />}
                                                    {isActive ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
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
                                )
                            })}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="um-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="um-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="um-modal-close" onClick={() => setShowAddModal(false)}>
                            <X size={20} />
                        </button>
                        <h2 className="um-modal-title">Add New User</h2>

                        {error && <div className="um-alert-error">{error}</div>}

                        <form onSubmit={handleAddUser}>
                            <div className="um-form-group">
                                <label className="um-form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="um-form-input"
                                    required
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="um-form-group">
                                <label className="um-form-label">Temporary Password</label>
                                <input
                                    type="text"
                                    className="um-form-input"
                                    required
                                    minLength="6"
                                    placeholder="Min. 6 characters"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="um-form-row">
                                <div className="um-form-group">
                                    <label className="um-form-label">Position / Title</label>
                                    <select
                                        className="um-form-input"
                                        required
                                        value={formData.position}
                                        onChange={e => setFormData({ ...formData, position: e.target.value })}
                                    >
                                        <option value="">Select position...</option>
                                        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="um-form-group">
                                    <label className="um-form-label">System Role</label>
                                    <select
                                        className="um-form-input"
                                        required
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="um-modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)} disabled={submitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {showEditModal && selectedUser && (
                <div className="um-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="um-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="um-modal-close" onClick={() => setShowEditModal(false)}>
                            <X size={20} />
                        </button>
                        <h2 className="um-modal-title">Edit Role for {selectedUser.name || selectedUser.email}</h2>

                        {error && <div className="um-alert-error">{error}</div>}

                        <form onSubmit={handleEditRole}>
                            <div className="um-form-group">
                                <label className="um-form-label">System Access Role</label>
                                <select
                                    className="um-form-input"
                                    required
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                            </div>
                            <div className="um-modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)} disabled={submitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Updating...' : 'Update Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
