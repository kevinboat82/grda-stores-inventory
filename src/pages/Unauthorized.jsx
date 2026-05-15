import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldOff, Home, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
    const navigate = useNavigate();
    const { userRole, userProfile, logout } = useAuth();

    const handleSignOut = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const noRole = !userRole || userRole === 'none';
    const roleLabel = userRole || 'unknown';

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center',
                padding: '2rem',
            }}
        >
            <div
                style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--danger-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                }}
            >
                <ShieldOff size={36} color="var(--danger)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Access denied</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', maxWidth: '440px', lineHeight: 1.55 }}>
                {noRole ? (
                    <>
                        Your account does not have an app role yet, or the role in Firestore is not recognized. Open the{' '}
                        <strong>home page</strong> for setup instructions, or sign out and use another account.
                    </>
                ) : (
                    <>
                        This page requires different permissions. You are signed in as <strong>{roleLabel}</strong>
                        {userProfile?.email ? (
                            <>
                                {' '}
                                (<span style={{ wordBreak: 'break-all' }}>{userProfile.email}</span>)
                            </>
                        ) : null}
                        .
                    </>
                )}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                <Link to="/" className="btn btn-primary">
                    <Home size={16} /> Go to home
                </Link>
                <button type="button" className="btn btn-outline" onClick={handleSignOut}>
                    <LogOut size={16} /> Sign out
                </button>
            </div>
        </div>
    );
};

export default Unauthorized;
