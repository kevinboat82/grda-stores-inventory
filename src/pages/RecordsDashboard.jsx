import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MailOpen, Send, Clock, Search, Filter, Plus, FileText, Eye } from 'lucide-react';
import { useRecords, LETTER_CLASSIFICATIONS } from '../context/RecordsContext';
import { format } from 'date-fns';
import './Records.css';

const RecordsDashboard = () => {
    const { letters, dataLoading } = useRecords();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState(''); // '' | 'incoming' | 'outgoing'
    const [filterClass, setFilterClass] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // KPIs
    const today = new Date().toDateString();
    const totalLetters = letters.length;
    const incomingToday = letters.filter(l => l.type === 'incoming' && new Date(l.createdAt).toDateString() === today).length;
    const outgoingToday = letters.filter(l => l.type === 'outgoing' && new Date(l.createdAt).toDateString() === today).length;
    const pendingCount = letters.filter(l => l.status === 'Pending').length;

    // Filtered letters
    const filteredLetters = useMemo(() => {
        return letters.filter(letter => {
            const matchSearch = !searchQuery ||
                letter.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                letter.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                letter.recipient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                letter.referenceNo?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchType = !filterType || letter.type === filterType;
            const matchClass = !filterClass || letter.classification === filterClass;
            const matchStatus = !filterStatus || letter.status === filterStatus;
            return matchSearch && matchType && matchClass && matchStatus;
        });
    }, [letters, searchQuery, filterType, filterClass, filterStatus]);

    const getStatusBadge = (status) => {
        const map = {
            'Pending': 'badge-warning',
            'Acknowledged': 'badge-info',
            'Forwarded': 'badge-primary',
            'Filed': 'badge-success',
            'Responded': 'badge-neutral',
        };
        return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
    };

    const getTypeBadge = (type) => {
        if (type === 'incoming') return <span className="badge badge-success"><MailOpen size={12} /> Incoming</span>;
        return <span className="badge badge-warning"><Send size={12} /> Outgoing</span>;
    };

    if (dataLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading records...</p>
            </div>
        );
    }

    return (
        <div className="records-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Records Dashboard</h1>
                    <p className="page-subtitle">Manage incoming and outgoing correspondence</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/records/upload')}>
                    <Plus size={18} /> New Letter
                </button>
            </div>

            {/* KPI Grid */}
            <div className="records-kpi-grid">
                <div className="card records-kpi-card">
                    <div className="records-kpi-icon" style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
                        <FileText size={22} />
                    </div>
                    <div>
                        <p className="records-kpi-label">Total Letters</p>
                        <h3 className="records-kpi-value">{totalLetters}</h3>
                    </div>
                </div>
                <div className="card records-kpi-card">
                    <div className="records-kpi-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                        <MailOpen size={22} />
                    </div>
                    <div>
                        <p className="records-kpi-label">Incoming Today</p>
                        <h3 className="records-kpi-value">{incomingToday}</h3>
                    </div>
                </div>
                <div className="card records-kpi-card">
                    <div className="records-kpi-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                        <Send size={22} />
                    </div>
                    <div>
                        <p className="records-kpi-label">Outgoing Today</p>
                        <h3 className="records-kpi-value">{outgoingToday}</h3>
                    </div>
                </div>
                <div className="card records-kpi-card">
                    <div className="records-kpi-icon" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <p className="records-kpi-label">Pending</p>
                        <h3 className="records-kpi-value">{pendingCount}</h3>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="records-filters">
                    <div className="search-box" style={{ flex: 2 }}>
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search subject, sender, reference..."
                            className="form-control"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select className="form-control records-filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="">All Types</option>
                        <option value="incoming">Incoming</option>
                        <option value="outgoing">Outgoing</option>
                    </select>
                    <select className="form-control records-filter-select" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                        <option value="">All Categories</option>
                        {LETTER_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="form-control records-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Acknowledged">Acknowledged</option>
                        <option value="Forwarded">Forwarded</option>
                        <option value="Filed">Filed</option>
                        <option value="Responded">Responded</option>
                    </select>
                </div>

                {/* Letters Table */}
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Subject</th>
                                <th className="hide-mobile">From / To</th>
                                <th className="hide-mobile">Ref. No.</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLetters.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-8 text-muted">
                                        {letters.length === 0 ? 'No letters recorded yet. Click "New Letter" to upload one.' : 'No letters match your filters.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredLetters.map(letter => (
                                    <tr key={letter.id} className="letter-row" onClick={() => navigate(`/records/view/${letter.id}`)}>
                                        <td className="text-sm text-muted">{format(new Date(letter.createdAt), 'dd MMM yyyy')}</td>
                                        <td>{getTypeBadge(letter.type)}</td>
                                        <td className="font-medium letter-subject">{letter.subject}</td>
                                        <td className="hide-mobile text-muted">{letter.type === 'incoming' ? letter.sender : letter.recipient}</td>
                                        <td className="hide-mobile font-mono text-sm">{letter.referenceNo || '—'}</td>
                                        <td><span className="badge badge-neutral">{letter.classification}</span></td>
                                        <td>{getStatusBadge(letter.status)}</td>
                                        <td>
                                            <button className="btn-icon" title="View"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/records/view/${letter.id}`); }}>
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RecordsDashboard;
