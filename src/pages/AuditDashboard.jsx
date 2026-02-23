import React from 'react';
import { Package, ArrowDownToLine, ArrowUpFromLine, BarChart3 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const AuditDashboard = () => {
    const { items, transactions } = useStore();
    const { userProfile } = useAuth();

    const totalStockQuantity = items.reduce((sum, item) => sum + Number(item.stock), 0);

    const totalReceived = transactions
        .filter(t => t.type === 'IN')
        .reduce((sum, t) => sum + Number(t.quantity), 0);

    const totalIssued = transactions
        .filter(t => t.type === 'OUT')
        .reduce((sum, t) => sum + Number(t.quantity), 0);

    const totalUniqueItems = items.length;

    return (
        <div className="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Audit Summary</h1>
                    <p className="page-subtitle">
                        Read-only overview for the Audit Unit. Welcome, {userProfile?.name || 'Auditor'}.
                    </p>
                </div>
                <div className="badge badge-neutral" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                    <BarChart3 size={14} style={{ marginRight: '0.3rem' }} />
                    View Only
                </div>
            </div>

            <div className="kpi-grid">
                <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--primary)' }}>
                        <Package size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Unique Items in Stock</p>
                        <h3 className="kpi-value">{totalUniqueItems}</h3>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                        <ArrowDownToLine size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Total Items Received</p>
                        <h3 className="kpi-value">{totalReceived} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400 }}>units</span></h3>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                        <ArrowUpFromLine size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Total Items Issued Out</p>
                        <h3 className="kpi-value">{totalIssued} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400 }}>units</span></h3>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                        <Package size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Total Stock Quantity</p>
                        <h3 className="kpi-value">{totalStockQuantity} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400 }}>units</span></h3>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <BarChart3 size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                    <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
                        This is a read-only audit view. For detailed inventory management, item lists,
                        and transaction history, please contact the Store Manager.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuditDashboard;
