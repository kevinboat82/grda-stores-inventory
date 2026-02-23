import React, { useState } from 'react';
import { ArrowUpFromLine, CheckCircle2, AlertTriangle, Printer } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { printIssueVoucher } from '../utils/printVoucher';
import './TransactionForm.css';

const StockOut = () => {
    const { items, addTransaction } = useStore();
    const { userProfile } = useAuth();
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [lastIssue, setLastIssue] = useState(null);

    const [formData, setFormData] = useState({
        itemId: '',
        quantity: '',
        reference: '',
        department: '',
        notes: ''
    });

    const selectedItem = items.find(i => i.id === formData.itemId);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');

        const item = items.find(i => i.id === formData.itemId);
        if (!item) return;

        try {
            addTransaction({
                type: 'OUT',
                itemId: formData.itemId,
                quantity: Number(formData.quantity),
                reference: formData.reference,
                department: formData.department,
                notes: formData.notes
            });

            const issue = {
                itemName: item.name,
                itemSku: item.sku,
                category: item.category,
                unit: item.unit,
                quantity: Number(formData.quantity),
                department: formData.department,
                reference: formData.reference,
                notes: formData.notes,
                previousStock: item.stock,
                newStock: item.stock - Number(formData.quantity),
                date: new Date(),
                issuedBy: userProfile?.name || 'Store Officer',
            };

            setLastIssue(issue);
            setSuccessMsg('Stock successfully issued.');
            setFormData({ itemId: '', quantity: '', reference: '', department: '', notes: '' });
            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err) {
            setErrorMsg(err.message || 'An error occurred while issuing stock.');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePrintVoucher = () => {
        if (lastIssue) {
            printIssueVoucher(lastIssue);
        }
    };

    return (
        <div className="transaction-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Issue Stock (Out)</h1>
                    <p className="page-subtitle">Log items leaving the store to a department or person</p>
                </div>
            </div>

            <div className="card transaction-card">
                <div className="card-icon-header warning-header">
                    <ArrowUpFromLine size={32} />
                </div>

                {successMsg && (
                    <div className="alert alert-success">
                        <CheckCircle2 size={18} />
                        <span style={{ flex: 1 }}>{successMsg}</span>
                        {lastIssue && (
                            <button
                                className="btn-print"
                                onClick={handlePrintVoucher}
                                style={{ marginLeft: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                            >
                                <Printer size={14} /> Print Voucher
                            </button>
                        )}
                    </div>
                )}

                {errorMsg && (
                    <div className="alert alert-danger">
                        <AlertTriangle size={18} />
                        {errorMsg}
                    </div>
                )}

                <form className="transaction-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Select Item</label>
                        <select required name="itemId" className="form-control" value={formData.itemId} onChange={handleInputChange}>
                            <option value="" disabled>Search or select an item...</option>
                            {items.map(item => (
                                <option key={item.id} value={item.id} disabled={item.stock === 0}>
                                    {item.name} ({item.sku}) - Current: {item.stock} {item.unit} {item.stock === 0 ? '(Out of Stock)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                Quantity to Issue
                                {selectedItem && <span className="text-muted ml-2">(Max: {selectedItem.stock})</span>}
                            </label>
                            <input
                                required type="number" min="1"
                                max={selectedItem ? selectedItem.stock : ''}
                                name="quantity" className="form-control"
                                value={formData.quantity} onChange={handleInputChange}
                                disabled={!selectedItem}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Requesting Dept/Person</label>
                            <input required type="text" name="department" className="form-control" placeholder="e.g. IT Department" value={formData.department} onChange={handleInputChange} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Reference (Requisition / Ticket)</label>
                        <input required type="text" name="reference" className="form-control" placeholder="e.g. REQ-099" value={formData.reference} onChange={handleInputChange} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes (Optional)</label>
                        <textarea name="notes" className="form-control" rows="3" placeholder="Additional details..." value={formData.notes} onChange={handleInputChange}></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary btn-submit" style={{ backgroundColor: 'var(--warning)', color: 'white' }}>
                        Issue Items
                    </button>
                </form>

                {lastIssue && !successMsg && (
                    <div style={{ padding: '0 2rem 2rem', textAlign: 'center' }}>
                        <button className="btn-print btn-print-outline" onClick={handlePrintVoucher}>
                            <Printer size={16} /> Reprint Last Issue Voucher
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockOut;
