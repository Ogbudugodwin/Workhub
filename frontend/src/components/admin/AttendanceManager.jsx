import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Utility to check if user has a specific privilege
const hasPrivilege = (user, privilege) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true; // Super admin has all privileges
    return (user.privileges || []).includes(privilege);
};

const API_URL = "http://localhost:5000/api";

// Helper for authenticated requests
async function authFetch(url, options = {}, uid) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    if (uid) {
        headers['x-user-uid'] = uid;
    }
    return fetch(url, { ...options, headers });
}

const AttendanceManager = () => {
    const { currentUser, userData } = useAuth();
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAttendanceData();
    }, [currentUser, userData]);

    const loadAttendanceData = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            // Load attendance records (admins see all, staff see their own)
            const recordsResponse = await fetch(`${API_URL}/attendance`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
            });
            if (recordsResponse.ok) {
                const recordsData = await recordsResponse.json();
                setAttendanceRecords(recordsData);
            }
        } catch (error) {
            console.error("Failed to load attendance data", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading attendance data...</div>;

    return (
        <div className="admin-section">
            <div className="manager-header">
                <h3>Attendance Management</h3>
                <p>Track staff attendance and working hours.</p>
            </div>

            {/* Attendance Records Section */}
            <div className="attendance-history-section">
                <h4>{userData?.role === 'staff' ? 'My Attendance History' : 'Staff Attendance Records'}</h4>

                {userData?.role !== 'staff' ? (
                    // ADMIN VIEW: Grouped by Branch
                    <div>
                        {Object.entries(
                            attendanceRecords.reduce((groups, record) => {
                                const branchName = record.branchName || 'Main Office / Unassigned';
                                if (!groups[branchName]) groups[branchName] = [];
                                groups[branchName].push(record);
                                return groups;
                            }, {})
                        ).sort(([a], [b]) => a.localeCompare(b)).map(([branchName, records]) => (
                            <div key={branchName} className="branch-attendance-group" style={{ marginBottom: '2.5rem' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: '#ebf5ff',
                                    borderLeft: '4px solid #007bff',
                                    borderRadius: '4px',
                                    marginBottom: '1rem'
                                }}>
                                    <h5 style={{ margin: 0, color: '#0056b3', fontSize: '1.1rem' }}>
                                        🏢 {branchName}
                                    </h5>
                                    <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                        {records.length} {records.length === 1 ? 'record' : 'records'}
                                    </span>
                                </div>

                                <div className="table-responsive">
                                    <table className="wp-table">
                                        <thead>
                                            <tr>
                                                <th>Staff Member</th>
                                                <th>Date</th>
                                                <th>Clock In</th>
                                                <th>Clock Out</th>
                                                <th>Hours</th>
                                                <th>Location</th>
                                                <th>Late Status</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map(record => (
                                                <tr key={record.id}>
                                                    <td style={{ fontWeight: 'bold' }}>{record.userName}</td>
                                                    <td>{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                                                    <td>{record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                    <td>{record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                    <td>
                                                        <span style={{ fontWeight: 'bold', color: '#444' }}>
                                                            {record.hoursWorked ? `${record.hoursWorked}h` : '-'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {record.location ? (
                                                            <button
                                                                title="View on Map"
                                                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                                                                onClick={() => window.open(`https://www.google.com/maps?q=${record.location.lat},${record.location.lng}`, '_blank')}
                                                            >
                                                                📍
                                                            </button>
                                                        ) : '-'}
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 'bold',
                                                            backgroundColor: record.isLate ? '#fee2e2' : '#dcfce7',
                                                            color: record.isLate ? '#991b1b' : '#166534'
                                                        }}>
                                                            {record.isLate ? 'Late' : 'On Time'}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '0.9rem' }}>
                                                        {record.notes || '-'}
                                                        {record.isLate && record.lateReason && (
                                                            <div style={{ fontSize: '0.8rem', color: '#991b1b', fontStyle: 'italic', marginTop: '2px' }}>
                                                                Reason: {record.lateReason}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}

                        {attendanceRecords.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#777', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                                No attendance records found for your company.
                            </div>
                        )}
                    </div>
                ) : (
                    // STAFF VIEW: Simple list of their own records
                    <div className="table-responsive">
                        <table className="wp-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Clock In</th>
                                    <th>Clock Out</th>
                                    <th>Branch</th>
                                    <th>Hours</th>
                                    <th>Status</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendanceRecords.map(record => (
                                    <tr key={record.id}>
                                        <td>{new Date(record.date).toLocaleDateString()}</td>
                                        <td>{record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '-'}</td>
                                        <td>{record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '-'}</td>
                                        <td><span className="wp-badge">{record.branchName || 'Main Office'}</span></td>
                                        <td style={{ fontWeight: 'bold' }}>{record.hoursWorked || '-'}</td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                backgroundColor: record.isLate ? '#f8d7da' : '#d4edda',
                                                color: record.isLate ? '#721c24' : '#155724'
                                            }}>
                                                {record.isLate ? 'Late' : 'On Time'}
                                            </span>
                                        </td>
                                        <td>{record.notes || '-'}</td>
                                    </tr>
                                ))}
                                {attendanceRecords.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#777' }}>You have no attendance records yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceManager;
