import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/', { replace: true });
        } catch (err) {
            console.error('Login error:', err);
            switch (err.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('Invalid email or password');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many failed attempts. Please try again later.');
                    break;
                default:
                    setError('Failed to sign in. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <img src="/grda-logo.png" className="login-logo" alt="GRDA Logo" />
                    <h1 className="login-title">GRDA Inventory System</h1>
                    <p className="login-subtitle">Inventory Management System</p>
                </div>

                {error && (
                    <div className="login-error">
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="login-email" className="form-label">Email Address</label>
                        <input
                            id="login-email"
                            type="email"
                            className="form-control"
                            placeholder="you@grda.gov.gh"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="login-password" className="form-label">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            className="form-control"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary login-btn"
                        disabled={loading}
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Ghana Railway Development Authority</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
