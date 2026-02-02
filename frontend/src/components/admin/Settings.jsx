import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const Settings = () => {
    const { userData, currentUser } = useAuth();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (userData) {
            setName(userData.name || '');
        }
    }, [userData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`http://localhost:5000/api/users/${currentUser.uid}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid
                },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                setMessage('Profile updated successfully');
                // Ideally reload user context here, but for now just show message
            } else {
                const data = await response.json();
                setMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('Failed to update profile', error);
            setMessage('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-section">
            <div className="manager-header">
                <h3>Account Settings</h3>
                <p>Manage your personal profile and settings.</p>
            </div>

            <div style={{ maxWidth: '600px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
                        <input
                            type="email"
                            value={currentUser?.email || ''}
                            disabled
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f5f5f5', color: '#666' }}
                        />
                        <small style={{ color: '#888' }}>Email cannot be changed directly.</small>
                    </div>

                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Role</label>
                        <input
                            type="text"
                            value={userData?.role || ''}
                            disabled
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f5f5f5', color: '#666' }}
                        />
                    </div>

                    {userData?.companyId && (
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Company ID</label>
                            <input
                                type="text"
                                value={userData.companyId}
                                disabled
                                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f5f5f5', color: '#666' }}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>

                    {message && (
                        <div style={{ marginTop: '15px', padding: '10px', borderRadius: '4px', backgroundColor: message.includes('Error') ? '#fee2e2' : '#dcfce7', color: message.includes('Error') ? '#b91c1c' : '#15803d' }}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Settings;
