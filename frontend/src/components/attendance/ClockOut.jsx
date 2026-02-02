import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = "http://localhost:5000/api";

const ClockOut = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [todayRecord, setTodayRecord] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [notes, setNotes] = useState('');
    const [currentLocation, setCurrentLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);

    useEffect(() => {
        loadTodayRecord();
    }, [currentUser]);

    const loadTodayRecord = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${API_URL}/attendance?userId=${currentUser.uid}&date=${today}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
            });

            if (response.ok) {
                const records = await response.json();
                const record = records.find(r => r.date === today && !r.clockOut);
                if (record) {
                    setTodayRecord(record);
                } else {
                    setMessage({ type: 'info', text: 'You have not clocked in today or have already clocked out.' });
                }
            }
        } catch (error) {
            console.error("Failed to load attendance record", error);
            setMessage({ type: 'error', text: 'Failed to load attendance record' });
        } finally {
            setLoading(false);
        }
    };

    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by this browser"));
                return;
            }

            setGettingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setCurrentLocation(location);
                    setGettingLocation(false);
                    resolve(location);
                },
                (error) => {
                    setGettingLocation(false);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    };

    const handleGetLocation = async () => {
        try {
            await getCurrentLocation();
            setMessage({ type: 'success', text: 'Location retrieved successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: `Failed to get location: ${error.message}` });
        }
    };

    const calculateHoursWorked = () => {
        if (!todayRecord) return '0:00';

        const clockInTime = new Date(todayRecord.clockIn);
        const now = new Date();
        const diffMs = now - clockInTime;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}:${minutes.toString().padStart(2, '0')}`;
    };

    const handleClockOut = async () => {
        if (!todayRecord) return;

        // Get location before clocking out
        let location = currentLocation;
        if (!location) {
            try {
                location = await getCurrentLocation();
            } catch (error) {
                setMessage({ type: 'error', text: 'Please enable location services to clock out' });
                return;
            }
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/attendance/clock-out`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
                body: JSON.stringify({
                    attendanceId: todayRecord.id,
                    location: location,
                    notes: notes
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Clocked out successfully!' });
                setTimeout(() => {
                    navigate('/dashboard/attendance');
                }, 2000);
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.error || 'Failed to clock out' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to clock out. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="loading-spinner">Loading...</div>;
    }

    return (
        <div className="admin-section">
            <div className="manager-header">
                <h3>Clock Out</h3>
                <p>End your shift and record your clock-out time</p>
            </div>

            {message.text && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'success' ? '#d4edda' : message.type === 'error' ? '#f8d7da' : '#d1ecf1',
                    color: message.type === 'success' ? '#155724' : message.type === 'error' ? '#721c24' : '#0c5460',
                    border: `1px solid ${message.type === 'success' ? '#c3e6cb' : message.type === 'error' ? '#f5c6cb' : '#bee5eb'}`
                }}>
                    {message.text}
                </div>
            )}

            {!todayRecord ? (
                <div style={{
                    padding: '3rem',
                    textAlign: 'center',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</div>
                    <h4 style={{ marginBottom: '0.5rem' }}>No Active Clock-In</h4>
                    <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                        You haven't clocked in today or have already clocked out.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard/clock-in')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold'
                        }}
                    >
                        Go to Clock In
                    </button>
                </div>
            ) : (
                <div>
                    {/* Clock-In Summary */}
                    <div style={{
                        padding: '1.5rem',
                        marginBottom: '1.5rem',
                        backgroundColor: '#e7f3ff',
                        borderRadius: '8px',
                        border: '2px solid #007bff'
                    }}>
                        <h4 style={{ marginBottom: '1rem', color: '#007bff' }}>Today's Shift</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Branch</div>
                                <div style={{ fontWeight: 'bold' }}>{todayRecord.branchName || 'N/A'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Clock In Time</div>
                                <div style={{ fontWeight: 'bold' }}>
                                    {new Date(todayRecord.clockIn).toLocaleTimeString()}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>Hours Worked</div>
                                <div style={{ fontWeight: 'bold', color: '#28a745', fontSize: '1.2rem' }}>
                                    {calculateHoursWorked()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location Button */}
                    {!currentLocation && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <button
                                onClick={handleGetLocation}
                                disabled={gettingLocation}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: gettingLocation ? 'not-allowed' : 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                {gettingLocation ? '📍 Getting Location...' : '📍 Get My Location'}
                            </button>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                                Location will be automatically retrieved when you clock out
                            </p>
                        </div>
                    )}

                    {currentLocation && (
                        <div style={{
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            backgroundColor: '#d4edda',
                            borderRadius: '8px',
                            border: '1px solid #28a745'
                        }}>
                            ✓ Location retrieved successfully
                        </div>
                    )}

                    {/* Notes */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about your shift..."
                            rows="3"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '1rem',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {/* Clock Out Button */}
                    <button
                        onClick={handleClockOut}
                        disabled={submitting}
                        style={{
                            padding: '1rem 2rem',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            width: '100%'
                        }}
                    >
                        {submitting ? '⏳ Clocking Out...' : '🕐 Clock Out'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ClockOut;
