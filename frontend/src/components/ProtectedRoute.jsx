import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { currentUser, userData, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="loading-spinner">Verifying access...</div>;
    }

    if (!currentUser) {
        // Redirect to login but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && (!userData || !allowedRoles.includes(userData.role))) {
        // If they are logged in but don't have the right role, send them home
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
