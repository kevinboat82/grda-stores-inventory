import React, { useState } from 'react';
import { Package, ArrowDownToLine, ArrowUpFromLine, BarChart3, Printer, History, Box } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { printAuditReport } from '../utils/printVoucher';
import { format } from 'date-fns';
import './Dashboard.css';

const AuditDashboard = () => {
    const { items, transactions } = useStore();
    const { userProfile } = useAuth();

    // Pagination state for transactions (optional, but good if list is huge)
    const [txnLimit, setTxnLimit] = useState(20);

    const validItems = items;
    const sortedTxns = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentTxns = sortedTxns.slice(0, txnLimit);

    const totalStockQuantity = validItems.reduce((sum, item) => sum + (Number(item.stock) || 0), 0);
    const totalReceived = transactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
    const totalIssued = transactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
    const totalUniqueItems = validItems.length;

    const handlePrint = () => {
        printAuditReport({ items: validItems, transactions, userProfile });
    };

    return (
        <div className="dashboard">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title">Audit Summary</h1>
                    <p className="page-subtitle">
                        Read-only overview for the Audit Unit. Welcome, {userProfile?.name || 'Auditor'}.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="badge badge-neutral" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                        <BarChart3 size={14} style={{ marginRight: '0.3rem' }} />
                        View Only
                    </div>
                    <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Printer size={16} />
                        Print Audit Report
                    </button>
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
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                        <Package size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Total Stock Quantity</p>
                        <h3 className="kpi-value">{totalStockQuantity} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400 }}>units</span></h3>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                        <ArrowDownToLine size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Lifetime Items Received</p>
                        <h3 className="kpi-value">{totalReceived}</h3>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                        <ArrowUpFromLine size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Lifetime Items Issued</p>
                        <h3 className="kpi-value">{totalIssued}</h3>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

                {/* Current Stock Table */}
                <div className="card table-card">
                    <div className="card-header">
                        <div className="card-title-group">
                            <Box size={20} className="card-icon" />
                            <h2 className="card-title">Current Stock Inventory</h2>
                        </div>
                    </div>

                    <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="table">
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10 }}>
                                <tr>
                                    <th>Item Name</th>
                                    <th>SKU</th>
                                    <th>Category</th>
                                    <th>Unit</th>
                                    <th style={{ textAlign: 'right' }}>Stock Qty</th>
                                    <th style={{ textAlign: 'center' }}>Reorder Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {validItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-8 text-muted">No items in inventory.</td>
                                    </tr>
                                ) : (
                                    validItems.map(item => (
                                        <tr key={item.id}>
                                            <td className="font-medium">{item.name}</td>
                                            <td className="font-mono text-sm text-muted">{item.sku}</td>
                                            <td><span className="badge badge-neutral">{item.category}</span></td>
                                            <td>{item.unit}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.stock}</td>
                                            <td style={{ textAlign: 'center' }}>{item.reorderLevel}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Transactions Table */}
                <div className="card table-card" style={{ marginBottom: '2rem' }}>
                    <div className="card-header">
                        <div className="card-title-group">
                            <History size={20} className="card-icon" />
                            <h2 className="card-title">Transaction History</h2>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Ref / ID</th>
                                    <th>Type</th>
                                    <th>Item</th>
                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                    <th>User</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTxns.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-8 text-muted">No transactions found.</td>
                                    </tr>
                                ) : (
                                    recentTxns.map((txn) => {
                                        const item = items.find(i => i.id === txn.itemId);
                                        return (
                                            <tr key={txn.id}>
                                                <td>{format(new Date(txn.date), 'MMM d, yyyy HH:mm')}</td>
                                                <td>
                                                    <div className="text-sm">{txn.reference || '—'}</div>
                                                    <div className="font-mono text-xs text-muted" title="Transaction ID">{txn.id}</div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${txn.type === 'IN' ? 'badge-success' : 'badge-warning'}`}>
                                                        Stock {txn.type}
                                                    </span>
                                                </td>
                                                <td className="font-medium">{item ? item.name : txn.itemId}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: txn.type === 'IN' ? 'var(--success)' : 'inherit' }}>
                                                    {txn.type === 'IN' ? '+' : '-'}{txn.quantity}
                                                </td>
                                                <td>{txn.user}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {transactions.length > txnLimit && (
                            <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
                                <button className="btn btn-outline" onClick={() => setTxnLimit(prev => prev + 20)}>
                                    Load More Transactions
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AuditDashboard;
