import React, { useState } from 'react';
import { Search, Plus, Filter, X, Printer } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { printStockReport } from '../utils/printVoucher';
import './Inventory.css';

const Inventory = () => {
    const { items, categories, addItem } = useStore();
    const { userRole, userProfile } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: '',
        unit: 'Pcs',
        stock: 0,
        reorderLevel: 10
    });

    const isAdmin = userRole === 'admin';

    // Filtering
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat = filterCategory ? item.category === filterCategory : true;
        return matchesSearch && matchesCat;
    });

    const getStatusBadge = (stock, reorderLevel) => {
        if (stock === 0) return <span className="badge badge-danger">Out of Stock</span>;
        if (stock <= reorderLevel) return <span className="badge badge-warning">Low Stock</span>;
        return <span className="badge badge-success">In Stock</span>;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        addItem({
            ...formData,
            stock: Number(formData.stock),
            reorderLevel: Number(formData.reorderLevel)
        });
        setIsModalOpen(false);
        setFormData({ name: '', sku: '', category: '', unit: 'Pcs', stock: 0, reorderLevel: 10 });
    };

    const handlePrint = () => {
        printStockReport({
            items: filteredItems,
            filterCategory,
            userProfile,
        });
    };

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Inventory Master List</h1>
                    <p className="page-subtitle">Manage and track all store items</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-print btn-print-outline" onClick={handlePrint}>
                        <Printer size={18} /> Print Report
                    </button>
                    {isAdmin && (
                        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                            <Plus size={18} /> Add New Item
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
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-muted">
                                        No items found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.id}>
                                        <td className="font-medium">{item.name}</td>
                                        <td className="font-mono text-sm text-muted">{item.sku}</td>
                                        <td>{item.category}</td>
                                        <td className="text-muted">{item.unit}</td>
                                        <td className="font-medium">{item.stock}</td>
                                        <td>{getStatusBadge(item.stock, item.reorderLevel)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add New Item Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add New Item</h2>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
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
                                    <input required name="unit" type="text" className="form-control" value={formData.unit} onChange={handleInputChange} placeholder="e.g. Pcs, Boxes, Kg" />
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
                                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
