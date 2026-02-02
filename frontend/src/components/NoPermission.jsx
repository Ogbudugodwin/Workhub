import React from 'react';

const NoPermission = ({ feature = "this feature" }) => {
    return (
        <div className="admin-section" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            textAlign: 'center',
            padding: '2rem'
        }}>
            <div style={{
                fontSize: '4rem',
                marginBottom: '1rem',
                opacity: 0.3
            }}>
                🔒
            </div>
            <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '0.5rem'
            }}>
                Access Denied
            </h2>
            <p style={{
                fontSize: '1rem',
                color: '#666',
                maxWidth: '500px',
                lineHeight: '1.6'
            }}>
                You don't have permission to access {feature}. Please contact your administrator to request access.
            </p>
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
            }}>
                <p style={{
                    fontSize: '0.875rem',
                    color: '#666',
                    margin: 0
                }}>
                    <strong>Need help?</strong> Contact your system administrator to grant you the necessary privileges.
                </p>
            </div>
        </div>
    );
};

export default NoPermission;
