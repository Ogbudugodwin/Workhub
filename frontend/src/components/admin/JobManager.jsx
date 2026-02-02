import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchJobs, deleteJob, updateJobStatus, fetchCategories } from '../../services/job.service';
import { useAuth } from '../../context/AuthContext';
import NoPermission from '../NoPermission';

// Utility to check if user has a specific privilege
const hasPrivilege = (user, privilege) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true; // Super admin has all privileges
    return (user.privileges || []).includes(privilege);
};

const JobManager = () => {
    const [jobs, setJobs] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentUser, userData } = useAuth();
    const [declineModal, setDeclineModal] = useState({ isOpen: false, jobId: null, reason: '' });
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const categoryFilter = queryParams.get('category');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [jobsData, catsData] = await Promise.all([
                fetchJobs(currentUser.uid),
                fetchCategories()
            ]);
            setCategories(catsData);
            let jobsWithCategory = jobsData.map(job => {
                const cat = catsData.find(c => c.id === job.categoryId);
                return {
                    ...job,
                    category: cat ? cat.name : 'Unknown Category'
                };
            });
            if (categoryFilter) {
                jobsWithCategory = jobsWithCategory.filter(job => job.categoryId === categoryFilter);
            }
            setJobs(jobsWithCategory);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    // Check if user has permission to view jobs
    if (userData && userData.role !== 'super_admin' && !hasPrivilege(userData, 'view_jobs')) {
        return <NoPermission feature="job posts" />;
    }

    const getCategoryName = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat ? cat.name : 'Unknown Category';
    };

    const loadJobs = async () => {
        try {
            const [data, catsData] = await Promise.all([
                fetchJobs(currentUser.uid),
                fetchCategories() // Refetch categories to ensure we have latest names
            ]);
            setCategories(catsData);
            let filteredJobs = data.map(job => {
                const cat = catsData.find(c => c.id === job.categoryId);
                return {
                    ...job,
                    category: cat ? cat.name : 'Unknown Category'
                };
            });
            if (categoryFilter) {
                filteredJobs = filteredJobs.filter(job => job.categoryId === categoryFilter);
            }
            setJobs(filteredJobs);
        } catch (error) {
            console.error("Failed to load jobs", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this job post?")) return;
        try {
            await deleteJob(id, currentUser.uid);
            setJobs(jobs.filter(job => job.id !== id));
        } catch (error) {
            alert("Delete failed");
        }
    };

    const handleStatusChange = async (id, status, reason = null) => {
        try {
            await updateJobStatus(id, status, reason, currentUser.uid);
            setDeclineModal({ isOpen: false, jobId: null, reason: '' });
            await loadJobs();
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'published': return '#e6fffa';
            case 'declined': return '#fff5f5';
            case 'pending': return '#fffaf0';
            default: return '#f7fafc';
        }
    };

    const getStatusTextColor = (status) => {
        switch (status) {
            case 'published': return '#2c7a7b';
            case 'declined': return '#c53030';
            case 'pending': return '#b7791f';
            default: return '#4a5568';
        }
    };

    const categoryName = categoryFilter ? getCategoryName(categoryFilter) : null;

    if (loading) return <div className="loading-spinner">Loading job posts...</div>;

    return (
        <div className="admin-section">
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3>Job Postings {categoryName && ` - ${categoryName}`}</h3>
                    <p>Manage all job listings and their statuses{categoryName && ` in ${categoryName} category`}.</p>
                </div>
                {hasPrivilege(userData, 'create_jobs') && (
                    <Link to="/dashboard/posts/new" className="btn-add" style={{ textDecoration: 'none' }}>
                        + New Post
                    </Link>
                )}
            </div>

            <div className="table-responsive">
                <table className="wp-table">
                    <thead>
                        <tr>
                            <th>Job Title</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Posted By</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map(job => (
                            <tr key={job.id}>
                                <td>
                                    <strong>{job.title}</strong>
                                    <div style={{ fontSize: '0.8rem', color: '#777' }}>Slug: {job.slug}</div>
                                </td>
                                <td>{job.category}</td>
                                <td>
                                    <span style={{
                                        background: getStatusColor(job.status),
                                        color: getStatusTextColor(job.status),
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        textTransform: 'capitalize'
                                    }}>
                                        {job.status}
                                    </span>
                                    {job.status === 'declined' && job.declineReason && (
                                        <div style={{ fontSize: '0.75rem', color: '#c53030', marginTop: '4px', maxWidth: '200px' }}>
                                            Reason: {job.declineReason}
                                        </div>
                                    )}
                                </td>
                                <td>{job.companyName || 'Individual'}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <Link to={`/jobs/${job.id}`} target="_blank" className="btn-view" style={{ textDecoration: 'none', color: '#2563eb' }}>View</Link>
                                        <Link to={`/dashboard/posts/edit/${job.id}`} className="btn-edit" style={{ textDecoration: 'none', color: '#0073aa' }}>Edit</Link>

                                        {hasPrivilege(userData, 'publish_jobs') && job.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange(job.id, 'published')}
                                                    style={{ background: '#38a169', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => setDeclineModal({ isOpen: true, jobId: job.id, reason: '' })}
                                                    style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Decline
                                                </button>
                                            </>
                                        )}

                                        <button
                                            onClick={() => handleDelete(job.id)}
                                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {jobs.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#777' }}>No jobs found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Decline Reason Modal (Simplified) */}
            {declineModal.isOpen && (
                <div className="wp-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%' }}>
                        <h4>Decline Job Post</h4>
                        <p style={{ fontSize: '0.9rem', color: '#666' }}>Please provide a reason for declining this post so the user can fix it.</p>
                        <textarea
                            value={declineModal.reason}
                            onChange={(e) => setDeclineModal({ ...declineModal, reason: e.target.value })}
                            placeholder="Reason for decline..."
                            style={{ width: '100%', height: '100px', margin: '1rem 0', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setDeclineModal({ isOpen: false, jobId: null, reason: '' })} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                            <button
                                onClick={() => handleStatusChange(declineModal.jobId, 'declined', declineModal.reason)}
                                style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Submit Decline
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobManager;
