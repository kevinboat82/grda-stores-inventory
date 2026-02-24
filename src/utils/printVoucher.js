/**
 * Opens a new window with the voucher HTML and triggers print.
 * This approach is reliable across all browsers because it avoids
 * CSS specificity conflicts with the main app's styles.
 */

const VOUCHER_CSS = `
    @page {
        size: A4;
        margin: 12mm 14mm 15mm 14mm;
    }

    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 11pt;
        line-height: 1.4;
        color: #000;
        background: white;
    }

    /* Green banner */
    .voucher-banner {
        background: #1a4d2e;
        color: white;
        text-align: center;
        padding: 12pt 16pt;
    }

    .voucher-banner h1 {
        font-size: 15pt;
        font-weight: bold;
        letter-spacing: 2pt;
        text-transform: uppercase;
        margin: 0;
    }

    .voucher-banner .banner-sub {
        font-size: 8.5pt;
        letter-spacing: 1pt;
        margin-top: 3pt;
        opacity: 0.85;
        text-transform: uppercase;
    }

    /* Gold bar */
    .voucher-gold-bar {
        height: 4pt;
        background: linear-gradient(90deg, #b8860b, #daa520, #ffd700, #daa520, #b8860b);
    }

    .voucher-body {
        padding: 14pt 20pt 12pt;
    }

    /* Title block */
    .voucher-title-block {
        text-align: center;
        margin: 10pt 0 14pt;
        padding: 8pt 0;
        border: 2pt solid #1a4d2e;
        background: #f0f7f2;
    }

    .voucher-title-block h2 {
        font-size: 16pt;
        font-weight: bold;
        letter-spacing: 3pt;
        text-transform: uppercase;
        color: #1a4d2e;
        margin: 0;
    }

    /* Info grid */
    .voucher-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border: 1pt solid #999;
        margin-bottom: 14pt;
    }

    .voucher-info-cell {
        padding: 7pt 10pt;
        border-bottom: 1pt solid #ccc;
    }

    .voucher-info-cell:nth-child(odd) {
        border-right: 1pt solid #ccc;
    }

    .voucher-info-cell:nth-last-child(-n+2) {
        border-bottom: none;
    }

    .info-label {
        font-size: 7.5pt;
        text-transform: uppercase;
        color: #666;
        letter-spacing: 0.8pt;
        margin-bottom: 2pt;
    }

    .info-value {
        font-size: 10.5pt;
        font-weight: bold;
        color: #111;
    }

    /* Table */
    .voucher-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12pt;
        font-size: 10pt;
    }

    .voucher-table th {
        background: #1a4d2e;
        color: white;
        font-weight: bold;
        font-size: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.6pt;
        padding: 6pt 8pt;
        border: 1pt solid #1a4d2e;
        text-align: center;
    }

    .voucher-table th.desc-col {
        text-align: left;
    }

    .voucher-table td {
        border: 1pt solid #bbb;
        padding: 5pt 8pt;
        text-align: center;
        vertical-align: middle;
    }

    .voucher-table td.desc-col {
        text-align: left;
        font-weight: 500;
    }

    .voucher-table td.qty-highlight {
        font-weight: bold;
        font-size: 12pt;
        color: #1a4d2e;
    }

    .voucher-table tr.empty-row td {
        height: 22pt;
    }

    .voucher-table tbody tr:nth-child(even) {
        background-color: #f7faf8;
    }

    .voucher-table tfoot td {
        font-weight: bold;
        background: #e8f5e9;
        border-top: 2pt solid #1a4d2e;
        font-size: 10pt;
        padding: 6pt 8pt;
    }

    /* Notes */
    .voucher-remarks {
        border: 1pt solid #bbb;
        margin: 12pt 0 16pt;
    }

    .voucher-remarks-header {
        background: #f0f0f0;
        padding: 4pt 10pt;
        font-size: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.8pt;
        color: #555;
        font-weight: bold;
        border-bottom: 1pt solid #bbb;
    }

    .voucher-remarks-body {
        padding: 8pt 10pt;
        min-height: 36pt;
        font-size: 10pt;
        color: #333;
        font-style: italic;
    }

    /* Signatures */
    .voucher-signatures {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 16pt;
        margin-top: 30pt;
        page-break-inside: avoid;
    }

    .voucher-sig-box {
        border: 1pt solid #ccc;
        padding: 8pt 10pt 10pt;
        text-align: center;
        background: #fcfcfc;
    }

    .voucher-sig-title {
        font-size: 8.5pt;
        text-transform: uppercase;
        letter-spacing: 1pt;
        font-weight: bold;
        color: #1a4d2e;
        margin-bottom: 3pt;
        padding-bottom: 4pt;
        border-bottom: 1pt solid #ddd;
    }

    .voucher-sig-role {
        font-size: 8pt;
        color: #666;
        margin-bottom: 8pt;
    }

    .voucher-sig-field {
        display: flex;
        align-items: baseline;
        gap: 4pt;
        font-size: 8.5pt;
        margin-top: 6pt;
    }

    .field-label {
        color: #666;
        min-width: 40pt;
        text-align: left;
    }

    .field-line {
        flex: 1;
        border-bottom: 1pt dotted #999;
        min-height: 14pt;
    }

    .sig-line .field-line {
        min-height: 32pt;
    }

    /* Footer */
    .voucher-footer {
        margin-top: 16pt;
        padding-top: 6pt;
        border-top: 2pt solid #1a4d2e;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 7pt;
    }

    .voucher-footer-left {
        color: #999;
    }

    .voucher-footer-center {
        font-size: 7.5pt;
        color: #c00;
        font-weight: bold;
        letter-spacing: 0.5pt;
    }

    .voucher-footer-right {
        color: #1a4d2e;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
    }
`;

