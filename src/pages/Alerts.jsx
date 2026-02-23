import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { NavLink } from 'react-router-dom';

const Alerts = () => {
    const { items } = useStore();

    const outOfStockItems = items.filter(i => i.stock === 0);
    const lowStockItems = items.filter(i => i.stock > 0 && i.stock <= i.reorderLevel);

    return (
        <div className="alerts-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Low Stock Alerts</h1>
                    <p className="page-subtitle">Items requiring immediate attention or reordering.</p>
                </div>
            </div>

            {outOfStockItems.length === 0 && lowStockItems.length === 0 ? (
                <div className="card empty-state">
                    <AlertCircle size={48} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <h3>All items are well stocked!</h3>
                    <p className="text-muted">You have no items below their reorder levels.</p>
                </div>
            ) : (
                <div className="grid gap-6">

                    {/* Out of Stock Section */}
                    {outOfStockItems.length > 0 && (
                        <div className="card" style={{ borderColor: 'var(--danger)', borderLeftWidth: '4px' }}>
                            <div className="card-header" style={{ border: 'none', paddingBottom: 0 }}>
                                <div className="card-title-group text-danger" style={{ color: 'var(--danger)' }}>
                                    <AlertCircle size={20} />
                                    <h2 className="card-title" style={{ color: 'inherit' }}>Out of Stock</h2>
                                </div>
                            </div>
                            <div className="table-container p-6">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Item Name</th>
                                            <th>SKU</th>
                                            <th>Category</th>
                                            <th>Reorder Level</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {outOfStockItems.map(item => (
                                            <tr key={item.id} style={{ backgroundColor: 'var(--danger-bg)' }}>
                                                <td className="font-medium">{item.name}</td>
                                                <td className="font-mono text-sm text-muted">{item.sku}</td>
                                                <td>{item.category}</td>
                                                <td>{item.reorderLevel} {item.unit}</td>
                                                <td>
                                                    <NavLink to="/receive" className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                                                        Restock
                                                    </NavLink>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Low Stock Section */}
                    {lowStockItems.length > 0 && (
                        <div className="card" style={{ borderColor: 'var(--warning)', borderLeftWidth: '4px' }}>
                            <div className="card-header" style={{ border: 'none', paddingBottom: 0 }}>
                                <div className="card-title-group text-warning" style={{ color: 'var(--warning)' }}>
                                    <AlertTriangle size={20} />
                                    <h2 className="card-title" style={{ color: 'inherit' }}>Low Stock</h2>
                                </div>
                            </div>
                            <div className="table-container p-6">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Item Name</th>
                                            <th>SKU</th>
                                            <th>Current Stock / Reorder</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStockItems.map(item => (
                                            <tr key={item.id}>
                                                <td className="font-medium">{item.name}</td>
                                                <td className="font-mono text-sm text-muted">{item.sku}</td>
                                                <td>
                                                    <span className="font-medium text-warning" style={{ color: 'var(--warning)' }}>{item.stock}</span>
                                                    <span className="text-muted"> / {item.reorderLevel} {item.unit}</span>
                                                </td>
                                                <td>
                                                    <NavLink to="/receive" className="btn btn-outline" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}>
                                                        Restock
                                                    </NavLink>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default Alerts;
