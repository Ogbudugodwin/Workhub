import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_URL = "http://localhost:5000/api";

const WorkReportsManager = () => {
    const { currentUser, userData } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [view, setView] = useState('list'); // 'list' or 'submit'
    const [selectedReport, setSelectedReport] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Form State: Only Title, Description, and Date
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (currentUser && userData) {
            loadReports();
        }
    }, [currentUser, userData]);

    const loadReports = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/work-reports`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setReports(data);
                setMessage({ type: '', text: '' }); // Clear any errors on success
            } else {
                const errorData = await response.json();
                console.error("Backend Error Data:", errorData);
                let errorMessage = errorData.message || errorData.error || 'Failed to fetch reports';
                let errorDetail = errorData.details ? `. Details: ${errorData.details}` : '';

                // If it's a 500 error, display more raw information
                if (response.status === 500) {
                    errorMessage = `Server Error (500): ${errorData.message || 'An unexpected server error occurred.'}`;
                    if (errorData.stack) {
                        errorDetail += ` Stack: ${errorData.stack}`;
                    } else if (JSON.stringify(errorData).length > 200) { // If errorData is large, show it
                        errorDetail += ` Raw: ${JSON.stringify(errorData)}`;
                    }
                }

                setMessage({
                    type: 'error',
                    text: `${errorMessage}${errorDetail}. (Status: ${response.status})`
                });
            }
        } catch (error) {
            console.error("Frontend Fetch Error:", error);
            setMessage({ type: 'error', text: `System Error: ${error.message}. Please check your connection.` });
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
            const response = await fetch(`${API_URL}/work-reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Report submitted successfully!' });
                setFormData({
                    title: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0]
                });
                loadReports();
                setTimeout(() => setView('list'), 1500);
            } else {
                const err = await response.json();
                setMessage({ type: 'error', text: err.error || 'Failed to submit report' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setSubmitting(false);
        }
    };

    const groupReportsByBranch = () => {
        return reports.reduce((groups, report) => {
            const branch = report.branchName || 'Unassigned / Main Office';
            if (!groups[branch]) groups[branch] = [];
            groups[branch].push(report);
            return groups;
        }, {});
    };

    if (loading || !userData) return <div className="loading-spinner">Loading work reports...</div>;

    // Explicit check for staff role vs admin roles
    const isAdmin = userData?.role === 'super_admin' || userData?.role === 'company_admin';
    const isStaff = userData?.role === 'staff' || userData?.role === 'recruiter';

    return (
        <div className="admin-section">
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>Work Reports</h3>
                    <p style={{ color: '#4a5568' }}>{isAdmin ? "Monitor staff daily performance and progress." : "Log your daily progress and tasks."}</p>
                </div>
                {isStaff && view === 'list' && (
                    <button
                        className="wp-button primary"
                        onClick={() => setView('submit')}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600' }}
                    >
                        + Submit New Report
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
                // ... submission form remains the same ...
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
                            <div style={{ flex: '2' }}>
                                <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Report Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    className="wp-input"
                                    placeholder="Enter a descriptive title..."
                                    style={{
                                        borderRadius: '12px',
                                        padding: '1rem',
                                        border: '2px solid #e2e8f0',
                                        fontSize: '1.1rem',
                                        width: '100%'
                                    }}
                                    value={formData.title}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div style={{ flex: '1' }}>
                                <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Date of Work</label>
                                <input
                                    type="date"
                                    name="date"
                                    required
                                    className="wp-input"
                                    style={{
                                        borderRadius: '12px',
                                        padding: '1rem',
                                        border: '2px solid #e2e8f0',
                                        fontSize: '1.1rem',
                                        width: '100%'
                                    }}
                                    value={formData.date}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '2.5rem', width: '100%' }}>
                            <label className="wp-label" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a202c', marginBottom: '0.75rem', display: 'block' }}>Report Description</label>
                            <textarea
                                name="description"
                                required
                                className="wp-input"
                                rows="15"
                                placeholder="Provide a detailed breakdown of your activities..."
                                style={{
                                    borderRadius: '15px',
                                    padding: '1.5rem',
                                    border: '2px solid #e2e8f0',
                                    fontSize: '1.1rem',
                                    lineHeight: '1.6',
                                    resize: 'vertical',
                                    minHeight: '450px',
                                    backgroundColor: '#fafcfd',
                                    width: '100%',
                                    display: 'block'
                                }}
                                value={formData.description}
                                onChange={handleInputChange}
                            />
                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#718096', textAlign: 'right' }}>
                                Feel free to be descriptive. The box will expand as you type.
                            </div>
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
                            {submitting ? 'Submitting...' : '🚀 Submit Report'}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="reports-list">
                    {isAdmin ? (
                        <div>
                            {Object.entries(groupReportsByBranch()).length === 0 ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#718096', background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                                    <p style={{ fontSize: '1.1rem' }}>No work reports have been submitted yet.</p>
                                </div>
                            ) : (
                                Object.entries(groupReportsByBranch()).map(([branchName, branchReports]) => (
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
                                                {branchReports.length} Reports
                                            </span>
                                        </div>

                                        <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                            {branchReports.map((report, idx) => (
                                                <CompactReportItem
                                                    key={report.id}
                                                    report={report}
                                                    showAuthor={true}
                                                    isLast={idx === branchReports.length - 1}
                                                    onClick={() => setSelectedReport(report)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div>
                            {reports.length === 0 ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#718096', background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                                    <p style={{ fontSize: '1.1rem' }}>You haven't submitted any reports yet.</p>
                                    <button onClick={() => setView('submit')} style={{ color: '#3182ce', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', marginTop: '1rem', fontWeight: '600' }}>Submit your first report</button>
                                </div>
                            ) : (
                                <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                                    {reports.map((report, idx) => (
                                        <CompactReportItem
                                            key={report.id}
                                            report={report}
                                            isLast={idx === reports.length - 1}
                                            onClick={() => setSelectedReport(report)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {selectedReport && (
                <ReportDetailModal
                    report={selectedReport}
                    onClose={() => setSelectedReport(null)}
                />
            )}
        </div>
    );
};


const CompactReportItem = ({ report, showAuthor, isLast, onClick }) => {
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
                transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                <div style={{ color: '#3182ce', fontSize: '1.1rem' }}>📄</div>
                <div>
                    <div style={{ fontWeight: '600', color: '#2d3748', fontSize: '1rem' }}>{report.title}</div>
                    {showAuthor && (
                        <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '2px' }}>
                            by {report.userName}
                        </div>
                    )}
                </div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '500' }}>
                    {new Date(report.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ color: '#cbd5e0', fontSize: '0.9rem' }}>›</div>
            </div>
        </div>
    );
};

const ReportDetailModal = ({ report, onClose }) => {
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
                    maxHeight: '85vh',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid #edf2f7',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc'
                }}>
                    <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#1a202c' }}>Report Details</h4>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#a0aec0' }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ padding: '2rem', overflowY: 'auto' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1a202c', margin: '0 0 1rem 0', lineHeight: '1.2' }}>
                            {report.title}
                        </h2>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '0.9rem', color: '#4a5568', background: '#edf2f7', padding: '4px 12px', borderRadius: '6px', fontWeight: '600' }}>
                                📅 Work Date: {new Date(report.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#4a5568', background: '#edf2f7', padding: '4px 12px', borderRadius: '6px', fontWeight: '600' }}>
                                👤 Staff: {report.userName}
                            </div>
                        </div>
                    </div>

                    <div style={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        lineHeight: '1.7',
                        color: '#2d3748',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {report.description}
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>
                            ID: {report.id}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#718096', fontStyle: 'italic' }}>
                            Submitted {new Date(report.submittedAt).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #edf2f7', textAlign: 'right' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.75rem 2rem',
                            borderRadius: '10px',
                            fontWeight: '600',
                            backgroundColor: '#3182ce',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Close Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkReportsManager;
