import React, { useState, useMemo } from 'react';
import { Package, AlertCircle, TrendingUp, TrendingDown, History, Download, Calendar } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { exportToCsv } from '../utils/exportCsv';
import { format, subDays, startOfWeek, startOfMonth, subMonths } from 'date-fns';
import './Dashboard.css';

const DATE_RANGES = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'Last 3 Months' },
    { id: 'all', label: 'All Time' },
];

const Dashboard = () => {
    const { items, transactions } = useStore();
    const [dateRange, setDateRange] = useState('all');

    // Filter transactions by date range
    const filteredTransactions = useMemo(() => {
        if (dateRange === 'all') return transactions;

        const now = new Date();
        let startDate;

        switch (dateRange) {
            case 'week':
                startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
                break;
            case 'month':
                startDate = startOfMonth(now);
                break;
            case 'quarter':
                startDate = subMonths(now, 3);
                break;
            default:
                return transactions;
        }

        return transactions.filter(txn => {
            if (!txn.date) return false;
            return new Date(txn.date) >= startDate;
        });
    }, [transactions, dateRange]);

    // KPIs
    const totalUniqueItems = items.length;
    const totalStockQuantity = items.reduce((sum, item) => sum + Number(item.stock || 0), 0);
    const lowStockCount = items.filter(item => Number(item.stock || 0) <= Number(item.reorderLevel || 0)).length;

    const stockInCount = filteredTransactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + Number(t.quantity || 0), 0);
    const stockOutCount = filteredTransactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + Number(t.quantity || 0), 0);

    const recentTransactions = filteredTransactions.slice(0, 15);

    const handleExportTransactions = () => {
        exportToCsv('transaction_history',
            ['Date', 'Type', 'Item', 'Quantity', 'User', 'Reference'],
            filteredTransactions.map(txn => {
                const item = items.find(i => i.id === txn.itemId);
                return [
                    txn.date ? format(new Date(txn.date), 'yyyy-MM-dd HH:mm') : '',
                    txn.type === 'IN' ? 'Stock In' : 'Stock Out',
                    item ? item.name : txn.itemId,
                    txn.quantity,
                    txn.user || '',
                    txn.reference || ''
                ];
            })
        );
    };

    return (
        <div className="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Overview of current inventory and recent activity.</p>
                </div>
                <div className="date-range-selector">
                    <Calendar size={16} className="text-muted" />
                    {DATE_RANGES.map(range => (
                        <button
                            key={range.id}
                            className={`date-range-btn ${dateRange === range.id ? 'active' : ''}`}
                            onClick={() => setDateRange(range.id)}
                        >
                            {range.label}
                        </button>
                    ))}
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
                        <p className="kpi-label">Stock Received</p>
                        <h3 className="kpi-value" style={{ color: 'var(--success)' }}>+{stockInCount}</h3>
                        <p className="kpi-sub">{dateRange === 'all' ? 'all time' : DATE_RANGES.find(r => r.id === dateRange)?.label.toLowerCase()}</p>
                    </div>
                </div>

                <div className="card kpi-card">
                    <div className="kpi-icon-wrapper" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                        <TrendingDown size={24} />
                    </div>
                    <div className="kpi-info">
                        <p className="kpi-label">Stock Issued</p>
                        <h3 className="kpi-value" style={{ color: 'var(--warning)' }}>-{stockOutCount}</h3>
                        <p className="kpi-sub">{dateRange === 'all' ? 'all time' : DATE_RANGES.find(r => r.id === dateRange)?.label.toLowerCase()}</p>
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
                    <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} onClick={handleExportTransactions}>
                        <Download size={14} /> Export CSV
                    </button>
                </div>

                {recentTransactions.length === 0 ? (
                    <div className="empty-state">
                        <p>No transactions found for the selected period.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
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
                                            <td>{txn.date ? format(new Date(txn.date), 'MMM d, yyyy HH:mm') : '-'}</td>
                                            <td>
                                                <span className={`badge ${txn.type === 'IN' ? 'badge-success' : 'badge-warning'}`}>
                                                    Stock {txn.type}
                                                </span>
                                            </td>
                                            <td>{item ? item.name : txn.itemId}</td>
                                            <td style={{ fontWeight: 500 }}>
                                                {txn.type === 'IN' ? '+' : '-'}{txn.quantity}
                                            </td>
                                            <td>{txn.user || '-'}</td>
                                            <td className="text-muted">{txn.reference || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
                    Showing {recentTransactions.length} of {filteredTransactions.length} transactions
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
