import React from 'react';
import { Link } from 'react-router-dom';
import CategoryManager from '../components/admin/CategoryManager';

const AdminDashboard = () => {
    return (
        <div className="admin-dashboard-container">
            <header className="admin-header">
                <h1>Admin Dashboard</h1>
                <p>Manage your job portal content.</p>
            </header>

            <div className="dashboard-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '2rem'
            }}>
                <div className="dashboard-card" style={{
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ marginBottom: '10px', color: '#333' }}>Job Management</h3>
                    <p style={{ marginBottom: '15px', color: '#666' }}>Manage job postings, approvals, and content.</p>
                    <Link to="/dashboard/posts" className="btn-primary" style={{
                        display: 'inline-block',
                        backgroundColor: '#007bff',
                        color: 'white',
                        padding: '8px 16px',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>Manage Jobs</Link>
                </div>

                <div className="dashboard-card" style={{
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ marginBottom: '10px', color: '#333' }}>Categories</h3>
                    <p style={{ marginBottom: '15px', color: '#666' }}>Organize jobs by categories.</p>
                    <Link to="/dashboard/categories" className="btn-primary" style={{
                        display: 'inline-block',
                        backgroundColor: '#007bff',
                        color: 'white',
                        padding: '8px 16px',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>Manage Categories</Link>
                </div>

                <div className="dashboard-card" style={{
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ marginBottom: '10px', color: '#333' }}>Applications</h3>
                    <p style={{ marginBottom: '15px', color: '#666' }}>Review and manage job applications.</p>
                    <Link to="/dashboard/applications" className="btn-primary" style={{
                        display: 'inline-block',
                        backgroundColor: '#007bff',
                        color: 'white',
                        padding: '8px 16px',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>View Applications</Link>
                </div>

                <div className="dashboard-card" style={{
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ marginBottom: '10px', color: '#333' }}>User Management</h3>
                    <p style={{ marginBottom: '15px', color: '#666' }}>Manage users and permissions.</p>
                    <Link to="/dashboard/users" className="btn-primary" style={{
                        display: 'inline-block',
                        backgroundColor: '#007bff',
                        color: 'white',
                        padding: '8px 16px',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}>Manage Users</Link>
                </div>
            </div>

            <section className="admin-section">
                <CategoryManager />
            </section>

            <section className="admin-section">
                <h3>Job Statistics</h3>
                <p>Coming soon...</p>
            </section>
        </div>
    );
};

export default AdminDashboard;
