import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, ArrowRight, Loader } from 'lucide-react';
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
            {/* Left brand panel */}
            <div className="login-brand">
                <div className="brand-bg-pattern">
                    <div className="track-line"></div>
                    <div className="track-line"></div>
                    <div className="track-line"></div>
                </div>
                <div className="brand-content">
                    <img src="/grda-logo.png" className="brand-logo" alt="GRDA Logo" />
                    <h1 className="brand-title">GRDA</h1>
                    <p className="brand-tagline">Stores & Inventory<br />Management System</p>
                    <div className="brand-divider"></div>
                    <div className="brand-stats">
                        <div className="brand-stat">
                            <Package size={16} />
                            <span>Real-time Tracking</span>
                        </div>
                        <div className="brand-stat">
                            <Package size={16} />
                            <span>Stock Management</span>
                        </div>
                        <div className="brand-stat">
                            <Package size={16} />
                            <span>Audit Ready</span>
                        </div>
                    </div>
                </div>
                <p className="brand-footer">Ghana Railway Development Authority</p>
            </div>

            {/* Right form panel */}
            <div className="login-form-panel">
                <div className="login-card">
                    {/* Mobile only logo */}
                    <div className="login-mobile-logo">
                        <img src="/grda-logo.png" alt="GRDA" />
                    </div>

                    <div className="login-header">
                        <h2 className="login-title">Welcome back</h2>
                        <p className="login-subtitle">Sign in to your account to continue</p>
                    </div>

                    {error && (
                        <div className="login-error">
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="login-email" className="form-label">Email</label>
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
                                placeholder="Enter your password"
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
                            {loading ? (
                                <>
                                    <Loader size={16} className="spin" />
                                    Signing in…
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>Secure access · GRDA Internal</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
