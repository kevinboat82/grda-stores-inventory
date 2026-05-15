import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { useRecords, CORRESPONDENCE_TYPES } from '../context/RecordsContext';
import { correspondenceTypeLabel } from '../constants/departmentWorkflow';
import { format } from 'date-fns';
import './Records.css';

/** Full correspondence register grouped by category — for CEO, PA/Secretary, and Admin */
const CorrespondenceArchive = () => {
    const { letters, dataLoading } = useRecords();
    const navigate = useNavigate();

    const byCategory = useMemo(() => {
        const map = {};
        CORRESPONDENCE_TYPES.forEach((t) => {
            map[t.id] = [];
        });
        letters.forEach((l) => {
            const key = l.correspondenceType || 'letter_outside_company';
            if (!map[key]) map[key] = [];
            map[key].push(l);
        });
        return map;
    }, [letters]);

    if (dataLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>Loading archive…</p>
            </div>
        );
    }

    return (
        <div className="records-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button type="button" className="btn-icon" onClick={() => navigate('/')} title="Back">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">Correspondence archive</h1>
                        <p className="page-subtitle">All letters and memos, grouped by category</p>
                    </div>
                </div>
            </div>

            {CORRESPONDENCE_TYPES.map((cat) => {
                const list = byCategory[cat.id] || [];
                return (
                    <div key={cat.id} className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 className="card-title" style={{ marginBottom: '1rem' }}>
                            {cat.label}
                            <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 500, marginLeft: '0.5rem' }}>
                                ({list.length})
                            </span>
                        </h2>
                        {list.length === 0 ? (
                            <p className="text-muted text-sm">No items in this category yet.</p>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Subject</th>
                                            <th>Routing</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((letter) => (
                                            <tr key={letter.id} className="letter-row" onClick={() => navigate(`/records/view/${letter.id}`)}>
                                                <td className="text-sm text-muted">
                                                    {format(new Date(letter.createdAt), 'dd MMM yyyy')}
                                                </td>
                                                <td className="font-medium letter-subject">{letter.subject}</td>
                                                <td className="text-sm text-muted">
                                                    {correspondenceTypeLabel(letter.correspondenceType)}
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default CorrespondenceArchive;
