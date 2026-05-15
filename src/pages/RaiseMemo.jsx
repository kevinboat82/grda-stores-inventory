import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, X } from 'lucide-react';
import { useRecords, LETTER_CLASSIFICATIONS } from '../context/RecordsContext';
import { useAuth } from '../context/AuthContext';
import { ROUTING_DEPARTMENTS, departmentKeyFromRole, departmentLabelFromId } from '../constants/departmentWorkflow';
import DigitalSignaturePad from '../components/DigitalSignaturePad';
import './Records.css';

const RaiseMemo = () => {
    const { raiseMemo } = useRecords();
    const { userProfile, updateProfile } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const myDept = departmentKeyFromRole(userProfile?.role);

    const [form, setForm] = useState({
        subject: '',
        sender: userProfile?.name || '',
        recipient: 'Chief Executive',
        referenceNo: '',
        letterDate: new Date().toISOString().slice(0, 10),
        classification: 'General',
        notes: '',
        minute: '',
        routeViaDepartmentId: '',
    });
    const [signature, setSignature] = useState(userProfile?.digitalSignature || '');
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleFile = (f) => {
        if (!f) return;
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(f.type)) {
            setError('Only PDF or image files are allowed.');
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setError('File must be under 10 MB.');
            return;
        }
        setError('');
        setFile(f);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            if (signature && signature !== userProfile?.digitalSignature) {
                await updateProfile({ digitalSignature: signature });
            }
            const id = await raiseMemo(
                { ...form, signatureDataUrl: signature },
                file,
                form.routeViaDepartmentId
            );
            navigate(`/records/view/${id}`);
        } catch (err) {
            setError(err.message || 'Failed to raise memo');
        } finally {
            setSubmitting(false);
        }
    };

    const backPath = myDept ? '/' : '/records';

    return (
        <div className="records-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button type="button" className="btn-icon" onClick={() => navigate(backPath)}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">Raise memo</h1>
                        <p className="page-subtitle">
                            Internal memo — route via another HOD to the CEO, or keep in your department queue
                        </p>
                    </div>
                </div>
            </div>

            <div className="card upload-card">
                {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="upload-form-grid">
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Subject *</label>
                            <input name="subject" className="form-control" required value={form.subject} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">From</label>
                            <input name="sender" className="form-control" value={form.sender} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">To</label>
                            <input name="recipient" className="form-control" value={form.recipient} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reference</label>
                            <input name="referenceNo" className="form-control" value={form.referenceNo} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" name="letterDate" className="form-control" value={form.letterDate} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Classification</label>
                            <select name="classification" className="form-control" value={form.classification} onChange={handleChange}>
                                {LETTER_CLASSIFICATIONS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Route via another HOD (optional)</label>
                            <select
                                name="routeViaDepartmentId"
                                className="form-control"
                                value={form.routeViaDepartmentId}
                                onChange={handleChange}
                            >
                                <option value="">No — {myDept ? `keep with ${departmentLabelFromId(myDept)} / send to CEO from your inbox` : 'send to Records / CEO per role'}</option>
                                {ROUTING_DEPARTMENTS.filter((d) => d.id !== myDept).map((d) => (
                                    <option key={d.id} value={d.id}>Via {d.label} HOD → then onward to CEO</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Minute on memo *</label>
                            <textarea
                                name="minute"
                                className="form-control"
                                rows={3}
                                required
                                placeholder="Official minute / instruction for this memo…"
                                value={form.minute}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <DigitalSignaturePad value={signature} onChange={setSignature} label="Your digital signature *" />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Memo document (PDF or image)</label>
                            {!file ? (
                                <div
                                    className="drop-zone"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Upload size={28} />
                                    <p className="drop-zone-text">Attach memo scan (optional)</p>
                                </div>
                            ) : (
                                <div className="file-preview">
                                    <FileText size={20} />
                                    <span>{file.name}</span>
                                    <button type="button" className="file-remove-btn" onClick={() => setFile(null)}>
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                style={{ display: 'none' }}
                                onChange={(e) => handleFile(e.target.files[0])}
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-submit" disabled={submitting || !signature}>
                        {submitting ? 'Submitting…' : 'Submit memo'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RaiseMemo;
