import React from 'react';
import { Package, AlertCircle, TrendingUp, History } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { format } from 'date-fns';
import './Dashboard.css';

const Dashboard = () => {
    const { items, transactions } = useStore();

    const totalUniqueItems = items.length;
    const totalStockQuantity = items.reduce((sum, item) => sum + item.stock, 0);
    const lowStockCount = items.filter(item => item.stock <= item.reorderLevel).length;

    const recentTransactions = transactions.slice(0, 10);

    return (
        <div className="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Overview of current inventory and recent activity.</p>
                </div>
            </div>

            <div className="kpi-grid">
                <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--primary)' }}>
                        <Package size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Total Unique Items</p>
                        <h3 className="kpi-value">{totalUniqueItems}</h3>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Total Stock Quantity</p>
                        <h3 className="kpi-value">{totalStockQuantity} units</h3>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                        <AlertCircle size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Low Stock Alerts</p>
                        <h3 className="kpi-value">{lowStockCount}</h3>
                    </div>
                </div>
            </div>

            <div className="card table-card">
                <div className="card-header">
                    <div className="card-title-group">
                        <History size={20} className="card-icon" />
                        <h2 className="card-title">Recent Transactions</h2>
                    </div>
                </div>

                {recentTransactions.length === 0 ? (
                    <div className="empty-state">
                        <p>No recent transactions found.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Transaction ID</th>
                                    <th>Type</th>
                                    <th>Item</th>
                                    <th>Quantity</th>
                                    <th>User</th>
                                    <th>Reference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.map((txn) => {
                                    const item = items.find(i => i.id === txn.itemId);
                                    return (
                                        <tr key={txn.id}>
                                            <td>{format(new Date(txn.date), 'MMM d, yyyy HH:mm')}</td>
                                            <td className="font-mono text-sm">{txn.id}</td>
                                            <td>
                                                <span className={`badge ${txn.type === 'IN' ? 'badge-success' : 'badge-warning'}`}>
                                                    Stock {txn.type}
                                                </span>
                                            </td>
                                            <td>{item ? item.name : txn.itemId}</td>
                                            <td style={{ fontWeight: 500 }}>
                                                {txn.type === 'IN' ? '+' : '-'}{txn.quantity}
                                            </td>
                                            <td>{txn.user}</td>
                                            <td className="text-muted">{txn.reference || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
