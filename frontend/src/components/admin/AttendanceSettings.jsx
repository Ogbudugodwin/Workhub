import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const AttendanceSettings = () => {
    const { currentUser, userData } = useAuth();
    const [settings, setSettings] = useState({
        startTime: '',
        approvedLocation: '',
        requireLocation: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const API_URL = "http://localhost:5000/api";

    useEffect(() => {
        loadSettings();
    }, [currentUser]);

    const loadSettings = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/attendance/settings`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const attendanceSettings = data.attendanceSettings || {};
                setSettings({
                    startTime: attendanceSettings.startTime || '',
                    approvedLocation: attendanceSettings.approvedLocation || '',
                    requireLocation: attendanceSettings.requireLocation || false
                });
            }
        } catch (error) {
            console.error("Failed to load attendance settings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/attendance/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
                body: JSON.stringify(settings),
            });

            if (response.ok) {
                const data = await response.json();
                alert('Attendance settings saved successfully!');
                console.log('Settings saved:', data.settings);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save settings');
            }
        } catch (error) {
            console.error("Failed to save attendance settings", error);
            alert('Failed to save attendance settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading attendance settings...</div>;

    // Only company admins can manage attendance settings
    if (userData?.role !== 'company_admin' && userData?.role !== 'super_admin') {
        return (
            <div className="admin-section">
                <div className="manager-header">
                    <h3>Access Denied</h3>
                    <p>Only company administrators can manage attendance settings.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-section">
            <div className="manager-header">
                <h3>Attendance Settings</h3>
                <p>Configure attendance policies for your company.</p>
            </div>

            <div className="settings-form" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="settings-section" style={{ marginBottom: '2rem' }}>
                    <h4>🕐 Work Start Time</h4>
                    <p>Set the official start time for work. Staff clocking in after this time will be marked as late.</p>
                    <div className="form-group">
                        <label htmlFor="startTime">Start Time (24-hour format)</label>
                        <input
                            type="time"
                            id="startTime"
                            value={settings.startTime}
                            onChange={(e) => handleChange('startTime', e.target.value)}
                            placeholder="09:00"
                        />
                        <small style={{ color: '#666', fontSize: '0.85rem' }}>
                            Example: 09:00 for 9:00 AM, 14:30 for 2:30 PM
                        </small>
                    </div>
                </div>

                <div className="settings-section" style={{ marginBottom: '2rem' }}>
                    <h4>📍 Location Settings</h4>
                    <p>Configure approved work location for clock-in validation.</p>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={settings.requireLocation}
                                onChange={(e) => handleChange('requireLocation', e.target.checked)}
                                style={{ marginRight: '10px' }}
                            />
                            Require location validation for clock-in
                        </label>
                    </div>

                    {settings.requireLocation && (
                        <div className="form-group">
                            <label htmlFor="approvedLocation">Approved Location</label>
                            <input
                                type="text"
                                id="approvedLocation"
                                value={settings.approvedLocation}
                                onChange={(e) => handleChange('approvedLocation', e.target.value)}
                                placeholder="Office address or coordinates"
                            />
                            <small style={{ color: '#666', fontSize: '0.85rem' }}>
                                Enter office address or GPS coordinates. Staff must be within this location to clock in.
                            </small>
                        </div>
                    )}
                </div>

                <div className="settings-section" style={{ marginBottom: '2rem' }}>
                    <h4>📋 Late Arrival Policy</h4>
                    <p>When staff clock in late, they will be required to provide a reason for their tardiness.</p>
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                        <p style={{ margin: '0', fontSize: '0.9rem', color: '#495057' }}>
                            <strong>Automatic Policy:</strong> Staff who clock in after the start time will be marked as "Late"
                            and must provide an explanation in the notes field.
                        </p>
                    </div>
                </div>

                <div className="actions" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #ddd', textAlign: 'center' }}>
                    <button
                        onClick={saveSettings}
                        disabled={saving}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold'
                        }}
                    >
                        {saving ? '💾 Saving...' : '💾 Save Settings'}
                    </button>
                </div>

                <div className="settings-preview" style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                    <h4>📋 Current Settings Preview</h4>
                    <ul style={{ listStyle: 'none', padding: '0' }}>
                        <li><strong>Start Time:</strong> {settings.startTime || 'Not set'}</li>
                        <li><strong>Location Required:</strong> {settings.requireLocation ? 'Yes' : 'No'}</li>
                        <li><strong>Approved Location:</strong> {settings.approvedLocation || 'Not set'}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AttendanceSettings;
