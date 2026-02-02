import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import NoPermission from '../NoPermission';

const ApplicationsManager = () => {
    const { currentUser, userData } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser) {
            loadApplications();
        }
    }, [currentUser]);

    const loadApplications = async () => {
        // Basic Authorization Gate
        if (!currentUser) return;

        // Strict Privilege Check (Optional optimization to save network call, backend checks too)
        if (userData && userData.role !== 'super_admin' && !(userData.privileges || []).includes('view_applications')) {
            console.warn("Unauthorized access attempt to Applications Manager");
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/applications', {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid
                }
            });

            if (response.ok) {
                const data = await response.json();
                setApplications(data);
            } else {
                console.error("Failed to load applications:", response.status);
                if (response.status === 403 || response.status === 401) {
                    // Could handle error state here
                }
            }
        } catch (error) {
            console.error("Failed to load applications", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading applications...</div>;

    // Check if user has access to view this section (UI level protection)
    if (userData && userData.role !== 'super_admin' && !(userData.privileges || []).includes('view_applications')) {
        return <NoPermission feature="job applications" />;
    }

    return (
        <div className="admin-section">
            <div className="manager-header">
                <h3>Job Applications</h3>
                <p>View and manage job applications submitted by users.</p>
            </div>

            <div className="table-responsive">
                <table className="wp-table">
                    <thead>
                        <tr>
                            <th>Applicant</th>
                            <th>Job ID</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Experience</th>
                            <th>Salary Expectation</th>
                            <th>Resume</th>
                            <th>Submitted At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applications.map(app => (
                            <tr key={app.id}>
                                <td>{app.name}</td>
                                <td>{app.jobId}</td>
                                <td>{app.email}</td>
                                <td>{app.phone || 'N/A'}</td>
                                <td>{app.yearsOfExperience || 'N/A'} years</td>
                                <td>{app.salaryExpectation || 'N/A'}</td>
                                <td>
                                    {app.resume ? (
                                        <a href={`http://localhost:5000/${app.resume}`} target="_blank" rel="noopener noreferrer">
                                            View Resume
                                        </a>
                                    ) : 'N/A'}
                                </td>
                                <td>{new Date(app.submittedAt || app.appliedAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {applications.length === 0 && (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#777' }}>No applications found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ApplicationsManager;
