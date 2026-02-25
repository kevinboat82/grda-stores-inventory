import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, X, UserCheck, UserX, Shield, Edit2, Loader } from 'lucide-react';
import './Users.css';

const POSITIONS = [
    'CEO / Managing Director',
    'Store Manager',
    'Storekeeper',
    'Audit Officer',
    'Head of Department (HOD)',
    'Administrative Officer',
    'IT Administrator',
    'General Staff',
    'Records Officer',
    'Registry Clerk',
    'Filing Officer'
];

const ROLES = [
    { id: 'admin', label: 'Store Manager (Admin)' },
    { id: 'storekeeper', label: 'Storekeeper' },
    { id: 'audit_unit', label: 'Audit Unit' },
    { id: 'records_unit', label: 'Records Unit' },
    { id: 'none', label: 'No Access' }
];

export default function UserManagement() {
    const { adminCreateUser, updateUserRole, toggleUserStatus } = useAuth();
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

    const fetchUsers = async () => {
        try {
            const q = query(collection(db, 'users'));
            const querySnapshot = await getDocs(q);
            const userList = [];
            querySnapshot.forEach((doc) => {
                userList.push({ uid: doc.id, ...doc.data() });
            });
            setUsers(userList);
        } catch (err) {
            console.error("Error fetching users: ", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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
            fetchUsers(); // Refresh list
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

    const handleToggleStatus = async (user) => {
        if (!window.confirm(`Are you sure you want to ${user.isActive === false ? 'reactivate' : 'deactivate'} this account?`)) return;

        try {
            await toggleUserStatus(user.uid, user.isActive !== false); // Handle undefined as true
            fetchUsers();
        } catch (err) {
            alert('Failed to update status: ' + err.message);
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({ ...formData, role: user.role });
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
                                                <span className="capitalize">{u.role.replace('_', ' ')}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
                                                {isActive ? 'Active' : 'Deactivated'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                    onClick={() => openEditModal(u)}
                                                    title="Change Role"
                                                >
                                                    <Edit2 size={12} /> Role
                                                </button>
                                                <button
                                                    className={`btn ${isActive ? 'btn-danger' : 'btn-primary'}`}
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                    onClick={() => handleToggleStatus(u)}
                                                    title={isActive ? 'Deactivate Account' : 'Reactivate Account'}
                                                >
                                                    {isActive ? <UserX size={12} /> : <UserCheck size={12} />}
                                                    {isActive ? 'Disable' : 'Enable'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                            <X size={24} />
                        </button>
                        <h2 className="modal-title">Add New User</h2>

                        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

                        <form onSubmit={handleAddUser}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Temporary Password</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    required
                                    minLength="6"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Position / Title</label>
                                <select
                                    className="form-select"
                                    required
                                    value={formData.position}
                                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                                >
                                    <option value="">Select official position...</option>
                                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">System Access Role</label>
                                <select
                                    className="form-select"
                                    required
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                            </div>
                            <div className="modal-actions">
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
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                            <X size={24} />
                        </button>
                        <h2 className="modal-title">Edit Role for {selectedUser.name || selectedUser.email}</h2>

                        {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

                        <form onSubmit={handleEditRole}>
                            <div className="form-group">
                                <label className="form-label">System Access Role</label>
                                <select
                                    className="form-select"
                                    required
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                            </div>
                            <div className="modal-actions">
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
