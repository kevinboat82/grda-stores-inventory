import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowLeft, X } from 'lucide-react';
import { useRecords, LETTER_CLASSIFICATIONS } from '../context/RecordsContext';
import './Records.css';

const LetterUpload = () => {
    const { addLetter } = useRecords();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        type: 'incoming',
        subject: '',
        sender: '',
        recipient: '',
        referenceNo: '',
        letterDate: '',
        classification: '',
        notes: '',
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) validateAndSetFile(file);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) validateAndSetFile(file);
    };

    const validateAndSetFile = (file) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) {
            setErrorMsg('Only PDF, JPEG, PNG, and WebP files are allowed.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setErrorMsg('File size must be less than 10 MB.');
            return;
        }
        setErrorMsg('');
        setSelectedFile(file);
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');

        if (!formData.subject.trim()) {
            setErrorMsg('Please enter a subject.');
            return;
        }
        if (!formData.classification) {
            setErrorMsg('Please select a classification.');
            return;
        }

        setUploading(true);
        try {
            await addLetter(formData, selectedFile);
            setSuccessMsg('Letter recorded successfully!');
            setFormData({
                type: 'incoming', subject: '', sender: '', recipient: '',
                referenceNo: '', letterDate: '', classification: '', notes: '',
            });
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => navigate('/records'), 2000);
        } catch (err) {
            console.error('Upload error:', err);
            setErrorMsg('Failed to record letter. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="records-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button className="btn-icon" onClick={() => navigate('/records')} title="Back">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">Upload Letter</h1>
                        <p className="page-subtitle">Record incoming or outgoing correspondence</p>
                    </div>
                </div>
            </div>

            <div className="card upload-card">
                {successMsg && (
                    <div className="alert alert-success" style={{ margin: '0 0 1.5rem' }}>
                        <CheckCircle2 size={18} />
                        {successMsg}
                    </div>
                )}

                {errorMsg && (
                    <div className="alert alert-danger" style={{ margin: '0 0 1.5rem' }}>
                        <AlertTriangle size={18} />
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Type toggle */}
                    <div className="type-toggle">
                        <button
                            type="button"
                            className={`type-btn ${formData.type === 'incoming' ? 'active incoming' : ''}`}
                            onClick={() => setFormData(prev => ({ ...prev, type: 'incoming' }))}
                        >
                            <Upload size={16} /> Incoming
                        </button>
                        <button
                            type="button"
                            className={`type-btn ${formData.type === 'outgoing' ? 'active outgoing' : ''}`}
                            onClick={() => setFormData(prev => ({ ...prev, type: 'outgoing' }))}
                        >
                            <Upload size={16} style={{ transform: 'rotate(180deg)' }} /> Outgoing
                        </button>
                    </div>

                    <div className="upload-form-grid">
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Subject / Title *</label>
                            <input
                                required type="text" name="subject" className="form-control"
                                placeholder="e.g. Request for Quarterly Budget Review"
                                value={formData.subject} onChange={handleInputChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                {formData.type === 'incoming' ? 'From (Sender)' : 'From (GRDA Office)'}
                            </label>
                            <input
                                type="text" name="sender" className="form-control"
                                placeholder={formData.type === 'incoming' ? 'e.g. Ministry of Transport' : 'e.g. CEO Office'}
                                value={formData.sender} onChange={handleInputChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                {formData.type === 'incoming' ? 'To (GRDA Office)' : 'To (Recipient)'}
                            </label>
                            <input
                                type="text" name="recipient" className="form-control"
                                placeholder={formData.type === 'incoming' ? 'e.g. Chief Executive' : 'e.g. Ghana Ports Authority'}
                                value={formData.recipient} onChange={handleInputChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Reference Number</label>
                            <input
                                type="text" name="referenceNo" className="form-control"
                                placeholder="e.g. GRDA/CEO/2026/045"
                                value={formData.referenceNo} onChange={handleInputChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Date on Letter</label>
                            <input
                                type="date" name="letterDate" className="form-control"
                                value={formData.letterDate} onChange={handleInputChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Classification *</label>
                            <select
                                required name="classification" className="form-control"
                                value={formData.classification} onChange={handleInputChange}
                            >
                                <option value="" disabled>Select category...</option>
                                {LETTER_CLASSIFICATIONS.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <input type="text" className="form-control" value="Pending" disabled />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Notes (Optional)</label>
                            <textarea
                                name="notes" className="form-control" rows="3"
                                placeholder="Additional details or instructions..."
                                value={formData.notes} onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                        <label className="form-label">Scanned Document (PDF or Image)</label>

                        {!selectedFile ? (
                            <div
                                className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={32} className="drop-zone-icon" />
                                <p className="drop-zone-text">Drag & drop your scan here, or <span>click to browse</span></p>
                                <p className="drop-zone-hint">PDF, JPEG, PNG, WebP — Max 10 MB</p>
                            </div>
                        ) : (
                            <div className="file-preview">
                                <FileText size={20} className="file-preview-icon" />
                                <div className="file-preview-info">
                                    <p className="file-preview-name">{selectedFile.name}</p>
                                    <p className="file-preview-size">{formatFileSize(selectedFile.size)}</p>
                                </div>
                                <button type="button" className="file-remove-btn" onClick={removeFile}>
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-submit"
                        disabled={uploading}
                    >
                        {uploading ? 'Uploading & Saving...' : 'Record Letter'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LetterUpload;
