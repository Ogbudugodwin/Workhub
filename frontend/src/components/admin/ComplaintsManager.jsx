import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_URL = "http://localhost:5000/api";

const ComplaintsManager = () => {
    const { currentUser, userData } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState('list'); // 'list' or 'submit'
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        category: 'General',
        priority: 'Medium',
        anonymous: false,
        description: ''
    });

    useEffect(() => {
        if (currentUser && userData) {
            loadComplaints();
        }
    }, [currentUser, userData]);

    const loadComplaints = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/complaints`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setComplaints(data);
                setMessage({ type: '', text: '' });
            } else {
                const errorData = await response.json();
                console.error("Complaints Auth Error:", errorData);
                const errorMessage = errorData.error || 'Failed to fetch complaints';
                const debugInfo = errorData.debug
                    ? `\n(Role Detected: "${errorData.debug.detectedRole}", Expected: ${errorData.debug.allowedRoles.join(', ')})`
                    : '';
                setMessage({ type: 'error', text: `${errorMessage}${debugInfo}` });
            }
        } catch (error) {
            console.error("Failed to load complaints", error);
            setMessage({ type: 'error', text: 'Connection error. Please check if the backend is running.' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch(`${API_URL}/complaints`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Complaint submitted successfully!' });
                setFormData({
                    title: '',
                    category: 'General',
                    priority: 'Medium',
                    anonymous: false,
                    description: ''
                });
                loadComplaints();
                setTimeout(() => setView('list'), 1500);
            } else {
                const err = await response.json();
                setMessage({ type: 'error', text: err.error || 'Failed to submit complaint' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (complaintId, newStatus, resolution) => {
        try {
            const response = await fetch(`${API_URL}/complaints/${complaintId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
                body: JSON.stringify({ status: newStatus, resolution }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: `Complaint status updated to ${newStatus}` });
                loadComplaints();
                setSelectedComplaint(null);
            } else {
                const err = await response.json();
                setMessage({ type: 'error', text: err.error || 'Failed to update status' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        }
    };

    const groupComplaintsByBranch = () => {
        return complaints.reduce((groups, complaint) => {
            const branch = complaint.branchName || 'Unassigned / Main Office';
            if (!groups[branch]) groups[branch] = [];
            groups[branch].push(complaint);
            return groups;
        }, {});
    };

    if (loading || !userData) return <div className="loading-spinner">Loading complaints...</div>;

    const isAdmin = userData?.role?.toLowerCase() === 'super_admin' || userData?.role?.toLowerCase() === 'company_admin';
    const isStaff = userData?.role?.toLowerCase() === 'staff' || userData?.role?.toLowerCase() === 'recruiter';

    return (
        <div className="admin-section">
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>Complaints & Feedback</h3>
                    <p style={{ color: '#4a5568' }}>{isAdmin ? "Review and resolve staff complaints." : "Submit your concerns or feedback securely."}</p>
                </div>
                {isStaff && view === 'list' && (
                    <button
                        className="wp-button primary"
                        onClick={() => setView('submit')}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600' }}
                    >
                        + Submit a Complaint
                    </button>
                )}
                {isStaff && view === 'submit' && (
                    <button
                        className="wp-button"
                        onClick={() => setView('list')}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600' }}
                    >
                        Back to List
                    </button>
                )}
            </div>

            {message.text && (
                <div className={`wp-alert ${message.type}`} style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: '10px',
                    fontWeight: '500',
                    border: 'none',
                    backgroundColor: message.type === 'success' ? '#c6f6d5' : '#fed7d7',
                    color: message.type === 'success' ? '#22543d' : '#822727',
                    whiteSpace: 'pre-wrap'
                }}>
                    {message.text}
                </div>
            )}

            {isStaff && view === 'submit' ? (
                <div className="report-form-container" style={{
                    backgroundColor: 'white',
                    padding: '3rem',
                    borderRadius: '20px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    border: '1px solid #e2e8f0',
                    maxWidth: '1000px',
                    margin: '0 auto'
                }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '2rem' }}>
                            <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Complaint Title</label>
                            <input
                                type="text"
                                name="title"
                                required
                                placeholder="Brief summary of the issue"
                                className="wp-input"
                                style={{ borderRadius: '12px', padding: '1rem', border: '2px solid #e2e8f0', fontSize: '1.1rem', width: '100%' }}
                                value={formData.title}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                            <div style={{ flex: '1' }}>
                                <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Category</label>
                                <select
                                    name="category"
                                    className="wp-input"
                                    style={{ borderRadius: '12px', padding: '1rem', border: '2px solid #e2e8f0', fontSize: '1.1rem', width: '100%', backgroundColor: 'white' }}
                                    value={formData.category}
                                    onChange={handleInputChange}
                                >
                                    <option value="General">🏢 General</option>
                                    <option value="Workplace Safety">🛡️ Workplace Safety</option>
                                    <option value="Harassment">⚠️ Harassment</option>
                                    <option value="Salary/Payment">💰 Salary/Payment</option>
                                    <option value="Management">👔 Management</option>
                                    <option value="Others">📝 Others</option>
                                </select>
                            </div>
                            <div style={{ flex: '1' }}>
                                <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Priority</label>
                                <select
                                    name="priority"
                                    className="wp-input"
                                    style={{ borderRadius: '12px', padding: '1rem', border: '2px solid #e2e8f0', fontSize: '1.1rem', width: '100%', backgroundColor: 'white' }}
                                    value={formData.priority}
                                    onChange={handleInputChange}
                                >
                                    <option value="Low">🟢 Low</option>
                                    <option value="Medium">🟡 Medium</option>
                                    <option value="High">🔴 High</option>
                                    <option value="Urgent">🆘 Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', background: '#f7fafc', padding: '1rem', borderRadius: '12px' }}>
                            <input
                                type="checkbox"
                                name="anonymous"
                                id="anonymous"
                                checked={formData.anonymous}
                                onChange={handleInputChange}
                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                            />
                            <label htmlFor="anonymous" style={{ fontSize: '1rem', fontWeight: '600', color: '#2d3748', cursor: 'pointer' }}>
                                Submit Anonymously (Your name and UID will be hidden from admins)
                            </label>
                        </div>

                        <div style={{ marginBottom: '2.5rem', width: '100%' }}>
                            <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Detailed Description</label>
                            <textarea
                                name="description"
                                required
                                className="wp-input"
                                rows="10"
                                placeholder="Provide as much detail as possible..."
                                style={{
                                    borderRadius: '15px',
                                    padding: '1.5rem',
                                    border: '2px solid #e2e8f0',
                                    fontSize: '1.1rem',
                                    lineHeight: '1.6',
                                    resize: 'vertical',
                                    minHeight: '250px',
                                    backgroundColor: '#fafcfd',
                                    width: '100%',
                                    display: 'block'
                                }}
                                value={formData.description}
                                onChange={handleInputChange}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="wp-button primary"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '12px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                boxShadow: '0 4px 6px -1px rgba(66, 153, 225, 0.4)'
                            }}
                        >
                            {submitting ? 'Submitting...' : '📩 Submit Complaint'}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="requests-list">
                    {isAdmin ? (
                        <div>
                            {Object.entries(groupComplaintsByBranch()).length === 0 ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#718096', background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                                    <p style={{ fontSize: '1.1rem' }}>No complaints found.</p>
                                </div>
                            ) : (
                                Object.entries(groupComplaintsByBranch()).map(([branchName, branchComplaints]) => (
                                    <div key={branchName} style={{ marginBottom: '3rem' }}>
                                        <div style={{
                                            padding: '1rem 2rem',
                                            background: '#f8fafc',
                                            borderLeft: '4px solid #e53e3e',
                                            borderRadius: '8px',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <h4 style={{ margin: 0, color: '#2d3748', fontSize: '1.1rem', fontWeight: '700' }}>🏢 {branchName}</h4>
                                            <span style={{ backgroundColor: '#fed7d7', color: '#c53030', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                                                {branchComplaints.length} Issues
                                            </span>
                                        </div>

                                        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                            {branchComplaints.map((complaint, idx) => (
                                                <CompactComplaintItem
                                                    key={complaint.id}
                                                    complaint={complaint}
                                                    isAdmin={isAdmin}
                                                    onStatusUpdate={handleStatusUpdate}
                                                    isLast={idx === branchComplaints.length - 1}
                                                    onClick={() => setSelectedComplaint(complaint)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div>
                            {complaints.length === 0 ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#718096', background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📩</div>
                                    <p style={{ fontSize: '1.1rem' }}>You haven't submitted any complaints or feedback yet.</p>
                                    <button onClick={() => setView('submit')} style={{ color: '#3182ce', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', marginTop: '1rem', fontWeight: '600' }}>New Complaint</button>
                                </div>
                            ) : (
                                <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                    {complaints.map((complaint, idx) => (
                                        <CompactComplaintItem
                                            key={complaint.id}
                                            complaint={complaint}
                                            isLast={idx === complaints.length - 1}
                                            onClick={() => setSelectedComplaint(complaint)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {selectedComplaint && (
                <ComplaintDetailModal
                    complaint={selectedComplaint}
                    isAdmin={isAdmin}
                    onStatusUpdate={handleStatusUpdate}
                    onClose={() => setSelectedComplaint(null)}
                />
            )}
        </div>
    );
};

const CompactComplaintItem = ({ complaint, isAdmin, onStatusUpdate, isLast, onClick }) => {
    const [processing, setProcessing] = useState(false);

    const getStatusStyles = (status) => {
        switch (status?.toLowerCase()) {
            case 'resolved': return { color: '#48bb78', bg: '#f0fff4' };
            case 'investigating': return { color: '#3182ce', bg: '#ebf8ff' };
            case 'dismissed': return { color: '#718096', bg: '#f7fafc' };
            default: return { color: '#e53e3e', bg: '#fff5f5' };
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'urgent': return '#e53e3e';
            case 'high': return '#dd6b20';
            case 'medium': return '#d69e2e';
            default: return '#38a169';
        }
    };

    const handleQuickAction = async (e, newStatus) => {
        e.stopPropagation();
        if (processing) return;
        setProcessing(true);
        await onStatusUpdate(complaint.id, newStatus, `Quick update to ${newStatus}.`);
        setProcessing(false);
    };

    const statusStyle = getStatusStyles(complaint.status);

    return (
        <div
            onClick={onClick}
            style={{
                padding: '1.25rem 2rem',
                borderBottom: isLast ? 'none' : '1px solid #edf2f7',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background-color 0.2s ease',
                opacity: processing ? 0.6 : 1
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: getPriorityColor(complaint.priority)
                }} title={`Priority: ${complaint.priority}`}></div>
                <div>
                    <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '1rem' }}>{complaint.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '2px' }}>
                        {complaint.category} • {complaint.anonymous ? 'Anonymous' : complaint.userName}
                    </div>
                </div>
                <div style={{
                    marginLeft: '1.5rem',
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    color: statusStyle.color,
                    backgroundColor: statusStyle.bg,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: `1px solid ${statusStyle.color}40`
                }}>
                    {complaint.status}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                {isAdmin && complaint.status === 'Submitted' && !processing && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={(e) => handleQuickAction(e, 'Investigating')}
                            style={{ padding: '4px 10px', borderRadius: '6px', background: '#ebf8ff', color: '#2b6cb0', border: '1px solid #bee3f8', fontSize: '0.75rem', fontWeight: '700' }}
                        >Investigate</button>
                        <button
                            onClick={(e) => handleQuickAction(e, 'Resolved')}
                            style={{ padding: '4px 10px', borderRadius: '6px', background: '#f0fff4', color: '#2f855a', border: '1px solid #c6f6d5', fontSize: '0.75rem', fontWeight: '700' }}
                        >Resolve</button>
                    </div>
                )}

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '500' }}>
                        {new Date(complaint.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ color: '#cbd5e0', fontSize: '0.9rem' }}>›</div>
                </div>
            </div>
        </div>
    );
};

const ComplaintDetailModal = ({ complaint, isAdmin, onStatusUpdate, onClose }) => {
    const [resolution, setResolution] = useState('');
    const [processing, setProcessing] = useState(false);

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'urgent': return '#e53e3e';
            case 'high': return '#dd6b20';
            case 'medium': return '#d69e2e';
            default: return '#38a169';
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: 'white', width: '90%', maxWidth: '800px', maxHeight: '90vh',
                borderRadius: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1a202c' }}>Complaint Details</h4>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>×</button>
                </div>

                <div style={{ padding: '2rem', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'white', background: getPriorityColor(complaint.priority), padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', marginBottom: '8px', display: 'inline-block' }}>
                                {complaint.priority} Priority
                            </span>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1a202c', margin: '0 0 0.5rem 0' }}>{complaint.title}</h2>
                            <div style={{ fontSize: '1rem', color: '#4a5568' }}>
                                Submitted in <strong>{complaint.category}</strong> on {new Date(complaint.submittedAt).toLocaleString()}
                            </div>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', color: '#e53e3e', backgroundColor: '#fff5f5', padding: '6px 16px', borderRadius: '8px', border: '1px solid #feb2b2' }}>
                            {complaint.status}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ background: '#f7fafc', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#718096', textTransform: 'uppercase', marginBottom: '4px' }}>Submitted by</div>
                            <div style={{ fontWeight: '600', color: '#2d3748' }}>{complaint.anonymous ? '🤫 Anonymous' : complaint.userName}</div>
                        </div>
                        <div style={{ background: '#f7fafc', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#718096', textTransform: 'uppercase', marginBottom: '4px' }}>Branch</div>
                            <div style={{ fontWeight: '600', color: '#2d3748' }}>🏢 {complaint.branchName}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#718096', textTransform: 'uppercase', marginBottom: '8px' }}>Complaint Description</div>
                        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '12px', fontSize: '1.05rem', lineHeight: '1.6', color: '#2d3748', whiteSpace: 'pre-wrap' }}>
                            {complaint.description}
                        </div>
                    </div>

                    {complaint.resolution && (
                        <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#2f855a', textTransform: 'uppercase', marginBottom: '4px' }}>Resolution / Response</div>
                            <div style={{ color: '#22543d', lineHeight: '1.5' }}>{complaint.resolution}</div>
                            {complaint.resolvedByAuthor && (
                                <div style={{ fontSize: '0.75rem', color: '#2f855a', marginTop: '8px', fontWeight: '600' }}>
                                    Resolved by {complaint.resolvedByAuthor}
                                </div>
                            )}
                        </div>
                    )}

                    {isAdmin && complaint.status !== 'Resolved' && complaint.status !== 'Dismissed' && (
                        <div style={{ borderTop: '2px solid #edf2f7', paddingTop: '2rem', marginTop: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.75rem' }}>Resolution Notes (Visible to Staff)</label>
                            <textarea
                                className="wp-input"
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                rows="3"
                                placeholder="Explain how the issue was addressed..."
                                style={{ borderRadius: '10px', padding: '1rem', border: '2px solid #e2e8f0', width: '100%', marginBottom: '1.5rem' }}
                            />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {complaint.status !== 'Investigating' && (
                                    <button
                                        className="wp-button"
                                        disabled={processing}
                                        style={{ flex: 1, backgroundColor: '#3182ce', color: 'white', padding: '1rem', border: 'none' }}
                                        onClick={async () => {
                                            setProcessing(true);
                                            await onStatusUpdate(complaint.id, 'Investigating', resolution);
                                            setProcessing(false);
                                        }}
                                    >🔎 Mark Investigating</button>
                                )}
                                <button
                                    className="wp-button primary"
                                    disabled={processing}
                                    style={{ flex: 1, backgroundColor: '#48bb78', padding: '1rem', border: 'none' }}
                                    onClick={async () => {
                                        setProcessing(true);
                                        await onStatusUpdate(complaint.id, 'Resolved', resolution);
                                        setProcessing(false);
                                    }}
                                >✅ Mark Resolved</button>
                                <button
                                    className="wp-button"
                                    disabled={processing}
                                    style={{ flex: 1, backgroundColor: '#718096', color: 'white', padding: '1rem', border: 'none' }}
                                    onClick={async () => {
                                        setProcessing(true);
                                        await onStatusUpdate(complaint.id, 'Dismissed', resolution);
                                        setProcessing(false);
                                    }}
                                >⚪ Dismiss</button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #edf2f7', textAlign: 'right', background: '#f8fafc' }}>
                    <button onClick={onClose} style={{ padding: '0.75rem 2rem', borderRadius: '10px', fontWeight: '600', backgroundColor: '#718096', color: 'white', border: 'none', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default ComplaintsManager;
