import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_URL = "http://localhost:5000/api";

// Utility function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

const ClockIn = () => {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [distance, setDistance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [notes, setNotes] = useState('');
    const [alreadyClockedIn, setAlreadyClockedIn] = useState(false);
    const [showLateModal, setShowLateModal] = useState(false);
    const [lateReason, setLateReason] = useState('');

    const mapRef = useRef(null);
    const leafletMapRef = useRef(null);
    const userMarkerRef = useRef(null);
    const branchMarkerRef = useRef(null);
    const radiusCircleRef = useRef(null);

    useEffect(() => {
        if (currentUser && userData) {
            loadBranches();
            checkIfClockedIn();
        }
    }, [currentUser, userData]);

    useEffect(() => {
        if (selectedBranch && window.L) {
            initializeMap();
        }
    }, [selectedBranch]);

    useEffect(() => {
        if (currentLocation && selectedBranch) {
            const dist = calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                selectedBranch.location.lat,
                selectedBranch.location.lng
            );
            setDistance(dist);
            updateMapMarkers();
        }
    }, [currentLocation, selectedBranch]);

    const loadBranches = async () => {
        if (!currentUser || !userData) return;

        try {
            const response = await fetch(`${API_URL}/branches`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
            });

            if (response.ok) {
                const allBranches = await response.json();

                // Get assigned branch IDs
                let userBranchIds = [];
                if (userData.branchIds && Array.isArray(userData.branchIds)) {
                    userBranchIds = userData.branchIds;
                } else if (userData.branchId) {
                    userBranchIds = [userData.branchId];
                }

                const assignedBranches = allBranches.filter(b => userBranchIds.includes(b.id));
                setBranches(assignedBranches);

                if (assignedBranches.length === 1) {
                    setSelectedBranch(assignedBranches[0]);
                }
            }
        } catch (error) {
            console.error("Failed to load branches", error);
            setMessage({ type: 'error', text: 'Failed to load branches' });
        }
    };

    const checkIfClockedIn = async () => {
        if (!currentUser) return;

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
                const todayRecord = records.find(r => r.date === today && !r.clockOut);
                if (todayRecord) {
                    setAlreadyClockedIn(true);
                    setMessage({ type: 'info', text: 'You are already clocked in today. Please clock out first.' });
                }
            }
        } catch (error) {
            console.error("Failed to check clock-in status", error);
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

    const initializeMap = () => {
        if (!window.L || !selectedBranch || !mapRef.current) return;

        if (leafletMapRef.current) {
            leafletMapRef.current.remove();
        }

        const map = window.L.map(mapRef.current).setView(
            [selectedBranch.location.lat, selectedBranch.location.lng],
            16
        );

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;

        branchMarkerRef.current = window.L.marker(
            [selectedBranch.location.lat, selectedBranch.location.lng],
            { icon: createBranchIcon() }
        ).addTo(map);
        branchMarkerRef.current.bindPopup(`<b>${selectedBranch.name}</b><br>${selectedBranch.address}`);

        radiusCircleRef.current = window.L.circle(
            [selectedBranch.location.lat, selectedBranch.location.lng],
            {
                radius: selectedBranch.attendanceSettings?.locationRadius || 100,
                color: '#007bff',
                fillColor: '#007bff',
                fillOpacity: 0.1
            }
        ).addTo(map);

        if (currentLocation) {
            updateMapMarkers();
        }
    };

    const createBranchIcon = () => {
        return window.L.divIcon({
            className: 'custom-icon',
            html: '<div style="background: #007bff; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    };

    const createUserIcon = () => {
        return window.L.divIcon({
            className: 'custom-icon',
            html: '<div style="background: #28a745; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
    };

    const updateMapMarkers = () => {
        if (!leafletMapRef.current || !currentLocation) return;

        if (userMarkerRef.current) {
            leafletMapRef.current.removeLayer(userMarkerRef.current);
        }

        userMarkerRef.current = window.L.marker(
            [currentLocation.lat, currentLocation.lng],
            { icon: createUserIcon() }
        ).addTo(leafletMapRef.current);
        userMarkerRef.current.bindPopup('<b>Your Location</b>');

        const bounds = window.L.latLngBounds([
            [selectedBranch.location.lat, selectedBranch.location.lng],
            [currentLocation.lat, currentLocation.lng]
        ]);
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
    };

    const handleClockIn = async () => {
        if (!selectedBranch || !currentLocation) {
            setMessage({ type: 'error', text: 'Please select a branch and get your location first' });
            return;
        }

        if (distance > (selectedBranch.attendanceSettings?.locationRadius || 100)) {
            setMessage({ type: 'error', text: `You are too far from the branch to clock in. You must be within ${selectedBranch.attendanceSettings?.locationRadius || 100} meters.` });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/attendance/clock-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
                body: JSON.stringify({
                    branchId: selectedBranch.id,
                    location: currentLocation,
                    notes: notes
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Clocked in successfully!' });
                setShowLateModal(false);
                setTimeout(() => {
                    navigate('/dashboard/attendance');
                }, 2000);
            } else {
                const error = await response.json();
                if (error.requiresLateReason) {
                    setShowLateModal(true);
                    setMessage({ type: 'info', text: 'You are clocking in late. Please provide a reason.' });
                } else {
                    setMessage({ type: 'error', text: error.error || 'Failed to clock in' });
                }
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to clock in. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleLateSubmit = async (e) => {
        e.preventDefault();
        if (!lateReason.trim()) {
            alert('Please provide a reason for lateness.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/attendance/clock-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
                body: JSON.stringify({
                    branchId: selectedBranch.id,
                    location: currentLocation,
                    notes: lateReason
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Clocked in successfully (Late)!' });
                setShowLateModal(false);
                setTimeout(() => {
                    navigate('/dashboard/attendance');
                }, 2000);
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.error || 'Failed to clock in' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to clock in. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const isWithinRange = distance !== null && distance <= (selectedBranch.attendanceSettings?.locationRadius || 100);
    const canClockIn = selectedBranch && currentLocation && isWithinRange && !alreadyClockedIn;

    return (
        <div className="admin-section">
            <div className="manager-header">
                <h3>Clock In</h3>
                <p>Verify your location and clock in for your shift</p>
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

            {branches.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    <p>You are not assigned to any branches. Please contact your administrator.</p>
                </div>
            ) : (
                <>
                    {branches.length > 1 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Select Branch
                            </label>
                            <select
                                value={selectedBranch?.id || ''}
                                onChange={(e) => {
                                    const branch = branches.find(b => b.id === e.target.value);
                                    setSelectedBranch(branch);
                                    setCurrentLocation(null);
                                    setDistance(null);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="">Choose a branch...</option>
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name} - {branch.address}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedBranch && (
                        <>
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
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '0.25rem' }}>Branch Coordinates</div>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                        {selectedBranch.location.lat.toFixed(6)}, {selectedBranch.location.lng.toFixed(6)}
                                    </div>
                                </div>
                                <div style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '0.25rem' }}>Your Coordinates</div>
                                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                        {currentLocation ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}` : 'Detecting...'}
                                    </div>
                                </div>
                            </div>

                            {distance !== null && (
                                <div style={{
                                    padding: '1rem',
                                    marginBottom: '1.5rem',
                                    borderRadius: '8px',
                                    backgroundColor: isWithinRange ? '#d4edda' : '#f8d7da',
                                    border: `2px solid ${isWithinRange ? '#28a745' : '#dc3545'}`
                                }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        {isWithinRange ? '✓ Within Range' : '✗ Out of Range'}
                                    </div>
                                    <div style={{ fontSize: '0.9rem' }}>
                                        Distance from branch: <strong>{distance.toFixed(0)} meters</strong>
                                        {!isWithinRange && ` (Must be within ${selectedBranch.attendanceSettings?.locationRadius || 100} meters)`}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '1.5rem' }}>
                                <div
                                    ref={mapRef}
                                    style={{
                                        height: '400px',
                                        borderRadius: '8px',
                                        border: '2px solid #ddd',
                                        overflow: 'hidden'
                                    }}
                                />
                            </div>

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

                            <button
                                onClick={handleClockIn}
                                disabled={!canClockIn || loading}
                                style={{
                                    padding: '1rem 2rem',
                                    backgroundColor: canClockIn ? '#007bff' : '#ccc',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: canClockIn && !loading ? 'pointer' : 'not-allowed',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    width: '100%'
                                }}
                            >
                                {loading ? '⏳ Clocking In...' : '🕐 Clock In'}
                            </button>
                        </>
                    )}
                </>
            )}

            {showLateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2.5rem',
                        borderRadius: '20px',
                        maxWidth: '500px',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                        animation: 'modalFadeIn 0.3s ease-out'
                    }}>
                        <style>
                            {`
                                @keyframes modalFadeIn {
                                    from { transform: translateY(20px); opacity: 0; }
                                    to { transform: translateY(0); opacity: 1; }
                                }
                            `}
                        </style>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏰</div>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#1a202c' }}>Arriving Late?</h3>
                            <p style={{ color: '#4a5568', marginTop: '0.5rem' }}>
                                Your shift at <strong>{selectedBranch.name}</strong> was scheduled to start at <strong>{selectedBranch.attendanceSettings?.startTime}</strong>.
                            </p>
                        </div>

                        <form onSubmit={handleLateSubmit}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 'bold', color: '#2d3748' }}>
                                Reason for Lateness
                            </label>
                            <textarea
                                required
                                value={lateReason}
                                onChange={(e) => setLateReason(e.target.value)}
                                placeholder="E.g. Traffic, personal emergency, etc."
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: '2px solid #e2e8f0',
                                    fontSize: '1rem',
                                    height: '120px',
                                    resize: 'none',
                                    marginBottom: '2rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowLateModal(false)}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#f7fafc',
                                        color: '#4a5568',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '12px',
                                        border: 'none',
                                        backgroundColor: '#3182ce',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {loading ? 'Submitting...' : 'Submit Reason'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClockIn;
