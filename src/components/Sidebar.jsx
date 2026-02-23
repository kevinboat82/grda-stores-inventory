import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { userProfile, userRole, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const isAuditUser = userRole === 'audit_unit';

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src="/grda-logo.png" className="logo-icon-img" alt="GRDA Logo" />
                <div>
                    <h1 className="logo-title">GRDA Stores</h1>
                    <p className="logo-subtitle">Inventory System</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                {isAuditUser ? (
                    /* Audit Unit only sees Audit Summary */
                    <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                        <BarChart3 size={20} />
                        <span>Audit Summary</span>
                    </NavLink>
                ) : (
                    /* Admin / Storekeeper see full navigation */
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
                        <p className="user-role">{userProfile?.role === 'admin' ? 'Store Manager' : userProfile?.role === 'audit_unit' ? 'Audit Unit' : 'Storekeeper'}</p>
                    </div>
                </div>

                <button className="logout-btn" onClick={handleLogout} title="Sign Out">
                    <LogOut size={18} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
