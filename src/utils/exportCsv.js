/**
 * Export data as CSV file download.
 * @param {string} filename - Name of the downloaded file (without extension)
 * @param {string[]} headers - Column header labels
 * @param {Array<Array<string|number>>} rows - Row data arrays
 */
export const exportToCsv = (filename, headers, rows) => {
    const escape = (val) => {
        const str = val == null ? '' : String(val);
        // Wrap in quotes if contains comma, newline, or quote
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvContent = [
        headers.map(escape).join(','),
        ...rows.map(row => row.map(escape).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};
