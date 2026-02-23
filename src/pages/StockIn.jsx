import React, { useState, useMemo } from 'react';
import { ArrowDownToLine, CheckCircle2, AlertTriangle, Filter } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import './TransactionForm.css';

const StockIn = () => {
    const { items, categories, addTransaction } = useStore();
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [selectedCategory, setSelectedCategory] = useState('');
    const [formData, setFormData] = useState({
        itemId: '',
        quantity: '',
        reference: '',
        supplier: '',
        notes: ''
    });

    // Filter items by the selected category
    const filteredItems = useMemo(() => {
        if (!selectedCategory) return items;
        return items.filter(item => item.category === selectedCategory);
    }, [items, selectedCategory]);

    // Get selected item for info display
    const selectedItem = items.find(i => i.id === formData.itemId);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');

        try {
            addTransaction({
                type: 'IN',
                itemId: formData.itemId,
                quantity: Number(formData.quantity),
                reference: formData.reference,
                supplier: formData.supplier,
                notes: formData.notes
            });

            setSuccessMsg(`Stock received — ${formData.quantity} units of "${selectedItem?.name}" added.`);
            setFormData({ itemId: '', quantity: '', reference: '', supplier: '', notes: '' });

            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            setErrorMsg(err.message || 'An error occurred while receiving stock.');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
        // Reset item selection when category changes
        setFormData(prev => ({ ...prev, itemId: '' }));
    };

    return (
        <div className="transaction-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Receive Stock (In)</h1>
                    <p className="page-subtitle">Log incoming deliveries from suppliers to update inventory</p>
                </div>
            </div>

            <div className="card transaction-card">
                <div className="card-icon-header success-header">
                    <ArrowDownToLine size={32} />
                </div>

                {successMsg && (
                    <div className="alert alert-success">
                        <CheckCircle2 size={18} />
                        {successMsg}
                    </div>
                )}

                {errorMsg && (
                    <div className="alert alert-danger">
                        <AlertTriangle size={18} />
                        {errorMsg}
                    </div>
                )}

                <form className="transaction-form" onSubmit={handleSubmit}>
                    {/* Category Filter */}
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Filter size={16} />
                            Filter by Category
                        </label>
                        <select
                            className="form-control"
                            value={selectedCategory}
                            onChange={handleCategoryChange}
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Item Selection */}
                    <div className="form-group">
                        <label className="form-label">Select Item</label>
                        <select
                            required
                            name="itemId"
                            className="form-control"
                            value={formData.itemId}
                            onChange={handleInputChange}
                        >
                            <option value="" disabled>
                                {selectedCategory
                                    ? `Select from ${selectedCategory} (${filteredItems.length} items)...`
                                    : `Select an item (${filteredItems.length} total)...`
                                }
                            </option>
                            {filteredItems.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} ({item.sku}) — Current: {item.stock} {item.unit}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selected item info bar */}
                    {selectedItem && (
                        <div style={{
                            margin: '-0.5rem 0 1rem',
                            padding: '0.625rem 1rem',
                            borderRadius: '0.5rem',
                            backgroundColor: 'var(--success-bg, #ecfdf5)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            gap: '1.5rem',
                            flexWrap: 'wrap'
                        }}>
                            <span><strong>Item:</strong> {selectedItem.name}</span>
                            <span><strong>SKU:</strong> {selectedItem.sku}</span>
                            <span><strong>Category:</strong> {selectedItem.category}</span>
                            <span><strong>Current Stock:</strong> {selectedItem.stock} {selectedItem.unit}</span>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Quantity Received</label>
                            <input
                                required
                                type="number"
                                min="1"
                                name="quantity"
                                className="form-control"
                                placeholder="e.g. 50"
                                value={formData.quantity}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Supplier</label>
                            <input
                                required
                                type="text"
                                name="supplier"
                                className="form-control"
                                placeholder="e.g. Ghana Office Supplies Ltd"
                                value={formData.supplier}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Reference (PO / Delivery Note)</label>
                        <input
                            required
                            type="text"
                            name="reference"
                            className="form-control"
                            placeholder="e.g. PO-2026-003"
                            value={formData.reference}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes (Optional)</label>
                        <textarea
                            name="notes"
                            className="form-control"
                            rows="3"
                            placeholder="Condition of goods, delivery notes..."
                            value={formData.notes}
                            onChange={handleInputChange}
                        ></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary btn-submit">
                        Receive Items
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StockIn;
