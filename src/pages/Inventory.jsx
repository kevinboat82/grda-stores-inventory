import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, X, Printer, Download, Edit2, Trash2, History } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { printStockReport } from '../utils/printVoucher';
import { exportToCsv } from '../utils/exportCsv';
import { format } from 'date-fns';
import './Inventory.css';

const Inventory = () => {
    const { items, categories, transactions, addItem, updateItem, deleteItem } = useStore();
    const { userRole, userProfile } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const [formData, setFormData] = useState({
        name: '', sku: '', category: '', unit: 'Pcs', stock: 0, reorderLevel: 10
    });

    const isAdmin = userRole === 'admin';

    // Filtering
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.sku?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCat = filterCategory ? item.category === filterCategory : true;
            let matchesStatus = true;
            if (filterStatus === 'in_stock') matchesStatus = Number(item.stock) > Number(item.reorderLevel);
            if (filterStatus === 'low_stock') matchesStatus = Number(item.stock) > 0 && Number(item.stock) <= Number(item.reorderLevel);
            if (filterStatus === 'out_of_stock') matchesStatus = Number(item.stock) === 0;
            return matchesSearch && matchesCat && matchesStatus;
        });
    }, [items, searchQuery, filterCategory, filterStatus]);

    // Transaction history for selected item
    const itemTransactions = useMemo(() => {
        if (!selectedItem) return [];
        return transactions.filter(t => t.itemId === selectedItem.id)
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [transactions, selectedItem]);

    const getStatusBadge = (stock, reorderLevel) => {
        const s = Number(stock);
        const r = Number(reorderLevel);
        if (s === 0) return <span className="badge badge-danger">Out of Stock</span>;
        if (s <= r) return <span className="badge badge-warning">Low Stock</span>;
        return <span className="badge badge-success">In Stock</span>;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddSubmit = (e) => {
        e.preventDefault();
        addItem({
            ...formData,
            stock: Number(formData.stock),
            reorderLevel: Number(formData.reorderLevel)
        });
        setIsAddModalOpen(false);
        setFormData({ name: '', sku: '', category: '', unit: 'Pcs', stock: 0, reorderLevel: 10 });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        await updateItem(selectedItem.id, {
            name: formData.name,
            sku: formData.sku,
            category: formData.category,
            unit: formData.unit,
            reorderLevel: Number(formData.reorderLevel),
        });
        setIsEditModalOpen(false);
        setSelectedItem(null);
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Delete "${item.name}"? This action cannot be undone.`)) return;
        await deleteItem(item.id);
    };

    const openEditModal = (item) => {
        setSelectedItem(item);
        setFormData({
            name: item.name,
            sku: item.sku,
            category: item.category,
            unit: item.unit,
            stock: item.stock,
            reorderLevel: item.reorderLevel
        });
        setIsEditModalOpen(true);
    };

    const openHistoryModal = (item) => {
        setSelectedItem(item);
        setIsHistoryModalOpen(true);
    };

    const handleExportCsv = () => {
        exportToCsv('inventory_report',
            ['Item Name', 'SKU', 'Category', 'Unit', 'Current Stock', 'Reorder Level', 'Status'],
            filteredItems.map(item => {
                const s = Number(item.stock);
                const r = Number(item.reorderLevel);
                const status = s === 0 ? 'Out of Stock' : s <= r ? 'Low Stock' : 'In Stock';
                return [item.name, item.sku, item.category, item.unit, s, r, status];
            })
        );
    };

    const handlePrint = () => {
        printStockReport({ items: filteredItems, filterCategory, userProfile });
    };

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventory Master List</h1>
                    <p className="page-subtitle">Manage and track all store items</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={handleExportCsv} title="Export to CSV">
                        <Download size={16} /> Export CSV
                    </button>
                    <button className="btn-print btn-print-outline" onClick={handlePrint}>
                        <Printer size={18} /> Print
                    </button>
                    {isAdmin && (
                        <button className="btn btn-primary" onClick={() => {
                            setFormData({ name: '', sku: '', category: '', unit: 'Pcs', stock: 0, reorderLevel: 10 });
                            setIsAddModalOpen(true);
                        }}>
                            <Plus size={18} /> Add Item
                        </button>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="filter-bar">
                    <div className="search-box">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or SKU..."
                            className="form-control"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="filter-box">
                        <Filter size={18} className="text-muted" />
                        <select
                            className="form-control"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-box">
                        <select
                            className="form-control"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="in_stock">In Stock</option>
                            <option value="low_stock">Low Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                        </select>
                    </div>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>SKU</th>
                                <th>Category</th>
                                <th>Unit</th>
                                <th>Current Stock</th>
                                <th>Status</th>
                                {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted">
                                        No items found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => openHistoryModal(item)}>
                                        <td className="font-medium">{item.name}</td>
                                        <td className="font-mono text-sm text-muted">{item.sku}</td>
                                        <td>{item.category}</td>
                                        <td className="text-muted">{item.unit}</td>
                                        <td className="font-medium">{item.stock}</td>
                                        <td>{getStatusBadge(item.stock, item.reorderLevel)}</td>
                                        {isAdmin && (
                                            <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                                        onClick={() => openEditModal(item)}
                                                        title="Edit Item"
                                                    >
                                                        <Edit2 size={12} /> Edit
                                                    </button>
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: 'var(--danger)' }}
                                                        onClick={() => handleDelete(item)}
                                                        title="Delete Item"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
                    Showing {filteredItems.length} of {items.length} items
                </div>
            </div>

            {/* Add Item Modal */}
            {isAddModalOpen && (
                <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add New Item</h2>
                            <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit}>
                            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Item Name</label>
                                    <input required name="name" type="text" className="form-control" value={formData.name} onChange={handleInputChange} placeholder="e.g. Printer Paper A4" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SKU / Barcode</label>
                                    <input required name="sku" type="text" className="form-control" value={formData.sku} onChange={handleInputChange} placeholder="e.g. PPR-A4" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select required name="category" className="form-control" value={formData.category} onChange={handleInputChange}>
                                        <option value="" disabled>Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unit of Measure</label>
                                    <input required name="unit" type="text" className="form-control" value={formData.unit} onChange={handleInputChange} placeholder="e.g. Pcs, Boxes" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Reorder Level</label>
                                    <input required name="reorderLevel" type="number" min="0" className="form-control" value={formData.reorderLevel} onChange={handleInputChange} />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Initial Stock</label>
                                    <input required name="stock" type="number" min="0" className="form-control" value={formData.stock} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Item Modal */}
            {isEditModalOpen && selectedItem && (
                <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Edit Item</h2>
                            <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit}>
                            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">Item Name</label>
                                    <input required name="name" type="text" className="form-control" value={formData.name} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SKU / Barcode</label>
                                    <input required name="sku" type="text" className="form-control" value={formData.sku} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select required name="category" className="form-control" value={formData.category} onChange={handleInputChange}>
                                        <option value="" disabled>Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unit of Measure</label>
                                    <input required name="unit" type="text" className="form-control" value={formData.unit} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Reorder Level</label>
                                    <input required name="reorderLevel" type="number" min="0" className="form-control" value={formData.reorderLevel} onChange={handleInputChange} />
                                </div>
                            </div>

                            <div style={{
                                padding: '0.75rem 1rem', borderRadius: '0.375rem', background: '#f8fafc',
                                border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)',
                                marginTop: '1rem'
                            }}>
                                <strong>Current Stock:</strong> {selectedItem.stock} {selectedItem.unit} — Stock is adjusted via Receive/Issue, not here.
                            </div>

                            <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Item Transaction History Modal */}
            {isHistoryModalOpen && selectedItem && (
                <div className="modal-overlay" onClick={() => { setIsHistoryModalOpen(false); setSelectedItem(null); }}>
                    <div className="modal-content" style={{ maxWidth: '40rem' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <History size={20} /> {selectedItem.name}
                            </h2>
                            <button className="close-btn" onClick={() => { setIsHistoryModalOpen(false); setSelectedItem(null); }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#f0fdf4', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current Stock</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedItem.stock}</div>
                            </div>
                            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#f8fafc', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Reorder Level</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedItem.reorderLevel}</div>
                            </div>
                            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#f8fafc', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Transactions</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{itemTransactions.length}</div>
                            </div>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            <strong>SKU:</strong> {selectedItem.sku} &nbsp;|&nbsp; <strong>Category:</strong> {selectedItem.category} &nbsp;|&nbsp; <strong>Unit:</strong> {selectedItem.unit}
                        </div>

                        {itemTransactions.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No transactions found for this item.
                            </div>
                        ) : (
                            <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
                                <table className="table" style={{ fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Type</th>
                                            <th>Qty</th>
                                            <th>User</th>
                                            <th>Reference</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemTransactions.map(txn => (
                                            <tr key={txn.id}>
                                                <td>{txn.date ? format(new Date(txn.date), 'MMM d, yyyy HH:mm') : '-'}</td>
                                                <td>
                                                    <span className={`badge ${txn.type === 'IN' ? 'badge-success' : 'badge-warning'}`}>
                                                        {txn.type}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 600 }}>
                                                    {txn.type === 'IN' ? '+' : '-'}{txn.quantity}
                                                </td>
                                                <td>{txn.user || '-'}</td>
                                                <td className="text-muted">{txn.reference || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
