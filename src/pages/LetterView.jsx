import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    FileText,
    Download,
    Calendar,
    Tag,
    User,
    Mail,
    Hash,
    Clock,
    MessageSquare,
    GitBranch,
    Send,
    Building2,
    Layers,
} from 'lucide-react';
import {
    useRecords,
    LETTER_STATUSES,
    WORKFLOW_STEPS,
    WORKFLOW_STEP_LABELS,
    WORKFLOW_ACTIONS,
} from '../context/RecordsContext';
import {
    DEPARTMENT_ROLE_IDS,
    ROUTING_DEPARTMENTS,
    departmentKeyFromRole,
    departmentLabelFromId,
    correspondenceTypeLabel,
} from '../constants/departmentWorkflow';
import { format } from 'date-fns';
import DocumentPreview from '../components/DocumentPreview';
import DigitalSignaturePad from '../components/DigitalSignaturePad';
import { useAuth } from '../context/AuthContext';
import './Records.css';

const actionLabel = (action) => {
    switch (action) {
        case WORKFLOW_ACTIONS.LETTER_REGISTERED:
            return 'Letter registered';
        case WORKFLOW_ACTIONS.FORWARDED_TO_CEO_OFFICE:
            return 'Forwarded to CEO office (PA / Secretary)';
        case WORKFLOW_ACTIONS.FORWARDED_TO_CEO:
            return 'Forwarded to CEO';
        case WORKFLOW_ACTIONS.SENT_TO_DEPARTMENT:
            return 'Sent to department for HOD review';
        case WORKFLOW_ACTIONS.DEPARTMENT_FORWARDED_TO_DEPARTMENT:
            return 'Forwarded to another department';
        case WORKFLOW_ACTIONS.DEPARTMENT_FORWARDED_TO_CEO:
            return 'Department forwarded to CEO';
        case WORKFLOW_ACTIONS.CEO_MINUTED_AND_ROUTED:
            return 'CEO minuted and routed';
        case WORKFLOW_ACTIONS.MEMO_RAISED:
            return 'Memo raised';
        case WORKFLOW_ACTIONS.HOD_MINUTED_AND_SIGNED:
            return 'HOD minute and signature';
        case WORKFLOW_ACTIONS.CEO_MEMO_DISPATCHED:
            return 'CEO dispatched memo';
        default:
            return action || '—';
    }
};

