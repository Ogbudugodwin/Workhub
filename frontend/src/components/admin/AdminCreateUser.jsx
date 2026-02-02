import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import NoPermission from '../NoPermission';

const AdminCreateUser = () => {
    const { currentUser, userData } = useAuth();
    const { loadUsers } = useOutletContext();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        companyId: '',
        branchIds: [], // Changed from branchId to branchIds array
        privileges: []
    });
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const API_URL = "http://localhost:5000/api";

    // Load branches on component mount if user is company admin
    useEffect(() => {
        if (currentUser && userData?.role === 'company_admin') {
            loadBranches();
        }
    }, [currentUser, userData]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));

        // Load branches when role changes to staff
        if (id === 'role' && value === 'staff') {
            loadBranches();
        }
    };

    const handleBranchToggle = (branchId) => {
        setFormData(prev => {
            const branchIds = prev.branchIds.includes(branchId)
                ? prev.branchIds.filter(id => id !== branchId)
                : [...prev.branchIds, branchId];
            return { ...prev, branchIds };
        });
    };

    const loadBranches = async () => {
        if (!currentUser) return;

        console.log('[AdminCreateUser] Loading branches for user:', currentUser.uid);
        setLoadingBranches(true);
        try {
            const response = await fetch(`${API_URL}/branches`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[AdminCreateUser] Branches loaded:', data.length, 'branches');
                setBranches(data);
            } else {
                const error = await response.json();
                console.error('[AdminCreateUser] Failed to load branches:', error);
                setMessage({ type: 'error', text: error.error || 'Failed to load branches' });
            }
        } catch (error) {
            console.error("[AdminCreateUser] Failed to load branches", error);
            setMessage({ type: 'error', text: 'Failed to load branches. Please try again.' });
        } finally {
            setLoadingBranches(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (!currentUser) {
            setMessage({ type: 'error', text: 'You must be logged in to create a user.' });
            setLoading(false);
            return;
        }

        const getDefaultPrivileges = (role) => {
            switch (role) {
                case 'company_admin':
                    return [
                        'view_jobs', 'create_jobs', 'edit_jobs', 'delete_jobs', 'publish_jobs',
                        'view_applications', 'manage_applications',
                        'view_users', 'create_users', 'edit_users', 'delete_users',
                        'view_attendance', 'manage_attendance',
                        'view_branches', 'manage_branches',
                        'view_categories', 'manage_categories',
                        'view_reports', 'manage_reports',
                        'view_leave', 'manage_leave',
                        'view_complaints', 'manage_complaints'
                    ];
                case 'recruiter':
                    return [
                        'view_jobs', 'create_jobs', 'edit_jobs', 'publish_jobs',
                        'view_applications', 'manage_applications',
                        'view_categories'
                    ];
                case 'staff':
                    return [
                        'view_attendance', 'manage_attendance', // Required for clock-in
                        'view_reports', 'manage_reports',
                        'view_leave', 'manage_leave',
                        'view_complaints', 'manage_complaints'
                    ];
                default:
                    return [];
            }
        };

        try {
            const body = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                companyId: formData.role === 'company_admin' ? formData.companyId : null,
                branchIds: formData.role === 'staff' ? formData.branchIds : [],
                companyDetails: formData.role === 'company' ? { name: formData.companyName } : null,
                privileges: getDefaultPrivileges(formData.role) // Auto-assign defaults
            };

            const response = await fetch(`${API_URL}/users/admin-create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid
                },
                body: JSON.stringify(body),
            });

            let data;
            try {
                data = await response.json();
            } catch (pErr) {
                data = { error: "Invalid response from server. Check backend logs." };
            }

            if (response.ok) {
                setMessage({ type: 'success', text: 'Account created successfully!' });
                setFormData({ name: '', email: '', password: '', role: 'staff', companyId: '', branchIds: [], privileges: [] });
                loadUsers(); // Refresh the user list
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to create account' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Server error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    // Check if user has permission to create users
    if (userData && userData.role === 'company_admin' && !(userData.privileges || []).includes('create_users')) {
        return <NoPermission feature="user creation" />;
    }

    return (
        <div className="admin-section">
            <div className="manager-header">
                <h3>Create New Account</h3>
                <p>Register a new Company or individual Recruiter account.</p>
            </div>

            {message.text && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    borderRadius: '4px',
                    backgroundColor: message.type === 'success' ? '#e6ffe6' : '#ffe6e6',
                    color: message.type === 'success' ? '#2e7d32' : '#c62828',
                    border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" style={{ margin: '0' }}>
                <div className="form-group">
                    <label htmlFor="role">Account Type</label>
                    <select
                        id="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="form-control"
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd' }}
                    >
                        <option value="recruiter">Individual (Recruiter)</option>
                        <option value="company_admin">Company Admin</option>
                        <option value="staff">Staff</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="name">{formData.role === 'company' ? 'Company Name' : 'Full Name'}</label>
                    <input
                        type="text"
                        id="name"
                        placeholder={formData.role === 'company' ? 'Enter company name' : 'Enter full name'}
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        placeholder="Enter email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        placeholder="Set a temporary password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                {formData.role === 'company_admin' && (
                    <div className="form-group">
                        <label htmlFor="companyId">Company ID</label>
                        <input
                            type="text"
                            id="companyId"
                            placeholder="Enter existing company ID"
                            value={formData.companyId}
                            onChange={handleChange}
                            required
                        />
                    </div>
                )}

                {formData.role === 'staff' && (
                    <div className="form-group">
                        <label>Assign to Branch(es) *</label>
                        {loadingBranches ? (
                            <div style={{ padding: '1rem', color: '#666' }}>Loading branches...</div>
                        ) : (
                            <div style={{
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '1rem',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                backgroundColor: '#f8f9fa'
                            }}>
                                {branches.length === 0 ? (
                                    <div style={{ color: '#dc3545', fontSize: '0.9rem' }}>
                                        No branches available. Please create a branch first in Branch Management.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {branches.map(branch => (
                                            <label
                                                key={branch.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '0.75rem',
                                                    backgroundColor: 'white',
                                                    borderRadius: '6px',
                                                    border: formData.branchIds.includes(branch.id) ? '2px solid #007bff' : '1px solid #ddd',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!formData.branchIds.includes(branch.id)) {
                                                        e.currentTarget.style.borderColor = '#007bff';
                                                        e.currentTarget.style.backgroundColor = '#f0f8ff';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!formData.branchIds.includes(branch.id)) {
                                                        e.currentTarget.style.borderColor = '#ddd';
                                                        e.currentTarget.style.backgroundColor = 'white';
                                                    }
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.branchIds.includes(branch.id)}
                                                    onChange={() => handleBranchToggle(branch.id)}
                                                    style={{
                                                        marginRight: '12px',
                                                        width: '18px',
                                                        height: '18px',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold', color: '#333' }}>{branch.name}</div>
                                                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                                                        {branch.address || 'No address specified'}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                            Select one or more branches to assign this staff member to. They can clock in at any selected branch.
                        </small>
                        {formData.branchIds.length > 0 && (
                            <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                backgroundColor: '#e7f3ff',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                color: '#0066cc'
                            }}>
                                ✓ {formData.branchIds.length} branch{formData.branchIds.length > 1 ? 'es' : ''} selected
                            </div>
                        )}
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                    <button type="submit" className="auth-btn" disabled={loading} style={{ width: 'auto', padding: '0.8rem 2rem' }}>
                        {loading ? 'Creating...' : 'Create Account'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminCreateUser;
