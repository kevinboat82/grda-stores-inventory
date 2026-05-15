import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, BarChart3, LogOut, Menu, X, FileText, Upload, Users, ClipboardList, UserCog, Archive, Inbox, PenLine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENT_ROLE_IDS, ROUTING_DEPARTMENTS } from '../constants/departmentWorkflow';
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
    const isExecutiveCorrespondence = userRole === 'ceo_office' || userRole === 'ceo';
    const isDepartmentUser = DEPARTMENT_ROLE_IDS.includes(userRole);
    const isCorrespondenceExperience = isExecutiveCorrespondence || isDepartmentUser;
    const needsAccountRole = !userRole || userRole === 'none';

    const getRoleLabel = (role) => {
        const deptRow = ROUTING_DEPARTMENTS.find((d) => d.role === role);
        if (deptRow) return `HOD (${deptRow.label})`;
        switch (role) {
            case 'admin': return 'HOD (Admin)';
            case 'store_manager': return 'Store Manager';
            case 'audit_unit': return 'Audit Unit';
            case 'records_unit': return 'Records Unit';
            case 'ceo_office': return "CEO's Office (PA / Secretary)";
            case 'ceo': return 'Chief Executive';
            default: return role;
        }
    };

    return (
        <>
            {/* ===== MOBILE TOP BAR ===== */}
            <header className="mobile-topbar">
                <button className="mobile-topbar-menu" onClick={() => setIsOpen(true)} aria-label="Open menu">
                    <Menu size={22} />
                </button>
                <div className="mobile-topbar-brand">
                    <img src="/grda-logo.png" className="mobile-topbar-logo" alt="GRDA" />
                    <span className="mobile-topbar-title">
                        {isCorrespondenceExperience ? 'GRDA Correspondence' : 'GRDA Stores'}
                    </span>
                </div>
                <div className="mobile-topbar-avatar">
                    {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : '?'}
                </div>
            </header>

            {/* Overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <img src="/grda-logo.png" className="logo-icon-img" alt="GRDA Logo" />
                    <div style={{ flex: 1 }}>
                        <h1 className="logo-title">GRDA Inventory System</h1>
                        <p className="logo-subtitle">
                            {isExecutiveCorrespondence
                                ? 'Executive correspondence'
                                : isDepartmentUser
                                  ? 'Department routing (HOD)'
                                  : isRecordsUser
                                    ? 'Records Management'
                                    : 'Inventory System'}
                        </p>
                    </div>
                    <button className="sidebar-close-btn" onClick={() => setIsOpen(false)} aria-label="Close menu">
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {needsAccountRole ? (
                        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                            <UserCog size={20} />
                            <span>Account &amp; access</span>
                        </NavLink>
                    ) : isAuditUser ? (
                        /* Audit Unit */
                        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                            <BarChart3 size={20} />
                            <span>Audit Summary</span>
                        </NavLink>
                    ) : isExecutiveCorrespondence ? (
                        <>
                            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                                <FileText size={20} />
                                <span>Correspondence Inbox</span>
                            </NavLink>
                            <NavLink to="/correspondence/archive" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <Archive size={20} />
                                <span>Correspondence archive</span>
                            </NavLink>
                            <NavLink to="/correspondence/raise-memo" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <PenLine size={20} />
                                <span>Raise memo</span>
                            </NavLink>
                        </>
                    ) : isDepartmentUser ? (
                        <>
                            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                                <Inbox size={20} />
                                <span>Department inbox</span>
                            </NavLink>
                            <NavLink to="/correspondence/raise-memo" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <PenLine size={20} />
                                <span>Raise memo</span>
                            </NavLink>
                        </>
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
                            <NavLink to="/correspondence/raise-memo" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                <PenLine size={20} />
                                <span>Raise memo</span>
                            </NavLink>
                        </>
                    ) : (
                        /* Admin / Store Manager */
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
                                    <NavLink to="/correspondence/archive" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                        <Archive size={20} />
                                        <span>Correspondence archive</span>
                                    </NavLink>
                                    <NavLink to="/activity-log" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                                        <ClipboardList size={20} />
                                        <span>Activity Log</span>
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
