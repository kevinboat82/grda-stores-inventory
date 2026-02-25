import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, BarChart3, LogOut, Menu, X, FileText, Upload, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { userProfile, userRole, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // Close sidebar when resizing to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) setIsOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const isAuditUser = userRole === 'audit_unit';
    const isRecordsUser = userRole === 'records_unit';

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin': return 'Store Manager';
            case 'audit_unit': return 'Audit Unit';
            case 'records_unit': return 'Records Unit';
            case 'storekeeper': return 'Storekeeper';
            default: return role;
        }
    };

    return (
        <>
            {/* Mobile hamburger button */}
            <button className="mobile-menu-btn" onClick={() => setIsOpen(true)} aria-label="Open menu">
                <Menu size={24} />
            </button>

            {/* Overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <img src="/grda-logo.png" className="logo-icon-img" alt="GRDA Logo" />
                    <div style={{ flex: 1 }}>
                        <h1 className="logo-title">GRDA Inventory System</h1>
                        <p className="logo-subtitle">
                            {isRecordsUser ? 'Records Management' : 'Inventory System'}
                        </p>
                    </div>
                    <button className="sidebar-close-btn" onClick={() => setIsOpen(false)} aria-label="Close menu">
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {isAuditUser ? (
                        /* Audit Unit */
                        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                            <BarChart3 size={20} />
                            <span>Audit Summary</span>
                        </NavLink>
                    ) : isRecordsUser ? (
                        /* Records Unit */
                        <>
                            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                                <FileText size={20} />
                                <span>Records Dashboard</span>
                            </NavLink>
                            <NavLink to="/records/upload" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <Upload size={20} />
                                <span>Upload Letter</span>
                            </NavLink>
                        </>
                    ) : (
                        /* Admin / Storekeeper */
                        <>
                            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                                <LayoutDashboard size={20} />
                                <span>Dashboard</span>
                            </NavLink>
                            <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <Package size={20} />
                                <span>Inventory Master</span>
                            </NavLink>
                            <NavLink to="/receive" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <ArrowDownToLine size={20} />
                                <span>Receive Stock (In)</span>
                            </NavLink>
                            <NavLink to="/issue" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <ArrowUpFromLine size={20} />
                                <span>Issue Stock (Out)</span>
                            </NavLink>
                            <NavLink to="/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <AlertTriangle size={20} />
                                <span>Low Stock Alerts</span>
                            </NavLink>

                            {/* Admin specific links */}
                            {userRole === 'admin' && (
                                <>
                                    <div className="nav-divider"></div>
                                    <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                        <Users size={20} />
                                        <span>User Management</span>
                                    </NavLink>
                                    <NavLink to="/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                        <FileText size={20} />
                                        <span>Records Module</span>
                                    </NavLink>
                                </>
                            )}
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="user-avatar">
                            {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="user-info">
                            <p className="user-name">{userProfile?.name || 'User'}</p>
                            <p className="user-role">{getRoleLabel(userProfile?.role)}</p>
                        </div>
                    </div>

                    <button className="logout-btn" onClick={handleLogout} title="Sign Out">
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
