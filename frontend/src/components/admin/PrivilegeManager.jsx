import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivilegeManager = () => {
    const { uid } = useParams();
    const { currentUser } = useAuth();
    const [user, setUser] = useState(null);
    const [privileges, setPrivileges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const API_URL = "http://localhost:5000/api";

    // Define available privileges based on user role
    const getAvailablePrivileges = (role) => {
        const allPrivileges = {
            // Job Management
            'view_jobs': 'View Jobs',
            'create_jobs': 'Create Jobs',
            'edit_jobs': 'Edit Jobs',
            'delete_jobs': 'Delete Jobs',
            'publish_jobs': 'Publish Jobs',

            // User Management
            'view_users': 'View Users',
            'create_users': 'Create Users',
            'edit_users': 'Edit Users',
            'delete_users': 'Delete Users',

            // CRM
            'view_attendance': 'View Attendance',
            'manage_attendance': 'Manage Attendance',
            'view_reports': 'View Work Reports',
            'manage_reports': 'Manage Work Reports',
            'view_leave': 'View Leave Requests',
            'manage_leave': 'Manage Leave Requests',
            'view_complaints': 'View Complaints',
            'manage_complaints': 'Manage Complaints',

            // Applications
            'view_applications': 'View Applications',
            'manage_applications': 'Manage Applications',

            // Categories
            'view_categories': 'View Categories',
            'manage_categories': 'Manage Categories',

            // Branches
            'view_branches': 'View Branches',
            'manage_branches': 'Manage Branches',

            // Customer Management (CRM)
            'view_customers': 'View Customers',
            'manage_customers': 'Manage Customers', // Includes create/edit/delete

            // Email Marketing
            'view_email_marketing': 'Access Email Marketing',
            'manage_campaigns': 'Manage Campaigns',
            'manage_templates': 'Manage Templates',
            'manage_lists': 'Manage Email Lists',

            // Communication
            'view_chat': 'Access Communication (Chat)'
        };

        // Filter privileges based on role
        if (role === 'super_admin') {
            return allPrivileges; // Super admin gets all
        } else if (role === 'company_admin') {
            // Company admin gets most privileges except user management (limited)
            return Object.fromEntries(
                Object.entries(allPrivileges).filter(([key]) =>
                    !key.includes('users') || ['view_users', 'create_users', 'edit_users', 'delete_users'].includes(key)
                )
            );
        } else if (role === 'recruiter') {
            // Recruiter gets job and application related privileges by default, but can now receive CRM/Emailing/Chat permissions if needed
            return Object.fromEntries(
                Object.entries(allPrivileges).filter(([key]) =>
                    // Core Recruiter Privileges
                    key.includes('jobs') || key.includes('applications') || key.includes('categories') ||
                    // Extended Capability Options
                    key.includes('attendance') || key.includes('reports') ||
                    key.includes('leave') || key.includes('complaints') ||
                    key.includes('customers') ||
                    key.includes('email_marketing') || key.includes('campaigns') || key.includes('templates') || key.includes('lists') ||
                    key.includes('chat')
                )
            );
        } else if (role === 'staff') {
            // Staff gets CRM related privileges + Email Marketing + Chat if needed
            return Object.fromEntries(
                Object.entries(allPrivileges).filter(([key]) =>
                    key.includes('attendance') || key.includes('reports') ||
                    key.includes('leave') || key.includes('complaints') ||
                    key.includes('customers') ||
                    key.includes('email_marketing') || key.includes('campaigns') || key.includes('templates') || key.includes('lists') ||
                    key.includes('chat')
                )
            );
        }

        return {};
    };

    useEffect(() => {
        if (currentUser) {
            loadUser();
        }
    }, [uid, currentUser]);

    const loadUser = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/users/${uid}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser?.uid
                },
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                setPrivileges(userData.privileges || []);
            }
        } catch (error) {
            console.error("Failed to load user", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrivilegeChange = (privilege, checked) => {
        if (checked) {
            setPrivileges(prev => [...prev, privilege]);
        } else {
            setPrivileges(prev => prev.filter(p => p !== privilege));
        }
    };

    const savePrivileges = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/users/${uid}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser?.uid
                },
                body: JSON.stringify({ privileges }),
            });

            if (response.ok) {
                alert('Privileges updated successfully');
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update privileges');
            }
        } catch (error) {
            console.error("Failed to save privileges", error);
            alert('Failed to save privileges');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading user privileges...</div>;
    if (!user) return <div>User not found</div>;

    const availablePrivileges = getAvailablePrivileges(user.role);

    return (
        <div className="admin-section">
            <div className="manager-header">
                <h3>Manage Privileges</h3>
                <p>Configure privileges for {user.name} ({user.role})</p>
            </div>

            <div className="privilege-manager">
                <div className="user-info" style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                    <h4>User Information</h4>
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Role:</strong> {user.role}</p>
                    <p><strong>Company:</strong> {user.companyId || 'N/A'}</p>
                    <p><strong>UID:</strong> {user.uid || user.id}</p>
                </div>

                <div className="privileges-section">
                    <h4>Privileges</h4>
                    <p>Select the privileges this user should have:</p>

                    <div className="privileges-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                        {Object.entries(availablePrivileges).map(([key, label]) => (
                            <div key={key} className="privilege-item" style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={privileges.includes(key)}
                                        onChange={(e) => handlePrivilegeChange(key, e.target.checked)}
                                        style={{ marginRight: '10px' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{label}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{key}</div>
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>

                    {Object.keys(availablePrivileges).length === 0 && (
                        <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                            No privileges available for {user.role} role
                        </p>
                    )}
                </div>

                <div className="actions" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #ddd' }}>
                    <button
                        onClick={savePrivileges}
                        disabled={saving}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Privileges'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivilegeManager;
