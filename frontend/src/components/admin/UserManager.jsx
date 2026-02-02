import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';

const UserManager = () => {
    const { users, loadingUsers } = useOutletContext();

    if (loadingUsers) return <div>Loading users...</div>;

    return (
        <div className="admin-section">
            <div className="manager-header">
                <h3>Registered Users</h3>
                <p>View all users stored in Firestore.</p>
            </div>

            <div className="table-responsive">
                <table className="wp-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>
                                    <span style={{
                                        background: ['admin', 'super_admin'].includes(user.role) ? '#e3f2fd' : '#f5f5f5',
                                        color: ['admin', 'super_admin'].includes(user.role) ? '#1976d2' : '#666',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem'
                                    }}>
                                        {user.role}
                                    </span>
                                </td>
                                <td style={{ fontSize: '0.9rem', color: '#777' }}>
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td>
                                    <Link to={`/dashboard/users/${user.id}`} className="btn-sm">
                                        Manage
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                    No users found in database.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManager;
