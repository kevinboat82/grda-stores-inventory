import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Search, Eye, Building2 } from 'lucide-react';
import { useRecords, WORKFLOW_STEPS } from '../context/RecordsContext';
import { useAuth } from '../context/AuthContext';
import { departmentKeyFromRole, departmentLabelFromId, correspondenceTypeLabel } from '../constants/departmentWorkflow';
import { format } from 'date-fns';
import './Records.css';

const DepartmentInbox = () => {
    const { letters, dataLoading } = useRecords();
    const { userRole } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const deptKey = useMemo(() => departmentKeyFromRole(userRole), [userRole]);

    const inboxLetters = useMemo(() => {
        if (!deptKey) return [];
        return letters.filter((l) => {
            if (l.workflowStep !== WORKFLOW_STEPS.WITH_DEPARTMENT) return false;
            if (l.assignedDepartment === deptKey) return true;
            return Array.isArray(l.ccDepartments) && l.ccDepartments.includes(deptKey);
        });
    }, [letters, deptKey]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return inboxLetters;
        return inboxLetters.filter(
            (l) =>
                l.subject?.toLowerCase().includes(q) ||
                l.sender?.toLowerCase().includes(q) ||
                l.referenceNo?.toLowerCase().includes(q)
        );
    }, [inboxLetters, searchQuery]);

    if (dataLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>Loading department inbox…</p>
            </div>
        );
    }

    return (
        <div className="records-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Department inbox</h1>
                    <p className="page-subtitle">
                        <Building2 size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />
                        {departmentLabelFromId(deptKey)} — items sent to your department for review
                    </p>
                </div>
            </div>

            <div className="records-kpi-grid">
                <div className="card records-kpi-card">
                    <div className="records-kpi-icon" style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
                        <Inbox size={22} />
                    </div>
                    <div>
                        <p className="records-kpi-label">Awaiting action</p>
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
                                <th>Subject</th>
                                <th>Category</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-muted">
                                        {inboxLetters.length === 0
                                            ? 'Nothing is currently assigned to your department.'
                                            : 'No items match your search.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((letter) => (
                                    <tr
                                        key={letter.id}
                                        className="letter-row"
                                        onClick={() => navigate(`/records/view/${letter.id}`)}
                                    >
                                        <td className="text-sm text-muted">
                                            {format(new Date(letter.createdAt), 'dd MMM yyyy')}
                                        </td>
                                        <td className="font-medium letter-subject">{letter.subject}</td>
                                        <td className="text-sm">{correspondenceTypeLabel(letter.correspondenceType)}</td>
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DepartmentInbox;
