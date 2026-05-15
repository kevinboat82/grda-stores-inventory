import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserX, Copy, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const AccountNeedsRole = () => {
    const { user, userProfile, logout } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const copyUid = () => {
        if (user?.uid) {
            navigator.clipboard.writeText(user.uid);
        }
    };

    return (
        <div className="records-page" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: 'var(--warning-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--warning)',
                        }}
                    >
                        <UserX size={24} />
                    </div>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
                            Account needs a role
                        </h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>
                            You are signed in, but this app does not have a valid access role for your user.
                        </p>
                    </div>
                </div>

                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
                    This usually means either there is no Firestore profile at <code>users/&lt;your uid&gt;</code>, or the{' '}
                    <code>role</code> field is missing or not one of the supported values (for example it must be exactly{' '}
                    <code>admin</code>, not &quot;Admin&quot; or &quot;HOD&quot;).
                </p>

                <div
                    style={{
                        background: 'var(--surface-alt, #f4f4f5)',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        marginBottom: '1.25rem',
                    }}
                >
                    <p style={{ margin: '0 0 0.5rem' }}>
                        <strong>Signed in as:</strong> {userProfile?.email || user?.email || '—'}
                    </p>
                    <p style={{ margin: '0 0 0.5rem' }}>
                        <strong>Role seen by app:</strong> <code>{userProfile?.role || 'none'}</code>
                    </p>
                    <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong>User ID:</strong> <code style={{ wordBreak: 'break-all' }}>{user?.uid}</code>
                        <button type="button" className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }} onClick={copyUid} title="Copy UID">
                            <Copy size={14} /> Copy
                        </button>
                    </p>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    In Firebase Console → Firestore, create or edit the document <code>users/{user?.uid}</code> and set{' '}
                    <code>role</code> to <code>admin</code> (string) for a full administrator, plus <code>name</code>,{' '}
                    <code>email</code>, <code>isActive</code> (true), and <code>mustChangePassword</code> (boolean) as needed.
                    Then use <strong>Reload</strong> below or sign out and sign in again.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <button type="button" className="btn btn-primary" onClick={() => window.location.assign('/')}>
                        Reload app
                    </button>
                    <button type="button" className="btn btn-outline" onClick={handleSignOut}>
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountNeedsRole;
