import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import NoPermission from '../NoPermission';

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

const BranchManager = () => {
    const { currentUser, userData } = useAuth();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        location: null,
        attendanceSettings: {
            startTime: '09:00',
            requireLocation: true,
            locationRadius: 100,
            isActive: true
        }
    });
    const [gettingLocation, setGettingLocation] = useState(false);

    // Leaflet/OpenStreetMap refs
    const mapRef = useRef(null);
    const leafletMapRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        loadBranches();
    }, [currentUser]);

    useEffect(() => {
        // Initialize Leaflet map when form is shown
        if (showForm && !leafletMapRef.current) {
            initializeLeafletMap();
        }
    }, [showForm]);

    const loadBranches = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/branches`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setBranches(data);
            }
        } catch (error) {
            console.error("Failed to load branches", error);
        } finally {
            setLoading(false);
        }
    };

    // Get current device location
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by this browser"));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(location);
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    };

    const initializeLeafletMap = () => {
        if (!window.L) {
            console.error("Leaflet not loaded");
            return;
        }

        // Default location (you can change this)
        const defaultLocation = [6.5244, 3.3792]; // Lagos, Nigeria [lat, lng]

        const map = window.L.map(mapRef.current).setView(
            formData.location ? [formData.location.lat, formData.location.lng] : defaultLocation,
            15
        );

        // Add OpenStreetMap tiles
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;

        // Add marker if location exists
        if (formData.location) {
            markerRef.current = window.L.marker([formData.location.lat, formData.location.lng], {
                draggable: true
            }).addTo(map);

            // Update location when marker is dragged
            markerRef.current.on('dragend', (event) => {
                const marker = event.target;
                const position = marker.getLatLng();
                const newLocation = {
                    lat: position.lat,
                    lng: position.lng
                };
                setFormData(prev => ({ ...prev, location: newLocation }));
            });
        }

        // Add click listener to place marker
        map.on('click', (event) => {
            const clickedLocation = {
                lat: event.latlng.lat,
                lng: event.latlng.lng
            };

            setFormData(prev => ({ ...prev, location: clickedLocation }));

            // Remove existing marker
            if (markerRef.current) {
                map.removeLayer(markerRef.current);
            }

            // Add new marker
            markerRef.current = window.L.marker([clickedLocation.lat, clickedLocation.lng], {
                draggable: true
            }).addTo(map);

            // Update location when marker is dragged
            markerRef.current.on('dragend', (dragEvent) => {
                const marker = dragEvent.target;
                const position = marker.getLatLng();
                const newLocation = {
                    lat: position.lat,
                    lng: position.lng
                };
                setFormData(prev => ({ ...prev, location: newLocation }));
            });
        });
    };

    const handleUseCurrentLocation = async () => {
        setGettingLocation(true);
        try {
            const currentLocation = await getCurrentLocation();
            setFormData(prev => ({ ...prev, location: currentLocation }));

            // Update map marker if map is initialized
            if (leafletMapRef.current) {
                // Remove existing marker
                if (markerRef.current) {
                    leafletMapRef.current.removeLayer(markerRef.current);
                }

                // Add new marker at current location
                markerRef.current = window.L.marker([currentLocation.lat, currentLocation.lng], {
                    draggable: true
                }).addTo(leafletMapRef.current);

                // Center map on location
                leafletMapRef.current.setView([currentLocation.lat, currentLocation.lng], 18);

                // Update location when marker is dragged
                markerRef.current.on('dragend', (event) => {
                    const marker = event.target;
                    const position = marker.getLatLng();
                    const newLocation = {
                        lat: position.lat,
                        lng: position.lng
                    };
                    setFormData(prev => ({ ...prev, location: newLocation }));
                });
            }
        } catch (error) {
            console.error("Error getting current location:", error);
            if (error.code === 1) {
                alert("Location access denied. Please allow location permissions and try again.");
            } else if (error.code === 2) {
                alert("Location unavailable. Please check your GPS settings and try again.");
            } else if (error.code === 3) {
                alert("Location request timed out. Please try again or use the map to set location manually.");
            } else {
                alert("Unable to get your current location. You can use the map to set location manually.");
            }
        } finally {
            setGettingLocation(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.location) {
            alert("Branch name and location are required");
            return;
        }

        try {
            const url = editingBranch
                ? `${API_URL}/branches/${editingBranch.id}`
                : `${API_URL}/branches`;

            const method = editingBranch ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                alert(`Branch ${editingBranch ? 'updated' : 'created'} successfully!`);
                setShowForm(false);
                setEditingBranch(null);
                resetForm();
                loadBranches();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save branch');
            }
        } catch (error) {
            console.error("Failed to save branch", error);
            alert('Failed to save branch');
        }
    };

    const handleEdit = (branch) => {
        setEditingBranch(branch);
        setFormData({
            name: branch.name,
            address: branch.address,
            location: branch.location,
            attendanceSettings: branch.attendanceSettings || {
                startTime: '09:00',
                requireLocation: true,
                locationRadius: 100,
                isActive: true
            }
        });
        setShowForm(true);
    };

    const handleDelete = async (branchId) => {
        if (!window.confirm("Are you sure you want to delete this branch? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/branches/${branchId}`, {
                method: 'DELETE',
                headers: {
                    'x-user-uid': currentUser.uid,
                },
            });

            if (response.ok) {
                alert('Branch deleted successfully!');
                loadBranches();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete branch');
            }
        } catch (error) {
            console.error("Failed to delete branch", error);
            alert('Failed to delete branch');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            address: '',
            location: null,
            attendanceSettings: {
                startTime: '09:00',
                requireLocation: true,
                locationRadius: 100,
                isActive: true
            },
            manualLat: '',
            manualLng: ''
        });
        setGettingLocation(false);
    };

    // Check if user has permission to view branches
    if (userData && userData.role !== 'super_admin' && !(userData.privileges || []).includes('view_branches')) {
        return <NoPermission feature="branch management" />;
    }

    if (loading) return <div className="loading-spinner">Loading branches...</div>;

    return (
        <div className="admin-section">
            <div className="manager-header">
                <h3>Branch Management</h3>
                <p>Manage company branches and their locations.</p>
            </div>

            <div className="actions" style={{ marginBottom: '2rem' }}>
                {(userData?.role === 'super_admin' || (userData?.privileges || []).includes('manage_branches')) && (
                    <button
                        type="button"
                        onClick={(e) => {
                            console.log('Add branch button clicked');
                            e.preventDefault();
                            resetForm();
                            setShowForm(true);
                        }}
                        disabled={loading}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.target.style.backgroundColor = '#0056b3';
                                e.target.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading) {
                                e.target.style.backgroundColor = '#007bff';
                                e.target.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        {loading ? '⏳ Loading...' : '+ Add New Branch'}
                    </button>
                )}
            </div>

            {/* Branches List */}
            <div className="table-responsive">
                <table className="wp-table">
                    <thead>
                        <tr>
                            <th>Branch Name</th>
                            <th>Address</th>
                            <th>Location</th>
                            <th>Start Time</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {branches.map(branch => (
                            <tr key={branch.id}>
                                <td>{branch.name}</td>
                                <td>{branch.address || 'Not specified'}</td>
                                <td>
                                    {branch.location ?
                                        `${branch.location.lat.toFixed(4)}, ${branch.location.lng.toFixed(4)}` :
                                        'Not set'
                                    }
                                </td>
                                <td>{branch.attendanceSettings?.startTime || 'Not set'}</td>
                                <td>
                                    <span style={{
                                        padding: '2px 6px',
                                        borderRadius: '3px',
                                        fontSize: '0.8rem',
                                        backgroundColor: branch.attendanceSettings?.isActive ? '#d4edda' : '#f8d7da',
                                        color: branch.attendanceSettings?.isActive ? '#155724' : '#721c24'
                                    }}>
                                        {branch.attendanceSettings?.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    {(userData?.role === 'super_admin' || (userData?.privileges || []).includes('manage_branches')) && (
                                        <>
                                            <button
                                                onClick={() => handleEdit(branch)}
                                                style={{ marginRight: '10px', padding: '4px 8px', background: '#ffc107', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(branch.id)}
                                                style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                    {!(userData?.role === 'super_admin' || (userData?.privileges || []).includes('manage_branches')) && (
                                        <span style={{ color: '#999', fontSize: '0.85rem' }}>View only</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {branches.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#777' }}>
                                    No branches found. Create your first branch to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Branch Modal */}
            {showForm && (
                <div className="wp-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        maxWidth: '800px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h3>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</h3>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label htmlFor="name" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                        Branch Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="address" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                        Address
                                    </label>
                                    <input
                                        type="text"
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        placeholder="Branch address"
                                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                                    Location * (GPS + Map Visualization)
                                </label>

                                {/* GPS Location Capture */}
                                <div style={{ marginBottom: '15px' }}>
                                    <button
                                        type="button"
                                        onClick={handleUseCurrentLocation}
                                        disabled={gettingLocation}
                                        style={{
                                            padding: '12px 20px',
                                            backgroundColor: gettingLocation ? '#6c757d' : '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: gettingLocation ? 'not-allowed' : 'pointer',
                                            fontSize: '1rem',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {gettingLocation ? '📍 Getting Location...' : '📍 Get Current Location'}
                                    </button>
                                    <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: '#666' }}>
                                        Or click on the map below to set location manually
                                    </span>
                                </div>

                                {/* Map Container */}
                                <div
                                    ref={mapRef}
                                    style={{
                                        width: '100%',
                                        height: '300px',
                                        border: '2px solid #ddd',
                                        borderRadius: '8px',
                                        marginBottom: '15px'
                                    }}
                                />

                                {/* Manual Coordinate Input */}
                                {!formData.location && (
                                    <div style={{
                                        padding: '15px',
                                        backgroundColor: '#e9ecef',
                                        borderRadius: '8px',
                                        marginBottom: '15px',
                                        border: '1px solid #dee2e6'
                                    }}>
                                        <h6 style={{ margin: '0 0 10px 0', color: '#495057' }}>📝 Manual Coordinate Entry</h6>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '3px' }}>
                                                    Latitude
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.000001"
                                                    placeholder="e.g. 6.524379"
                                                    value={formData.manualLat || ''}
                                                    onChange={(e) => {
                                                        const lat = parseFloat(e.target.value);
                                                        const lng = formData.manualLng ? parseFloat(formData.manualLng) : 0;
                                                        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                location: { lat, lng },
                                                                manualLat: e.target.value,
                                                                manualLng: prev.manualLng || ''
                                                            }));
                                                        } else {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                manualLat: e.target.value
                                                            }));
                                                        }
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '3px' }}>
                                                    Longitude
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.000001"
                                                    placeholder="e.g. 3.379206"
                                                    value={formData.manualLng || ''}
                                                    onChange={(e) => {
                                                        const lng = parseFloat(e.target.value);
                                                        const lat = formData.manualLat ? parseFloat(formData.manualLat) : 0;
                                                        if (!isNaN(lat) && !isNaN(lng) && lng >= -180 && lng <= 180) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                location: { lat, lng },
                                                                manualLng: e.target.value
                                                            }));
                                                        } else {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                manualLng: e.target.value
                                                            }));
                                                        }
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '6px',
                                                        border: '1px solid #ccc',
                                                        borderRadius: '4px',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '8px' }}>
                                            Enter coordinates manually if GPS is unavailable. Format: decimal degrees (e.g., 6.524379, 3.379206)
                                        </div>
                                    </div>
                                )}

                                {/* Location Display */}
                                {formData.location ? (
                                    <div style={{
                                        padding: '15px',
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '8px',
                                        border: '1px solid #e9ecef'
                                    }}>
                                        <h5 style={{ margin: '0 0 10px 0', color: '#28a745' }}>✅ Location Set</h5>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                            <div><strong>Latitude:</strong> {formData.location.lat.toFixed(6)}</div>
                                            <div><strong>Longitude:</strong> {formData.location.lng.toFixed(6)}</div>
                                            <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#666' }}>
                                                This location will be used to validate staff clock-ins within the specified radius.
                                                You can drag the marker on the map to adjust the exact location.
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '15px',
                                        backgroundColor: '#fff3cd',
                                        borderRadius: '8px',
                                        border: '1px solid #ffeaa7'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', color: '#856404' }}>
                                            <strong>⚠️ Location Required:</strong> Use GPS, enter coordinates manually above, or click on the map to set the branch location.
                                            This location will be used to validate staff attendance.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <h4>Attendance Settings</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label htmlFor="startTime" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                            Start Time
                                        </label>
                                        <input
                                            type="time"
                                            id="startTime"
                                            value={formData.attendanceSettings.startTime}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                attendanceSettings: {
                                                    ...prev.attendanceSettings,
                                                    startTime: e.target.value
                                                }
                                            }))}
                                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="locationRadius" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                            Location Radius (meters)
                                        </label>
                                        <input
                                            type="number"
                                            id="locationRadius"
                                            value={formData.attendanceSettings.locationRadius}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                attendanceSettings: {
                                                    ...prev.attendanceSettings,
                                                    locationRadius: parseInt(e.target.value)
                                                }
                                            }))}
                                            min="10"
                                            max="1000"
                                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                            Require Location
                                        </label>
                                        <input
                                            type="checkbox"
                                            checked={formData.attendanceSettings.requireLocation}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                attendanceSettings: {
                                                    ...prev.attendanceSettings,
                                                    requireLocation: e.target.checked
                                                }
                                            }))}
                                            style={{ marginRight: '10px' }}
                                        />
                                        Require location for clock-in
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '2rem' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingBranch(null);
                                        resetForm();
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {editingBranch ? 'Update Branch' : 'Create Branch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchManager;