/**
 * Print a Store Issue Voucher in a new window.
 * @param {Object} issue - The issue data object
 */
export function printIssueVoucher(issue) {
    const voucherNum = generateVoucherNum(issue.date);
    const dateStr = formatDate(issue.date);
    const timeStr = formatTime(issue.date);

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Store Issue Voucher — ${voucherNum}</title>
    <style>${VOUCHER_CSS}</style>
</head>
<body>
    <div class="voucher-banner">
        <h1>Ghana Railway Development Authority</h1>
        <div class="banner-sub">Headquarters, Accra — Ghana</div>
    </div>
    <div class="voucher-gold-bar"></div>

    <div class="voucher-body">
        <div class="voucher-title-block">
            <h2>Store Issue Voucher</h2>
        </div>

        <div class="voucher-info-grid">
            <div class="voucher-info-cell">
                <div class="info-label">Voucher Number</div>
                <div class="info-value">${voucherNum}</div>
            </div>
            <div class="voucher-info-cell">
                <div class="info-label">Date</div>
                <div class="info-value">${dateStr}</div>
            </div>
            <div class="voucher-info-cell">
                <div class="info-label">To: Department / Person</div>
                <div class="info-value">${escapeHtml(issue.department)}</div>
            </div>
            <div class="voucher-info-cell">
                <div class="info-label">Reference / Requisition No.</div>
                <div class="info-value">${escapeHtml(issue.reference)}</div>
            </div>
        </div>

        <table class="voucher-table">
            <thead>
                <tr>
                    <th style="width:28pt">S/N</th>
                    <th class="desc-col">Item Description</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Qty Issued</th>
                    <th>Stock Before</th>
                    <th>Stock After</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>1</td>
                    <td class="desc-col">${escapeHtml(issue.itemName)}</td>
                    <td>${escapeHtml(issue.itemSku)}</td>
                    <td>${escapeHtml(issue.category)}</td>
                    <td>${escapeHtml(issue.unit)}</td>
                    <td class="qty-highlight">${issue.quantity}</td>
                    <td>${issue.previousStock}</td>
                    <td>${issue.newStock}</td>
                </tr>
                <tr class="empty-row"><td>2</td><td class="desc-col"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr class="empty-row"><td>3</td><td class="desc-col"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr class="empty-row"><td>4</td><td class="desc-col"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr class="empty-row"><td>5</td><td class="desc-col"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="5" style="text-align:right">Total Quantity Issued:</td>
                    <td style="text-align:center;font-size:12pt">${issue.quantity}</td>
                    <td colspan="2"></td>
                </tr>
            </tfoot>
        </table>

        <div class="voucher-remarks">
            <div class="voucher-remarks-header">Notes / Remarks</div>
            <div class="voucher-remarks-body">${escapeHtml(issue.notes) || '—'}</div>
        </div>

        <div class="voucher-signatures">
            ${renderSigBox('Issued By', '(Store Officer)', issue.issuedBy)}
            ${renderSigBox('Received By', '(Department Representative)', '')}
            ${renderSigBox('Authorized By', '(Store Manager)', '')}
        </div>

        <div class="voucher-footer">
            <div class="voucher-footer-left">Generated: ${dateStr} at ${timeStr}</div>
            <div class="voucher-footer-center">⚠ This document is not valid without authorized signatures</div>
            <div class="voucher-footer-right">GRDA — Official Document</div>
        </div>
    </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    if (!printWindow) {
        alert('Please allow pop-ups to print the voucher.');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to render, then print
    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
    };
    // Fallback for browsers that don't fire onload for document.write
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);
}

