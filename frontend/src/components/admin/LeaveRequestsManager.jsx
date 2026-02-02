import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_URL = "http://localhost:5000/api";

const LeaveRequestsManager = () => {
    const { currentUser, userData } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState('list'); // 'list' or 'submit'
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Form State
    const [formData, setFormData] = useState({
        leaveType: 'Vacation',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
        emergencyContact: ''
    });

    useEffect(() => {
        if (currentUser && userData) {
            loadRequests();
        }
    }, [currentUser, userData]);

    const loadRequests = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/leave-requests`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
                setMessage({ type: '', text: '' });
            } else {
                const errorData = await response.json();
                console.error("Leave Request Error:", errorData);
                const errorMessage = errorData.error || 'Failed to fetch requests';
                const debugInfo = errorData.debug
                    ? `\n(Role Detected: "${errorData.debug.detectedRole}", Expected: ${errorData.debug.allowedRoles.join(', ')})`
                    : '';
                setMessage({ type: 'error', text: `${errorMessage}${debugInfo}` });
            }
        } catch (error) {
            console.error("Failed to load requests", error);
            setMessage({ type: 'error', text: 'Connection error. Please check if the backend is running.' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch(`${API_URL}/leave-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Leave request submitted successfully!' });
                setFormData({
                    leaveType: 'Vacation',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    reason: '',
                    emergencyContact: ''
                });
                loadRequests();
                setTimeout(() => setView('list'), 1500);
            } else {
                const err = await response.json();
                setMessage({ type: 'error', text: err.error || 'Failed to submit request' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (requestId, newStatus, comments) => {
        try {
            const response = await fetch(`${API_URL}/leave-requests/${requestId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
                body: JSON.stringify({ status: newStatus, comments }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: `Request ${newStatus} successfully` });
                loadRequests();
                setSelectedRequest(null);
            } else {
                const err = await response.json();
                setMessage({ type: 'error', text: err.error || 'Failed to update status' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        }
    };

    const groupRequestsByBranch = () => {
        return requests.reduce((groups, request) => {
            const branch = request.branchName || 'Unassigned / Main Office';
            if (!groups[branch]) groups[branch] = [];
            groups[branch].push(request);
            return groups;
        }, {});
    };

    if (loading || !userData) return <div className="loading-spinner">Loading leave requests...</div>;

    const isAdmin = userData?.role?.toLowerCase() === 'super_admin' || userData?.role?.toLowerCase() === 'company_admin';
    const isStaff = userData?.role?.toLowerCase() === 'staff' || userData?.role?.toLowerCase() === 'recruiter';

    return (
        <div className="admin-section">
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>Leave Requests</h3>
                    <p style={{ color: '#4a5568' }}>{isAdmin ? "Manage and review staff leave applications." : "Apply for leave and track your requests."}</p>
                </div>
                {isStaff && view === 'list' && (
                    <button
                        className="wp-button primary"
                        onClick={() => setView('submit')}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600' }}
                    >
                        + New Leave Request
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
                    color: message.type === 'success' ? '#22543d' : '#822727'
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
                        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
                            <div style={{ flex: '1' }}>
                                <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Leave Type</label>
                                <select
                                    name="leaveType"
                                    className="wp-input"
                                    style={{ borderRadius: '12px', padding: '1rem', border: '2px solid #e2e8f0', fontSize: '1.1rem', width: '100%', backgroundColor: 'white' }}
                                    value={formData.leaveType}
                                    onChange={handleInputChange}
                                >
                                    <option value="Vacation">🏠 Vacation</option>
                                    <option value="Sick Leave">🤒 Sick Leave</option>
                                    <option value="Personal">🔑 Personal</option>
                                    <option value="Maternity/Paternity">🍼 Maternity/Paternity</option>
                                    <option value="Bereavement">🙏 Bereavement</option>
                                    <option value="Other">📝 Other</option>
                                </select>
                            </div>
                            <div style={{ flex: '1' }}>
                                <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Start Date</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    required
                                    className="wp-input"
                                    style={{ borderRadius: '12px', padding: '1rem', border: '2px solid #e2e8f0', fontSize: '1.1rem', width: '100%' }}
                                    value={formData.startDate}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div style={{ flex: '1' }}>
                                <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>End Date</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    required
                                    className="wp-input"
                                    style={{ borderRadius: '12px', padding: '1rem', border: '2px solid #e2e8f0', fontSize: '1.1rem', width: '100%' }}
                                    value={formData.endDate}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Emergency Contact (Optional)</label>
                            <input
                                type="text"
                                name="emergencyContact"
                                className="wp-input"
                                placeholder="Name and Phone Number"
                                style={{ borderRadius: '12px', padding: '1rem', border: '2px solid #e2e8f0', fontSize: '1.1rem', width: '100%' }}
                                value={formData.emergencyContact}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div style={{ marginBottom: '2.5rem', width: '100%' }}>
                            <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Reason for Leave</label>
                            <textarea
                                name="reason"
                                required
                                className="wp-input"
                                rows="10"
                                placeholder="Explain why you are requesting this leave..."
                                style={{
                                    borderRadius: '15px',
                                    padding: '1.5rem',
                                    border: '2px solid #e2e8f0',
                                    fontSize: '1.1rem',
                                    lineHeight: '1.6',
                                    resize: 'vertical',
                                    minHeight: '300px',
                                    backgroundColor: '#fafcfd',
                                    width: '100%',
                                    display: 'block'
                                }}
                                value={formData.reason}
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
                            {submitting ? 'Submitting...' : '🚀 Submit Request'}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="requests-list">
                    {isAdmin ? (
                        <div>
                            {Object.entries(groupRequestsByBranch()).length === 0 ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#718096', background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                                    <p style={{ fontSize: '1.1rem' }}>No leave requests found.</p>
                                </div>
                            ) : (
                                Object.entries(groupRequestsByBranch()).map(([branchName, branchRequests]) => (
                                    <div key={branchName} style={{ marginBottom: '3rem' }}>
                                        <div style={{
                                            padding: '1rem 2rem',
                                            background: '#f8fafc',
                                            borderLeft: '4px solid #3182ce',
                                            borderRadius: '8px',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <h4 style={{ margin: 0, color: '#2d3748', fontSize: '1.1rem', fontWeight: '700' }}>🏢 {branchName}</h4>
                                            <span style={{ backgroundColor: '#e2e8f0', color: '#4a5568', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                                                {branchRequests.length} Requests
                                            </span>
                                        </div>

                                        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                            {branchRequests.map((request, idx) => (
                                                <CompactLeaveItem
                                                    key={request.id}
                                                    request={request}
                                                    showAuthor={true}
                                                    isAdmin={isAdmin}
                                                    onStatusUpdate={handleStatusUpdate}
                                                    isLast={idx === branchRequests.length - 1}
                                                    onClick={() => setSelectedRequest(request)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div>
                            {requests.length === 0 ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#718096', background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                                    <p style={{ fontSize: '1.1rem' }}>You haven't requested any leave yet.</p>
                                    <button onClick={() => setView('submit')} style={{ color: '#3182ce', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', marginTop: '1rem', fontWeight: '600' }}>Apply for Leave</button>
                                </div>
                            ) : (
                                <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                    {requests.map((request, idx) => (
                                        <CompactLeaveItem
                                            key={request.id}
                                            request={request}
                                            isAdmin={isAdmin}
                                            onStatusUpdate={handleStatusUpdate}
                                            isLast={idx === requests.length - 1}
                                            onClick={() => setSelectedRequest(request)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {selectedRequest && (
                <LeaveDetailModal
                    request={selectedRequest}
                    isAdmin={isAdmin}
                    onStatusUpdate={handleStatusUpdate}
                    onClose={() => setSelectedRequest(null)}
                />
            )}
        </div>
    );
};

const CompactLeaveItem = ({ request, showAuthor, isAdmin, onStatusUpdate, isLast, onClick }) => {
    const [processing, setProcessing] = useState(false);

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return '#48bb78';
            case 'rejected': return '#f56565';
            default: return '#ed8936';
        }
    };

    const handleQuickAction = async (e, newStatus) => {
        e.stopPropagation(); // Prevent opening modal
        if (processing) return;

        setProcessing(true);
        await onStatusUpdate(request.id, newStatus, `Quick ${newStatus} from list.`);
        setProcessing(false);
    };

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
                <div style={{ fontSize: '1.1rem' }}>
                    {request.leaveType === 'Sick Leave' ? '🤒' : '📅'}
                </div>
                <div>
                    <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '1rem' }}>{request.leaveType}</div>
                    {showAuthor && (
                        <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '2px' }}>
                            requested by {request.userName}
                        </div>
                    )}
                </div>
                <div style={{
                    marginLeft: '2rem',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: getStatusColor(request.status),
                    backgroundColor: `${getStatusColor(request.status)}20`,
                    padding: '2px 8px',
                    borderRadius: '4px'
                }}>
                    {request.status}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                {isAdmin && request.status === 'pending' && !processing && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={(e) => handleQuickAction(e, 'approved')}
                            style={{
                                padding: '4px 12px',
                                borderRadius: '6px',
                                background: '#f0fff4',
                                color: '#2f855a',
                                border: '1px solid #c6f6d5',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#c6f6d5'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#f0fff4'}
                        >
                            Approve
                        </button>
                        <button
                            onClick={(e) => handleQuickAction(e, 'rejected')}
                            style={{
                                padding: '4px 12px',
                                borderRadius: '6px',
                                background: '#fff5f5',
                                color: '#c53030',
                                border: '1px solid #fed7d7',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fed7d7'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fff5f5'}
                        >
                            Decline
                        </button>
                    </div>
                )}
                {processing && <span style={{ fontSize: '0.8rem', color: '#718096' }}>Updating...</span>}

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '500' }}>
                        {new Date(request.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(request.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ color: '#cbd5e0', fontSize: '0.9rem' }}>›</div>
                </div>
            </div>
        </div>
    );
};

const LeaveDetailModal = ({ request, isAdmin, onStatusUpdate, onClose }) => {
    const [comments, setComments] = useState('');
    const [processing, setProcessing] = useState(false);

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return '#48bb78';
            case 'rejected': return '#f56565';
            default: return '#ed8936';
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div
                style={{
                    backgroundColor: 'white',
                    width: '90%',
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1a202c' }}>Leave Request Details</h4>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}>×</button>
                </div>

                <div style={{ padding: '2rem', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1a202c', margin: '0 0 0.5rem 0' }}>{request.leaveType}</h2>
                            <div style={{ fontSize: '1.1rem', color: '#4a5568', fontWeight: '600' }}>
                                📅 {new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()}
                                <span style={{ marginLeft: '1rem', color: '#3182ce' }}>({request.daysRequested} Days)</span>
                            </div>
                        </div>
                        <div style={{
                            fontSize: '0.9rem',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            color: getStatusColor(request.status),
                            backgroundColor: `${getStatusColor(request.status)}20`,
                            padding: '6px 16px',
                            borderRadius: '8px',
                            letterSpacing: '1px'
                        }}>
                            {request.status}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ background: '#f7fafc', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#718096', textTransform: 'uppercase', marginBottom: '4px' }}>Requested by</div>
                            <div style={{ fontWeight: '600', color: '#2d3748' }}>{request.userName}</div>
                        </div>
                        <div style={{ background: '#f7fafc', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#718096', textTransform: 'uppercase', marginBottom: '4px' }}>Emergency Contact</div>
                            <div style={{ fontWeight: '600', color: '#2d3748' }}>{request.emergencyContact || 'None provided'}</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#718096', textTransform: 'uppercase', marginBottom: '8px' }}>Reason for Leave</div>
                        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '12px', fontSize: '1.1rem', lineHeight: '1.7', color: '#2d3748', whiteSpace: 'pre-wrap' }}>
                            {request.reason}
                        </div>
                    </div>

                    {request.status !== 'pending' && request.comments && (
                        <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c05621', textTransform: 'uppercase', marginBottom: '4px' }}>Admin Comments</div>
                            <div style={{ color: '#7b341e' }}>{request.comments}</div>
                        </div>
                    )}

                    {isAdmin && request.status === 'pending' && (
                        <div style={{ borderTop: '2px solid #edf2f7', paddingTop: '2rem', marginTop: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.75rem' }}>Admin Decision Comments (Optional)</label>
                            <textarea
                                className="wp-input"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                rows="3"
                                placeholder="Add any comments regarding your approval or rejection..."
                                style={{ borderRadius: '10px', padding: '1rem', border: '2px solid #e2e8f0', width: '100%', marginBottom: '1.5rem' }}
                            />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    className="wp-button primary"
                                    disabled={processing}
                                    style={{ flex: 1, backgroundColor: '#48bb78', padding: '1rem', border: 'none' }}
                                    onClick={async () => {
                                        setProcessing(true);
                                        await onStatusUpdate(request.id, 'approved', comments);
                                        setProcessing(false);
                                    }}
                                >
                                    ✅ Approve Request
                                </button>
                                <button
                                    className="wp-button"
                                    disabled={processing}
                                    style={{ flex: 1, backgroundColor: '#f56565', color: 'white', padding: '1rem', border: 'none' }}
                                    onClick={async () => {
                                        setProcessing(true);
                                        await onStatusUpdate(request.id, 'rejected', comments);
                                        setProcessing(false);
                                    }}
                                >
                                    ❌ Reject Request
                                </button>
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

export default LeaveRequestsManager;
