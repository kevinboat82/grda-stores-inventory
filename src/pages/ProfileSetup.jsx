import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Briefcase, CheckCircle2 } from 'lucide-react';
import './Login.css';

const POSITIONS = [
    'HOD (Admin)',
    'Store Manager',
    'Audit',
    'Records',
];

const ProfileSetup = () => {
    const { userProfile, updateProfile } = useAuth();
    const [name, setName] = useState(userProfile?.name || '');
    const [position, setPosition] = useState(userProfile?.position || '');
    const [customPosition, setCustomPosition] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isCustom = position === '__custom__';
    const finalPosition = isCustom ? customPosition : position;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Please enter your full name.');
            return;
        }
        if (!finalPosition.trim()) {
            setError('Please select or enter your position.');
            return;
        }

        setSaving(true);
        try {
            await updateProfile({
                name: name.trim(),
                position: finalPosition.trim(),
            });
        } catch (err) {
            console.error('Profile update error:', err);
            setError('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: '480px' }}>
                <div className="login-header">
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1a4d2e, #2d8a5e)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                    }}>
                        <User size={32} color="white" />
                    </div>
                    <h1 className="login-title" style={{ fontSize: '1.4rem' }}>Complete Your Profile</h1>
                    <p className="login-subtitle">Set your name and position before continuing</p>
                </div>

                {error && (
                    <div className="login-error">
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="profile-name" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={15} /> Full Name
                        </label>
                        <input
                            id="profile-name"
                            type="text"
                            className="form-control"
                            placeholder="e.g. John Mensah"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="profile-position" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Briefcase size={15} /> Position / Title
                        </label>
                        <select
                            id="profile-position"
                            className="form-control"
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            required
                        >
                            <option value="" disabled>Select your position...</option>
                            {POSITIONS.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                            <option value="__custom__">Other (type below)</option>
                        </select>
                    </div>

                    {isCustom && (
                        <div className="form-group" style={{ marginTop: '-0.5rem' }}>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter your position title..."
                                value={customPosition}
                                onChange={(e) => setCustomPosition(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        background: '#f0f7f2',
                        border: '1px solid #c8e6d0',
                        fontSize: '0.8rem',
                        color: '#2d6a3f',
                        lineHeight: 1.5,
                        marginBottom: '0.5rem',
                    }}>
                        <strong>Your email:</strong> {userProfile?.email}<br />
                        <strong>Role:</strong> {userProfile?.role === 'admin' ? 'HOD (Admin)' : userProfile?.role === 'store_manager' ? 'Store Manager' : userProfile?.role === 'audit_unit' ? 'Audit Unit' : userProfile?.role === 'records_unit' ? 'Records Unit' : userProfile?.role}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary login-btn"
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        {saving ? 'Saving…' : (<><CheckCircle2 size={18} /> Save & Continue</>)}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Ghana Railway Development Authority</p>
                </div>
            </div>
        </div>
    );
};

export default ProfileSetup;