/**
 * Print the Stock Report in a new window.
 * @param {Object} params
 */
export function printStockReport({ items, filterCategory, userProfile }) {
    const now = new Date();
    const dateStr = formatDate(now);
    const timeStr = formatTime(now);

    const totalItems = items.length;
    const totalStock = items.reduce((s, i) => s + (i.stock || 0), 0);
    const lowStock = items.filter(i => i.stock > 0 && i.stock <= i.reorderLevel).length;
    const outOfStock = items.filter(i => i.stock === 0).length;

    const tableRows = items.map((item, idx) => `
        <tr>
            <td style="text-align:center;color:#666">${idx + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.sku)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.unit)}</td>
            <td style="text-align:right">${item.stock}</td>
            <td style="text-align:center">${item.reorderLevel}</td>
            <td style="text-align:center">${getStatusText(item.stock, item.reorderLevel)}</td>
        </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Stock Report — ${dateStr}</title>
    <style>
        @page { size: A4 landscape; margin: 12mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 10pt; color: #000; background: white; line-height: 1.3; }
        .header { text-align: center; border-bottom: 3px double #1a4d2e; padding-bottom: 10pt; margin-bottom: 12pt; }
        .header h1 { font-size: 15pt; color: #1a4d2e; letter-spacing: 1pt; text-transform: uppercase; margin: 0; }
        .header p { font-size: 8.5pt; color: #555; margin: 2pt 0 0; }
        .header h2 { font-size: 13pt; color: #333; margin: 6pt 0 0; }
        .header .date { font-size: 8.5pt; color: #666; margin-top: 6pt; }
        .summary { display: flex; gap: 8pt; margin-bottom: 12pt; }
        .summary-card { flex: 1; border: 1pt solid #ccc; padding: 6pt; text-align: center; background: #f9f9f9; }
        .summary-card .label { font-size: 7pt; text-transform: uppercase; color: #666; letter-spacing: 0.5pt; }
        .summary-card .value { font-size: 15pt; font-weight: bold; color: #1a4d2e; }
        table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 10pt; }
        th { background: #1a4d2e; color: white; font-weight: bold; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5pt; padding: 5pt 6pt; border: 1pt solid #1a4d2e; text-align: left; }
        td { border: 1pt solid #999; padding: 4pt 6pt; }
        tbody tr:nth-child(even) { background: #f5f5f5; }
        tfoot td { font-weight: bold; background: #e8f5e9; border-top: 2pt solid #1a4d2e; }
        .sigs { display: flex; gap: 20pt; margin-top: 30pt; }
        .sig { flex: 1; text-align: center; }
        .sig-line { border-top: 1pt solid #333; margin-top: 40pt; padding-top: 4pt; font-size: 9pt; font-weight: bold; }
        .sig-role { font-size: 7pt; color: #666; margin-top: 2pt; }
        .sig-date { font-size: 7pt; color: #999; margin-top: 3pt; }
        .footer { margin-top: 14pt; padding-top: 5pt; border-top: 1pt solid #ccc; font-size: 7pt; color: #999; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Ghana Railway Development Authority</h1>
        <p>Stores Department</p>
        <h2>Current Stock Report</h2>
        <div class="date">Generated on ${dateStr} at ${timeStr}${filterCategory ? ` · Filtered by: ${filterCategory}` : ''}</div>
    </div>

    <div class="summary">
        <div class="summary-card"><div class="label">Total Items</div><div class="value">${totalItems}</div></div>
        <div class="summary-card"><div class="label">Total Stock Qty</div><div class="value">${totalStock}</div></div>
        <div class="summary-card"><div class="label">Low Stock</div><div class="value">${lowStock}</div></div>
        <div class="summary-card"><div class="label">Out of Stock</div><div class="value">${outOfStock}</div></div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:24pt;text-align:center">#</th>
                <th>Item Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit</th>
                <th style="text-align:right">Current Stock</th>
                <th style="text-align:center">Reorder Level</th>
                <th style="text-align:center">Status</th>
            </tr>
        </thead>
        <tbody>${tableRows}</tbody>
        <tfoot>
            <tr>
                <td colspan="5" style="text-align:right">Total Stock Quantity:</td>
                <td style="text-align:right">${totalStock}</td>
                <td colspan="2"></td>
            </tr>
        </tfoot>
    </table>

    <div class="sigs">
        <div class="sig">
            <div class="sig-line">Prepared By</div>
            <div class="sig-role">${escapeHtml(userProfile?.name || 'Store Officer')}</div>
            <div class="sig-date">Date: _______________</div>
        </div>
        <div class="sig">
            <div class="sig-line">Verified By</div>
            <div class="sig-role">Store Manager</div>
            <div class="sig-date">Date: _______________</div>
        </div>
        <div class="sig">
            <div class="sig-line">Approved By</div>
            <div class="sig-role">Head of Department</div>
            <div class="sig-date">Date: _______________</div>
        </div>
    </div>

    <div class="footer">GRDA Stores Inventory System · Confidential · ${dateStr}</div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
        alert('Please allow pop-ups to print the report.');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
    };
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);
}

/**
 * Print the Full Audit Report in a new window.
 * Contains both Current Stock and Transaction History.
 * @param {Object} params - { items, transactions, userProfile }
 */
export function printAuditReport({ items, transactions, userProfile }) {
    const now = new Date();
    const dateStr = formatDate(now);
    const timeStr = formatTime(now);

    // Filter out internal zero-balance seed items if needed (optional)
    const validItems = items;

    // Sort transactions newest first
    const sortedTxns = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Summary Metrics
    const totalItems = validItems.length;
    const totalStock = validItems.reduce((s, i) => s + (Number(i.stock) || 0), 0);
    const totalReceived = transactions.filter(t => t.type === 'IN').reduce((s, t) => s + (Number(t.quantity) || 0), 0);
    const totalIssued = transactions.filter(t => t.type === 'OUT').reduce((s, t) => s + (Number(t.quantity) || 0), 0);

    // Stock Table Rows
    const stockRows = validItems.map((item, idx) => `
        <tr>
            <td style="text-align:center;color:#666">${idx + 1}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.sku)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.unit)}</td>
            <td style="text-align:right; font-weight:bold;">${item.stock}</td>
            <td style="text-align:center">${item.reorderLevel}</td>
        </tr>
    `).join('');

    // Transaction Table Rows
    const txnRows = sortedTxns.map((txn, idx) => {
        const item = items.find(i => i.id === txn.itemId);
        const itemName = item ? item.name : txn.itemId;
        const typeColor = txn.type === 'IN' ? '#059669' : '#d97706';
        const typeBg = txn.type === 'IN' ? '#ecfdf5' : '#fffbeb';
        const typeSign = txn.type === 'IN' ? '+' : '-';

        return `
        <tr>
            <td style="text-align:center;color:#666">${idx + 1}</td>
            <td>${formatDate(txn.date)} ${formatTime(txn.date)}</td>
            <td style="font-family:monospace;font-size:8.5pt;">${escapeHtml(txn.id)}</td>
            <td style="text-align:center"><span style="background:${typeBg};color:${typeColor};padding:2pt 4pt;border-radius:2pt;font-size:7.5pt;font-weight:bold;">Stock ${txn.type}</span></td>
            <td>${escapeHtml(itemName)}</td>
            <td style="text-align:right;font-weight:bold;">${typeSign}${txn.quantity}</td>
            <td>${escapeHtml(txn.user)}</td>
            <td>${escapeHtml(txn.reference || '-')}</td>
        </tr>
        `;
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Comprehensive Audit Report — ${dateStr}</title>
    <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 9.5pt; color: #000; background: white; line-height: 1.3; }
        
        /* Typography */
        h1 { font-size: 16pt; color: #1a4d2e; letter-spacing: 1pt; text-transform: uppercase; margin: 0; text-align: center; }
        h2 { font-size: 13pt; color: #333; margin: 20pt 0 8pt; border-bottom: 2pt solid #1a4d2e; padding-bottom: 4pt; }
        .subtext { font-size: 8.5pt; color: #555; text-align: center; margin: 2pt 0; }
        .metadata { font-size: 8pt; color: #666; text-align: right; margin-bottom: 12pt; }
        
        /* Summary Grid */
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8pt; margin-bottom: 20pt; }
        .summary-card { border: 1pt solid #ccc; padding: 8pt; text-align: center; background: #f9f9f9; }
        .summary-card .label { font-size: 7.5pt; text-transform: uppercase; color: #666; letter-spacing: 0.5pt; margin-bottom: 4pt; }
        .summary-card .value { font-size: 16pt; font-weight: bold; color: #1a4d2e; }
        
        /* Tables */
        table { width: 100%; border-collapse: collapse; margin-bottom: 24pt; font-size: 8.5pt; }
        th { background: #1a4d2e; color: white; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5pt; padding: 5pt; border: 1pt solid #1a4d2e; text-align: left; }
        td { border: 1pt solid #ccc; padding: 4pt 5pt; }
        tbody tr:nth-child(even) { background: #f5f5f5; }
        
        /* Footer */
        .footer-note { font-size: 7.5pt; color: #999; text-align: center; border-top: 1pt solid #eee; padding-top: 8pt; margin-top: 30pt; }
        
        /* Print Rules */
        .page-break { page-break-before: always; }
        @media print {
            .no-break { page-break-inside: avoid; }
            thead { display: table-header-group; }
        }
    </style>
</head>
<body>
    <h1>Ghana Railway Development Authority</h1>
    <div class="subtext">Stores Department</div>
    <div class="subtext"><strong>Comprehensive Audit Report</strong></div>
    <div class="metadata">Generated on ${dateStr} at ${timeStr}<br/>By: ${escapeHtml(userProfile?.name || 'Audit Unit')}</div>

    <div class="summary">
        <div class="summary-card"><div class="label">Total Unique Items</div><div class="value">${totalItems}</div></div>
        <div class="summary-card"><div class="label">Total Current Stock</div><div class="value">${totalStock}</div></div>
        <div class="summary-card"><div class="label">Lifetime Received (IN)</div><div class="value">${totalReceived}</div></div>
        <div class="summary-card"><div class="label">Lifetime Issued (OUT)</div><div class="value">${totalIssued}</div></div>
    </div>

    <h2>1. Current Stock Inventory</h2>
    <table>
        <thead>
            <tr>
                <th style="width:24pt;text-align:center">#</th>
                <th>Item Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit</th>
                <th style="text-align:right">Stock Qty</th>
                <th style="text-align:center">Reorder Lvl</th>
            </tr>
        </thead>
        <tbody>${stockRows}</tbody>
    </table>

    <div class="page-break"></div>

    <h2>2. Complete Transaction History</h2>
    <table>
        <thead>
            <tr>
                <th style="width:24pt;text-align:center">#</th>
                <th>Date & Time</th>
                <th>Transaction ID</th>
                <th style="text-align:center">Type</th>
                <th>Item</th>
                <th style="text-align:right">Qty</th>
                <th>User / Officer</th>
                <th>Reference</th>
            </tr>
        </thead>
        <tbody>${txnRows}</tbody>
    </table>

    <div class="footer-note">
        GRDA Stores Inventory System · Secure Audit Export · Page generated automatically
    </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
        alert('Please allow pop-ups to print the report.');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
    };
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);
}

// ── Helpers ──

function generateVoucherNum(date) {
    const d = new Date(date);
    return `SIV-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function p(n) { return String(n).padStart(2, '0'); }

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getStatusText(stock, reorderLevel) {
    if (stock === 0) return 'Out of Stock';
    if (stock <= reorderLevel) return 'Low Stock';
    return 'In Stock';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderSigBox(title, role, prefillName) {
    return `
        <div class="voucher-sig-box">
            <div class="voucher-sig-title">${title}</div>
            <div class="voucher-sig-role">${role}</div>
            <div class="voucher-sig-field">
                <span class="field-label">Name:</span>
                <span class="field-line">${escapeHtml(prefillName)}</span>
            </div>
            <div class="voucher-sig-field sig-line">
                <span class="field-label">Sign:</span>
                <span class="field-line"></span>
            </div>
            <div class="voucher-sig-field">
                <span class="field-label">Date:</span>
                <span class="field-line"></span>
            </div>
        </div>`;
}
