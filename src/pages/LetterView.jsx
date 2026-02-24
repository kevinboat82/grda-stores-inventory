import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Calendar, Tag, User, Mail, Hash, Clock, MessageSquare } from 'lucide-react';
import { useRecords, LETTER_STATUSES } from '../context/RecordsContext';
import { format } from 'date-fns';
import './Records.css';

const LetterView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { letters, updateLetter } = useRecords();
    const [updating, setUpdating] = useState(false);

    const letter = useMemo(() => letters.find(l => l.id === id), [letters, id]);

    if (!letter) {
        return (
            <div className="records-page">
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button className="btn-icon" onClick={() => navigate('/records')}><ArrowLeft size={20} /></button>
                        <h1 className="page-title">Letter Not Found</h1>
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <p>This letter could not be found or may have been deleted.</p>
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/records')}>Back to Dashboard</button>
                </div>
            </div>
        );
    }

    const handleStatusChange = async (newStatus) => {
        setUpdating(true);
        try {
            await updateLetter(letter.id, { status: newStatus });
        } catch (err) {
            console.error('Status update error:', err);
        } finally {
            setUpdating(false);
        }
    };

    const isPdf = letter.fileName?.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(letter.fileName || '');

    const statusClassMap = {
        'Pending': 'badge-warning',
        'Acknowledged': 'badge-info',
        'Forwarded': 'badge-primary',
        'Filed': 'badge-success',
        'Responded': 'badge-neutral',
    };

    return (
        <div className="records-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button className="btn-icon" onClick={() => navigate('/records')} title="Back">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">{letter.subject}</h1>
                        <p className="page-subtitle">
                            {letter.type === 'incoming' ? 'Incoming' : 'Outgoing'} · {letter.classification}
                        </p>
                    </div>
                </div>
            </div>

            <div className="letter-view-layout">
                {/* Details Card */}
                <div className="card letter-details-card">
                    <h3 className="letter-section-title">Letter Details</h3>

                    <div className="letter-detail-grid">
                        <div className="letter-detail-item">
                            <div className="detail-icon"><Mail size={16} /></div>
                            <div>
                                <p className="detail-label">Type</p>
                                <p className="detail-value">
                                    <span className={`badge ${letter.type === 'incoming' ? 'badge-success' : 'badge-warning'}`}>
                                        {letter.type === 'incoming' ? 'Incoming' : 'Outgoing'}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon"><Tag size={16} /></div>
                            <div>
                                <p className="detail-label">Classification</p>
                                <p className="detail-value">{letter.classification}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon"><User size={16} /></div>
                            <div>
                                <p className="detail-label">From</p>
                                <p className="detail-value">{letter.sender || '—'}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon"><User size={16} /></div>
                            <div>
                                <p className="detail-label">To</p>
                                <p className="detail-value">{letter.recipient || '—'}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon"><Hash size={16} /></div>
                            <div>
                                <p className="detail-label">Reference No.</p>
                                <p className="detail-value font-mono">{letter.referenceNo || '—'}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon"><Calendar size={16} /></div>
                            <div>
                                <p className="detail-label">Date on Letter</p>
                                <p className="detail-value">{letter.letterDate || '—'}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon"><Clock size={16} /></div>
                            <div>
                                <p className="detail-label">Recorded</p>
                                <p className="detail-value">{format(new Date(letter.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon"><User size={16} /></div>
                            <div>
                                <p className="detail-label">Recorded By</p>
                                <p className="detail-value">{letter.createdBy}</p>
                            </div>
                        </div>
                    </div>

                    {letter.notes && (
                        <div className="letter-notes">
                            <div className="detail-icon"><MessageSquare size={16} /></div>
                            <div>
                                <p className="detail-label">Notes</p>
                                <p className="detail-value">{letter.notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Status Update */}
                    <div className="letter-status-section">
                        <h3 className="letter-section-title">Status</h3>
                        <div className="status-buttons">
                            {LETTER_STATUSES.map(status => (
                                <button
                                    key={status}
                                    className={`btn status-btn ${letter.status === status ? statusClassMap[status] + ' active-status' : 'btn-outline'}`}
                                    onClick={() => handleStatusChange(status)}
                                    disabled={updating || letter.status === status}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Document Preview Card */}
                <div className="card letter-preview-card">
                    <h3 className="letter-section-title">
                        <FileText size={18} /> Document
                    </h3>

                    {letter.fileUrl ? (
                        <>
                            <div className="document-preview">
                                {isPdf ? (
                                    <iframe
                                        src={letter.fileUrl}
                                        className="pdf-viewer"
                                        title="Letter scan"
                                    />
                                ) : isImage ? (
                                    <img
                                        src={letter.fileUrl}
                                        alt="Letter scan"
                                        className="image-viewer"
                                    />
                                ) : (
                                    <div className="no-preview">
                                        <FileText size={48} />
                                        <p>Preview not available</p>
                                    </div>
                                )}
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <a href={letter.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                                    <Download size={16} /> Download
                                </a>
                                <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>{letter.fileName}</span>
                            </div>
                        </>
                    ) : (
                        <div className="no-preview">
                            <FileText size={48} />
                            <p>No document uploaded for this letter.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LetterView;
