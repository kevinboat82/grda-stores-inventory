/** HOD / management departments that can receive correspondence and forward to CEO or other departments */
export const ROUTING_DEPARTMENTS = [
    { id: 'estates', label: 'Estates', role: 'dept_estates' },
    { id: 'it', label: 'IT', role: 'dept_it' },
    { id: 'admin', label: 'Admin', role: 'dept_admin' },
    { id: 'audit', label: 'Audit', role: 'dept_audit' },
    { id: 'finance', label: 'Finance', role: 'dept_finance' },
    { id: 'procurement', label: 'Procurement', role: 'dept_procurement' },
    { id: 'hr', label: 'HR', role: 'dept_hr' },
    { id: 'projects', label: 'Projects', role: 'dept_projects' },
    { id: 'pprme', label: 'PPRME', role: 'dept_pprme' },
];

export const DEPARTMENT_ROLE_IDS = ROUTING_DEPARTMENTS.map((d) => d.role);

export function departmentLabelFromId(id) {
    return ROUTING_DEPARTMENTS.find((d) => d.id === id)?.label || id || '—';
}

export function departmentKeyFromRole(role) {
    const row = ROUTING_DEPARTMENTS.find((d) => d.role === role);
    return row ? row.id : null;
}

/** How correspondence is classified in the archive / register */
export const CORRESPONDENCE_TYPES = [
    { id: 'from_staff', label: 'From staff' },
    { id: 'from_outside_company', label: 'From outside of the company' },
    { id: 'memo', label: 'Memo' },
    { id: 'letter_outside_company', label: 'Letters from outside of the company' },
];

export function correspondenceTypeLabel(id) {
    return CORRESPONDENCE_TYPES.find((t) => t.id === id)?.label || id || '—';
}
