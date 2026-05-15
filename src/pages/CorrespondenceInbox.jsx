import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Search, Eye, MailOpen, Send } from 'lucide-react';
import { useRecords, WORKFLOW_STEPS, WORKFLOW_STEP_LABELS } from '../context/RecordsContext';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import './Records.css';

const CorrespondenceInbox = () => {
    const { letters, dataLoading } = useRecords();
    const { userRole } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const inboxLetters = useMemo(() => {
        return letters.filter((l) => {
            const step = l.workflowStep || WORKFLOW_STEPS.WITH_RECORDS;
            if (userRole === 'ceo') return step === WORKFLOW_STEPS.WITH_CEO;
            if (userRole === 'ceo_office') return step === WORKFLOW_STEPS.WITH_CEO_OFFICE;
            if (userRole === 'admin') {
                return step === WORKFLOW_STEPS.WITH_CEO_OFFICE || step === WORKFLOW_STEPS.WITH_CEO;
            }
            return false;
        });
    }, [letters, userRole]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return inboxLetters;
        return inboxLetters.filter(
            (l) =>
                l.subject?.toLowerCase().includes(q) ||
                l.sender?.toLowerCase().includes(q) ||
                l.recipient?.toLowerCase().includes(q) ||
                l.referenceNo?.toLowerCase().includes(q)
        );
    }, [inboxLetters, searchQuery]);

    const getTypeBadge = (type) => {
        if (type === 'incoming') {
            return (
                <span className="badge badge-success">
                    <MailOpen size={12} /> Incoming
                </span>
            );
        }
        return (
            <span className="badge badge-warning">
                <Send size={12} /> Outgoing
            </span>
        );
    };

    const workflowBadgeClass = (step) => {
        if (step === WORKFLOW_STEPS.WITH_CEO_OFFICE) return 'badge-primary';
        if (step === WORKFLOW_STEPS.WITH_CEO) return 'badge-warning';
        return 'badge-neutral';
    };

    if (dataLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading correspondence…</p>
            </div>
        );
    }

    return (
        <div className="records-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Correspondence Inbox</h1>
                    <p className="page-subtitle">
                        {userRole === 'ceo'
                            ? 'Letters currently on your desk for minuting and routing.'
                            : "Letters forwarded by Records for PA / Secretary review before they go to the CEO."}
                    </p>
                </div>
            </div>

            <div className="records-kpi-grid">
                <div className="card records-kpi-card">
                    <div className="records-kpi-icon" style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
                        <Inbox size={22} />
                    </div>
                    <div>
                        <p className="records-kpi-label">Inbox (action needed)</p>
                        <h3 className="records-kpi-value">{inboxLetters.length}</h3>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="records-filters">
                    <div className="search-box" style={{ flex: 1 }}>
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search subject, sender, reference…"
                            className="form-control"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Subject</th>
                                <th className="hide-mobile">From / To</th>
                                <th>Workflow</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-muted">
                                        {inboxLetters.length === 0
                                            ? 'No letters are waiting with the CEO office or the CEO.'
                                            : 'No letters match your search.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((letter) => {
                                    const step = letter.workflowStep || WORKFLOW_STEPS.WITH_RECORDS;
                                    return (
                                        <tr
                                            key={letter.id}
                                            className="letter-row"
                                            onClick={() => navigate(`/records/view/${letter.id}`)}
                                        >
                                            <td className="text-sm text-muted">
                                                {format(new Date(letter.createdAt), 'dd MMM yyyy')}
                                            </td>
                                            <td>{getTypeBadge(letter.type)}</td>
                                            <td className="font-medium letter-subject">{letter.subject}</td>
                                            <td className="hide-mobile text-muted">
                                                {letter.type === 'incoming' ? letter.sender : letter.recipient}
                                            </td>
                                            <td>
                                                <span className={`badge ${workflowBadgeClass(step)}`}>
                                                    {WORKFLOW_STEP_LABELS[step] || step}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-icon"
                                                    title="Open"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/records/view/${letter.id}`);
                                                    }}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CorrespondenceInbox;
