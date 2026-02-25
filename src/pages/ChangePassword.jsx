import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import './Login.css';

const ChangePassword = () => {
    const { user, changePassword } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSaving(true);
        try {
            await changePassword(newPassword);
        } catch (err) {
            console.error('Password change error:', err);
            setError(err.message || 'Failed to update password. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: '440px' }}>
                <div className="login-header">
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #b45309, #d97706)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                    }}>
                        <Lock size={32} color="white" />
                    </div>
                    <h1 className="login-title" style={{ fontSize: '1.4rem' }}>Set Your Password</h1>
                    <p className="login-subtitle">You're using a temporary password. Please create a new one to continue.</p>
                </div>

                {error && (
                    <div className="login-error">
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="new-password" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Lock size={15} /> New Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="new-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-control"
                                placeholder="Enter new password (min. 6 chars)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoFocus
                                required
                                minLength="6"
                                style={{ paddingRight: '2.5rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirm-password" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Lock size={15} /> Confirm Password
                        </label>
                        <input
                            id="confirm-password"
                            type={showPassword ? 'text' : 'password'}
                            className="form-control"
                            placeholder="Re-enter your new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength="6"
                        />
                    </div>

                    {newPassword && confirmPassword && newPassword === confirmPassword && (
                        <div style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.375rem',
                            background: '#ecfdf5',
                            color: '#059669',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            marginBottom: '0.5rem',
                        }}>
                            <CheckCircle2 size={14} /> Passwords match
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary login-btn"
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        {saving ? 'Updating…' : (<><Lock size={18} /> Set Password & Continue</>)}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Ghana Railway Development Authority</p>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