const LetterView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userRole, userProfile, updateProfile } = useAuth();
    const {
        letters,
        updateLetter,
        forwardToCeoOffice,
        forwardToCeo,
        sendToDepartment,
        departmentForwardToDepartment,
        departmentForwardToCeo,
        ceoMinuteAndRoute,
        ceoDispatchMemo,
    } = useRecords();
    const [updating, setUpdating] = useState(false);
    const [workflowError, setWorkflowError] = useState('');
    const [noteToCeoOffice, setNoteToCeoOffice] = useState('');
    const [noteToCeo, setNoteToCeo] = useState('');
    const [ceoMinute, setCeoMinute] = useState('');
    const [routedTo, setRoutedTo] = useState('');
    const [sendDeptId, setSendDeptId] = useState('');
    const [sendDeptNote, setSendDeptNote] = useState('');
    const [intraDeptTarget, setIntraDeptTarget] = useState('');
    const [intraDeptNote, setIntraDeptNote] = useState('');
    const [deptToCeoNote, setDeptToCeoNote] = useState('');
    const [hodMinute, setHodMinute] = useState('');
    const [hodSignature, setHodSignature] = useState(userProfile?.digitalSignature || '');
    const [ceoCcDepts, setCeoCcDepts] = useState([]);
    const [ceoReturnDepts, setCeoReturnDepts] = useState([]);

    const letter = useMemo(() => letters.find((l) => l.id === id), [letters, id]);

    const workflowStep = letter?.workflowStep || WORKFLOW_STEPS.WITH_RECORDS;

    const sortedHistory = useMemo(() => {
        if (!letter) return [];
        const h = [...(letter.workflowHistory || [])];
        h.sort((a, b) => {
            const ta = a.at instanceof Date ? a.at.getTime() : new Date(a.at).getTime();
            const tb = b.at instanceof Date ? b.at.getTime() : new Date(b.at).getTime();
            return ta - tb;
        });
        return h;
    }, [letter]);

    const myDeptKey = useMemo(() => departmentKeyFromRole(userRole), [userRole]);

    const backPath = (() => {
        if (DEPARTMENT_ROLE_IDS.includes(userRole)) return '/';
        if (userRole === 'ceo' || userRole === 'ceo_office') return '/';
        return '/records';
    })();

    const handleStatusChange = async (newStatus) => {
        if (!letter) return;
        setUpdating(true);
        try {
            await updateLetter(letter.id, { status: newStatus });
        } catch (err) {
            console.error('Status update error:', err);
        } finally {
            setUpdating(false);
        }
    };

    const runWorkflow = async (fn) => {
        setWorkflowError('');
        setUpdating(true);
        try {
            await fn();
            setNoteToCeoOffice('');
            setNoteToCeo('');
            setCeoMinute('');
            setRoutedTo('');
            setSendDeptId('');
            setSendDeptNote('');
            setIntraDeptTarget('');
            setIntraDeptNote('');
            setDeptToCeoNote('');
            setHodMinute('');
            setHodSignature(userProfile?.digitalSignature || '');
            setCeoCcDepts([]);
            setCeoReturnDepts([]);
        } catch (err) {
            setWorkflowError(err.message || 'Something went wrong.');
        } finally {
            setUpdating(false);
        }
    };

    const canRecordsForward =
        !!letter &&
        (userRole === 'records_unit' || userRole === 'admin') &&
        workflowStep === WORKFLOW_STEPS.WITH_RECORDS;
    const canCeoOfficeForward =
        !!letter &&
        (userRole === 'ceo_office' || userRole === 'admin') &&
        workflowStep === WORKFLOW_STEPS.WITH_CEO_OFFICE;
    const canCeoRoute =
        !!letter && (userRole === 'ceo' || userRole === 'admin') && workflowStep === WORKFLOW_STEPS.WITH_CEO;

    const canSendToDepartmentFromRecords =
        !!letter &&
        (userRole === 'records_unit' || userRole === 'admin') &&
        workflowStep === WORKFLOW_STEPS.WITH_RECORDS;

    const canSendToDepartmentFromCeoOffice =
        !!letter &&
        (userRole === 'ceo_office' || userRole === 'admin') &&
        workflowStep === WORKFLOW_STEPS.WITH_CEO_OFFICE;

    const isCcDept = !!letter?.ccDepartments?.includes(myDeptKey);
    const canDeptAct =
        !!letter &&
        workflowStep === WORKFLOW_STEPS.WITH_DEPARTMENT &&
        (userRole === 'admin' ||
            (!!myDeptKey && (letter.assignedDepartment === myDeptKey || isCcDept)));

    const statusClassMap = {
        Pending: 'badge-warning',
        Acknowledged: 'badge-info',
        Forwarded: 'badge-primary',
        Filed: 'badge-success',
        Responded: 'badge-neutral',
    };

    if (!letter) {
        return (
            <div className="records-page">
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button type="button" className="btn-icon" onClick={() => navigate(backPath)}>
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="page-title">Letter Not Found</h1>
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <p>This letter could not be found or may have been deleted.</p>
                    <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate(backPath)}>
                        Back
                    </button>
                </div>
            </div>
        );
    }

    const isPdf = letter.fileName?.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(letter.fileName || '');

    return (
        <div className="records-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button type="button" className="btn-icon" onClick={() => navigate(backPath)} title="Back">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">{letter.subject}</h1>
                        <p className="page-subtitle">
                            {letter.type === 'incoming' ? 'Incoming' : 'Outgoing'} · {letter.classification}
                            {' · '}
                            <span className="text-muted">{correspondenceTypeLabel(letter.correspondenceType)}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="letter-view-layout">
                <div className="card letter-details-card">
                    <h3 className="letter-section-title">
                        <GitBranch size={18} /> Routing workflow
                    </h3>
                    <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
                        Items may go through Records, the CEO office, department HODs, or the CEO — see activity trail below for the exact path.
                    </p>

                    <div className="workflow-current-status card" style={{ padding: '1rem', marginBottom: '1rem', background: 'var(--surface-alt, #f8fafc)' }}>
                        <p className="text-sm text-muted" style={{ margin: '0 0 0.35rem' }}>Current stage</p>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem' }}>
                            {WORKFLOW_STEP_LABELS[workflowStep] || workflowStep}
                        </p>
                        {letter.assignedDepartment ? (
                            <p className="text-sm" style={{ margin: '0.5rem 0 0' }}>
                                <Building2 size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
                                Assigned department: <strong>{departmentLabelFromId(letter.assignedDepartment)}</strong>
                            </p>
                        ) : null}
                        {workflowStep === WORKFLOW_STEPS.ROUTED && letter.routedTo ? (
                            <p className="text-sm" style={{ margin: '0.35rem 0 0' }}>
                                CEO routed to: <strong>{letter.routedTo}</strong>
                            </p>
                        ) : null}
                        {letter.ccDepartments?.length > 0 ? (
                            <p className="text-sm" style={{ margin: '0.5rem 0 0' }}>
                                CC departments:{' '}
                                {letter.ccDepartments.map((id) => (
                                    <span key={id} className="badge badge-neutral" style={{ marginRight: '0.25rem' }}>
                                        {departmentLabelFromId(id)}
                                    </span>
                                ))}
                            </p>
                        ) : null}
                    </div>

                    {workflowError && (
                        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
                            {workflowError}
                        </div>
                    )}

                    {canRecordsForward && (
                        <div className="workflow-action-card">
                            <h4 className="workflow-action-title">Forward to CEO&apos;s PA / Secretary</h4>
                            <p className="text-sm text-muted">
                                After Records has checked the letter, send it to the CEO office queue for screening before it reaches the CEO.
                            </p>
                            <label className="form-label" htmlFor="note-ceo-office">
                                Note (optional)
                            </label>
                            <textarea
                                id="note-ceo-office"
                                className="form-control"
                                rows={2}
                                value={noteToCeoOffice}
                                onChange={(e) => setNoteToCeoOffice(e.target.value)}
                                placeholder="e.g. Urgent — response required by end of week"
                            />
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ marginTop: '0.75rem' }}
                                disabled={updating}
                                onClick={() => runWorkflow(() => forwardToCeoOffice(letter.id, noteToCeoOffice))}
                            >
                                <Send size={16} /> Send to CEO office
                            </button>
                        </div>
                    )}

                    {canCeoOfficeForward && (
                        <div className="workflow-action-card">
                            <h4 className="workflow-action-title">Forward to CEO</h4>
                            <p className="text-sm text-muted">Confirm review and place the letter on the CEO&apos;s desk.</p>
                            <label className="form-label" htmlFor="note-ceo">
                                Note (optional)
                            </label>
                            <textarea
                                id="note-ceo"
                                className="form-control"
                                rows={2}
                                value={noteToCeo}
                                onChange={(e) => setNoteToCeo(e.target.value)}
                            />
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ marginTop: '0.75rem' }}
                                disabled={updating}
                                onClick={() => runWorkflow(() => forwardToCeo(letter.id, noteToCeo))}
                            >
                                <Send size={16} /> Forward to CEO
                            </button>
                        </div>
                    )}

                    {canSendToDepartmentFromRecords && (
                        <div className="workflow-action-card">
                            <h4 className="workflow-action-title">Send to department (HOD)</h4>
                            <p className="text-sm text-muted">
                                Route this item to a department head for review. They may forward it to another department or directly to the CEO.
                            </p>
                            <label className="form-label" htmlFor="dept-pick-records">Department</label>
                            <select
                                id="dept-pick-records"
                                className="form-control"
                                value={sendDeptId}
                                onChange={(e) => setSendDeptId(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select department…</option>
                                {ROUTING_DEPARTMENTS.map((d) => (
                                    <option key={d.id} value={d.id}>{d.label}</option>
                                ))}
                            </select>
                            <label className="form-label" htmlFor="note-dept-records" style={{ marginTop: '0.75rem' }}>
                                Note (optional)
                            </label>
                            <textarea
                                id="note-dept-records"
                                className="form-control"
                                rows={2}
                                value={sendDeptNote}
                                onChange={(e) => setSendDeptNote(e.target.value)}
                            />
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ marginTop: '0.75rem' }}
                                disabled={updating || !sendDeptId}
                                onClick={() => runWorkflow(() => sendToDepartment(letter.id, sendDeptId, sendDeptNote))}
                            >
                                <Building2 size={16} /> Send to department
                            </button>
                        </div>
                    )}

                    {canSendToDepartmentFromCeoOffice && (
                        <div className="workflow-action-card">
                            <h4 className="workflow-action-title">Send to department (HOD)</h4>
                            <p className="text-sm text-muted">
                                Send from the CEO office to a department for HOD review before it reaches the CEO, or for cross-department coordination.
                            </p>
                            <label className="form-label" htmlFor="dept-pick-office">Department</label>
                            <select
                                id="dept-pick-office"
                                className="form-control"
                                value={sendDeptId}
                                onChange={(e) => setSendDeptId(e.target.value)}
                            >
                                <option value="" disabled>Select department…</option>
                                {ROUTING_DEPARTMENTS.map((d) => (
                                    <option key={d.id} value={d.id}>{d.label}</option>
                                ))}
                            </select>
                            <label className="form-label" htmlFor="note-dept-office" style={{ marginTop: '0.75rem' }}>
                                Note (optional)
                            </label>
                            <textarea
                                id="note-dept-office"
                                className="form-control"
                                rows={2}
                                value={sendDeptNote}
                                onChange={(e) => setSendDeptNote(e.target.value)}
                            />
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ marginTop: '0.75rem' }}
                                disabled={updating || !sendDeptId}
                                onClick={() => runWorkflow(() => sendToDepartment(letter.id, sendDeptId, sendDeptNote))}
                            >
                                <Building2 size={16} /> Send to department
                            </button>
                        </div>
                    )}

                    {canDeptAct && (
                        <div className="workflow-action-card">
                            <h4 className="workflow-action-title">Department actions (minute &amp; signature required)</h4>
                            <p className="text-sm text-muted">
                                Route through another HOD toward the CEO, or forward directly to the CEO after your minute and digital sign-off.
                            </p>
                            <label className="form-label" htmlFor="hod-minute">Your minute *</label>
                            <textarea
                                id="hod-minute"
                                className="form-control"
                                rows={3}
                                value={hodMinute}
                                onChange={(e) => setHodMinute(e.target.value)}
                                placeholder="Official minute on this memo…"
                            />
                            <DigitalSignaturePad value={hodSignature} onChange={setHodSignature} label="Digital signature *" />
                            <label className="form-label" htmlFor="intra-dept-target" style={{ marginTop: '0.75rem' }}>
                                Forward via another HOD
                            </label>
                            <select
                                id="intra-dept-target"
                                className="form-control"
                                value={intraDeptTarget}
                                onChange={(e) => setIntraDeptTarget(e.target.value)}
                            >
                                <option value="">Select…</option>
                                {ROUTING_DEPARTMENTS.filter((d) => d.id !== letter.assignedDepartment).map((d) => (
                                    <option key={d.id} value={d.id}>{d.label}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="btn btn-outline"
                                style={{ marginTop: '0.5rem' }}
                                disabled={updating || !intraDeptTarget || !hodMinute.trim() || !hodSignature}
                                onClick={() =>
                                    runWorkflow(async () => {
                                        if (hodSignature !== userProfile?.digitalSignature) {
                                            await updateProfile({ digitalSignature: hodSignature });
                                        }
                                        await departmentForwardToDepartment(letter.id, intraDeptTarget, hodMinute, hodSignature);
                                    })
                                }
                            >
                                Sign &amp; send to selected HOD
                            </button>
                            <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)' }} />
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ marginTop: '0.5rem' }}
                                disabled={updating || !hodMinute.trim() || !hodSignature}
                                onClick={() =>
                                    runWorkflow(async () => {
                                        if (hodSignature !== userProfile?.digitalSignature) {
                                            await updateProfile({ digitalSignature: hodSignature });
                                        }
                                        await departmentForwardToCeo(letter.id, hodMinute, hodSignature);
                                    })
                                }
                            >
                                <Send size={16} /> Sign &amp; forward to CEO
                            </button>
                        </div>
                    )}

                    {canCeoRoute && (
                        <div className="workflow-action-card">
                            <h4 className="workflow-action-title">CEO minute — dispatch memo</h4>
                            <p className="text-sm text-muted">
                                Record your minute, route the memo, CC other HODs, or return it to department heads for action.
                            </p>
                            <label className="form-label" htmlFor="ceo-minute">
                                CEO minute *
                            </label>
                            <textarea
                                id="ceo-minute"
                                className="form-control"
                                rows={4}
                                value={ceoMinute}
                                onChange={(e) => setCeoMinute(e.target.value)}
                                placeholder="Official minute / instruction…"
                                required
                            />
                            <label className="form-label" htmlFor="routed-to" style={{ marginTop: '0.75rem' }}>
                                Route to (department or person)
                            </label>
                            <input
                                id="routed-to"
                                type="text"
                                className="form-control"
                                value={routedTo}
                                onChange={(e) => setRoutedTo(e.target.value)}
                                placeholder="e.g. Finance — HOD"
                            />
                            <p className="form-label" style={{ marginTop: '1rem' }}>CC department heads (optional)</p>
                            <div className="memo-cc-list">
                                {ROUTING_DEPARTMENTS.map((d) => (
                                    <label key={d.id} className="badge badge-neutral" style={{ cursor: 'pointer', padding: '0.35rem 0.6rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={ceoCcDepts.includes(d.id)}
                                            onChange={(e) => {
                                                setCeoCcDepts((prev) =>
                                                    e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id)
                                                );
                                            }}
                                            style={{ marginRight: '0.35rem' }}
                                        />
                                        {d.label}
                                    </label>
                                ))}
                            </div>
                            <p className="form-label" style={{ marginTop: '1rem' }}>Return to HOD inboxes (optional)</p>
                            <div className="memo-cc-list">
                                {ROUTING_DEPARTMENTS.map((d) => (
                                    <label key={`ret-${d.id}`} className="badge badge-primary" style={{ cursor: 'pointer', padding: '0.35rem 0.6rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={ceoReturnDepts.includes(d.id)}
                                            onChange={(e) => {
                                                setCeoReturnDepts((prev) =>
                                                    e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id)
                                                );
                                            }}
                                            style={{ marginRight: '0.35rem' }}
                                        />
                                        {d.label}
                                    </label>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ marginTop: '0.75rem' }}
                                disabled={updating || !ceoMinute.trim()}
                                onClick={() =>
                                    runWorkflow(() =>
                                        ceoDispatchMemo(letter.id, {
                                            minute: ceoMinute,
                                            routedTo,
                                            ccDepartmentIds: ceoCcDepts,
                                            returnDepartmentIds: ceoReturnDepts,
                                        })
                                    )
                                }
                            >
                                Save minute &amp; dispatch
                            </button>
                        </div>
                    )}

                    {(letter.signatures?.length > 0) && (
                        <>
                            <h3 className="letter-section-title" style={{ marginTop: '1.5rem' }}>
                                Digital signatures
                            </h3>
                            {letter.signatures.map((sig, idx) => (
                                <div key={sig.uid + String(idx)} className="memo-signature-block">
                                    <p className="font-medium">{sig.name}</p>
                                    <p className="text-sm text-muted">
                                        {sig.departmentId ? departmentLabelFromId(sig.departmentId) : sig.role}
                                        {sig.signedAt
                                            ? ` · ${format(sig.signedAt instanceof Date ? sig.signedAt : new Date(sig.signedAt), 'dd MMM yyyy HH:mm')}`
                                            : ''}
                                    </p>
                                    {sig.minute && <p className="workflow-timeline-detail">{sig.minute}</p>}
                                    {sig.signatureDataUrl && (
                                        <img src={sig.signatureDataUrl} alt={`Signature of ${sig.name}`} />
                                    )}
                                </div>
                            ))}
                        </>
                    )}

                    <h3 className="letter-section-title" style={{ marginTop: '1.5rem' }}>
                        Activity trail
                    </h3>
                    <ul className="workflow-timeline">
                        {sortedHistory.length === 0 ? (
                            <li className="text-muted text-sm">No workflow events yet.</li>
                        ) : (
                            sortedHistory.map((ev) => (
                                <li key={ev.id} className="workflow-timeline-item">
                                    <div className="workflow-timeline-time">
                                        {ev.at
                                            ? format(
                                                  ev.at instanceof Date ? ev.at : new Date(ev.at),
                                                  'dd MMM yyyy, HH:mm'
                                              )
                                            : '—'}
                                    </div>
                                    <div className="workflow-timeline-body">
                                        <strong>{actionLabel(ev.action)}</strong>
                                        <div className="text-sm text-muted">
                                            {ev.actorName}
                                            {ev.actorRole ? ` · ${ev.actorRole}` : ''}
                                        </div>
                                        {ev.detail ? <p className="workflow-timeline-detail">{ev.detail}</p> : null}
                                        {ev.routedTo ? (
                                            <p className="workflow-timeline-detail">
                                                <strong>Routed to:</strong> {ev.routedTo}
                                            </p>
                                        ) : null}
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>

                    <h3 className="letter-section-title">Letter Details</h3>

                    <div className="letter-detail-grid">
                        <div className="letter-detail-item">
                            <div className="detail-icon">
                                <Mail size={16} />
                            </div>
                            <div>
                                <p className="detail-label">Type</p>
                                <p className="detail-value">
                                    <span className={`badge ${letter.type === 'incoming' ? 'badge-success' : 'badge-warning'}`}>
                                        {letter.type === 'incoming' ? 'Incoming' : 'Outgoing'}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon">
                                <Tag size={16} />
                            </div>
                            <div>
                                <p className="detail-label">Classification</p>
                                <p className="detail-value">{letter.classification}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon">
                                <Layers size={16} />
                            </div>
                            <div>
                                <p className="detail-label">Correspondence category</p>
                                <p className="detail-value">{correspondenceTypeLabel(letter.correspondenceType)}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon">
                                <User size={16} />
                            </div>
                            <div>
                                <p className="detail-label">From</p>
                                <p className="detail-value">{letter.sender || '—'}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon">
                                <User size={16} />
                            </div>
                            <div>
                                <p className="detail-label">To</p>
                                <p className="detail-value">{letter.recipient || '—'}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon">
                                <Hash size={16} />
                            </div>
                            <div>
                                <p className="detail-label">Reference No.</p>
                                <p className="detail-value font-mono">{letter.referenceNo || '—'}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon">
                                <Calendar size={16} />
                            </div>
                            <div>
                                <p className="detail-label">Date on Letter</p>
                                <p className="detail-value">{letter.letterDate || '—'}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon">
                                <Clock size={16} />
                            </div>
                            <div>
                                <p className="detail-label">Recorded</p>
                                <p className="detail-value">{format(new Date(letter.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                            </div>
                        </div>

                        <div className="letter-detail-item">
                            <div className="detail-icon">
                                <User size={16} />
                            </div>
                            <div>
                                <p className="detail-label">Recorded By</p>
                                <p className="detail-value">{letter.createdBy}</p>
                            </div>
                        </div>
                    </div>

                    {letter.notes && (
                        <div className="letter-notes">
                            <div className="detail-icon">
                                <MessageSquare size={16} />
                            </div>
                            <div>
                                <p className="detail-label">Notes</p>
                                <p className="detail-value">{letter.notes}</p>
                            </div>
                        </div>
                    )}

                    {(userRole === 'records_unit' || userRole === 'admin') && (
                        <div className="letter-status-section">
                            <h3 className="letter-section-title">Filing status</h3>
                            <p className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>
                                Internal tracking (separate from CEO routing).
                            </p>
                            <div className="status-buttons">
                                {LETTER_STATUSES.map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        className={`btn status-btn ${
                                            letter.status === status ? statusClassMap[status] + ' active-status' : 'btn-outline'
                                        }`}
                                        onClick={() => handleStatusChange(status)}
                                        disabled={updating || letter.status === status}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="card letter-preview-card">
                    <h3 className="letter-section-title">
                        <FileText size={18} /> Document
                    </h3>

                    {letter.fileUrl || letter.storagePath ? (
                        <>
                            <div className="document-preview">
                                <DocumentPreview
                                    fileUrl={letter.fileUrl}
                                    fileName={letter.fileName}
                                    storagePath={letter.storagePath}
                                />
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <a href={letter.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                                    <Download size={16} /> Download
                                </a>
                                <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>
                                    {letter.fileName}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="no-preview">
                            <FileText size={48} />
                            <p>No document uploaded for this letter.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LetterView;
