import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { listDocuments } from '../utils/firestoreRest';
import { Download, Search, Filter, Loader, Clock, User, Package, Shield, Key } from 'lucide-react';
import { exportToCsv } from '../utils/exportCsv';
import { format } from 'date-fns';

const ACTION_LABELS = {
    user_login: { label: 'Login', color: '#3b82f6', icon: User },
    user_logout: { label: 'Logout', color: '#6b7280', icon: User },
    password_changed: { label: 'Password Changed', color: '#8b5cf6', icon: Key },
    password_reset: { label: 'Password Reset', color: '#f59e0b', icon: Key },
    user_created: { label: 'User Created', color: '#10b981', icon: Shield },
    user_deleted: { label: 'User Deleted', color: '#ef4444', icon: Shield },
    user_role_changed: { label: 'Role Changed', color: '#f59e0b', icon: Shield },
    user_status_changed: { label: 'Status Changed', color: '#f97316', icon: Shield },
    user_force_logout: { label: 'Force Logout', color: '#ef4444', icon: Shield },
    item_created: { label: 'Item Created', color: '#10b981', icon: Package },
    item_updated: { label: 'Item Updated', color: '#3b82f6', icon: Package },
    item_deleted: { label: 'Item Deleted', color: '#ef4444', icon: Package },
    stock_in: { label: 'Stock In', color: '#10b981', icon: Package },
    stock_out: { label: 'Stock Out', color: '#f97316', icon: Package },
};

const ACTION_FILTERS = [
    { id: '', label: 'All Actions' },
    { id: 'auth', label: 'Auth Events', actions: ['user_login', 'user_logout', 'password_changed', 'password_reset'] },
    { id: 'users', label: 'User Management', actions: ['user_created', 'user_deleted', 'user_role_changed', 'user_status_changed', 'user_force_logout'] },
    { id: 'inventory', label: 'Inventory', actions: ['item_created', 'item_updated', 'item_deleted', 'stock_in', 'stock_out'] },
];

export default function ActivityLog() {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    const fetchLogs = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const idToken = await user.getIdToken();
            const data = await listDocuments('audit_log', idToken);
            // Sort newest first
            const sorted = (data || []).sort((a, b) =>
                (b.timestamp || '').localeCompare(a.timestamp || '')
            );
            setLogs(sorted);
        } catch (err) {
            console.error('Error fetching audit log:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            // Search filter
            const matchesSearch = searchQuery
                ? (log.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.action || '').toLowerCase().includes(searchQuery.toLowerCase())
                : true;

            // Category filter
            let matchesCategory = true;
            if (filterCategory) {
                const cat = ACTION_FILTERS.find(f => f.id === filterCategory);
                if (cat?.actions) {
                    matchesCategory = cat.actions.includes(log.action);
                }
            }

            return matchesSearch && matchesCategory;
        });
    }, [logs, searchQuery, filterCategory]);

    const handleExport = () => {
        exportToCsv('activity_log',
            ['Timestamp', 'Action', 'Details', 'User', 'Target'],
            filteredLogs.map(log => [
                log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
                ACTION_LABELS[log.action]?.label || log.action,
                log.details || '',
                log.userName || '',
                log.targetId || '',
            ])
        );
    };

    if (loading) {
        return (
            <div className="dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader className="spin" size={32} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Activity Log</h1>
                    <p className="page-subtitle">Track all system actions and changes.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" onClick={handleExport}>
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="card">
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="form-control"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="filter-box" style={{ minWidth: '150px' }}>
                        <Filter size={18} className="text-muted" />
                        <select
                            className="form-control"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            {ACTION_FILTERS.map(f => (
                                <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
                    {filteredLogs.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No activity logs found.
                        </div>
                    ) : (
                        <div style={{ padding: '0.5rem 0' }}>
                            {filteredLogs.map((log, idx) => {
                                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '#6b7280', icon: Clock };
                                const IconComponent = actionInfo.icon;

                                return (
                                    <div
                                        key={log.id || idx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.75rem',
                                            padding: '0.75rem 1.25rem',
                                            borderBottom: '1px solid var(--border-color)',
                                        }}
                                    >
                                        <div style={{
                                            width: '2rem',
                                            height: '2rem',
                                            minWidth: '2rem',
                                            borderRadius: '0.5rem',
                                            background: `${actionInfo.color}15`,
                                            color: actionInfo.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <IconComponent size={14} />
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    padding: '0.1rem 0.4rem',
                                                    borderRadius: '0.25rem',
                                                    background: `${actionInfo.color}15`,
                                                    color: actionInfo.color,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.02em',
                                                }}>
                                                    {actionInfo.label}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                                    {log.details}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                <strong>{log.userName || 'System'}</strong>
                                                {' · '}
                                                {log.timestamp ? format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss') : '-'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
                    Showing {filteredLogs.length} of {logs.length} entries
                </div>
            </div>
        </div>
    );
}
