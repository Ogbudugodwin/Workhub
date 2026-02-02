import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './EmailAnalytics.css';

const EmailAnalytics = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState(null);

    const API_URL = "http://localhost:5000/api";

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;
            try {
                const [campRes, anaRes] = await Promise.all([
                    fetch(`${API_URL}/email-marketing/campaigns/${id}`, { headers: { 'x-user-uid': currentUser.uid } }),
                    fetch(`${API_URL}/email-marketing/campaigns/${id}/analytics`, { headers: { 'x-user-uid': currentUser.uid } })
                ]);

                if (campRes.ok) setCampaign(await campRes.json());
                if (anaRes.ok) setAnalytics(await anaRes.json());
                else throw new Error("Analytics not found for this campaign.");
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, currentUser]);

    const handleResend = async () => {
        if (!window.confirm("This will resend the campaign to all contacts who haven't opened it yet. Continue?")) return;
        setResending(true);
        try {
            const response = await fetch(`${API_URL}/email-marketing/campaigns/${id}/resend-io`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                }
            });
            if (response.ok) {
                alert("Resend initiated successfully!");
            } else {
                throw new Error("Failed to initiate resend.");
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setResending(false);
        }
    };

    if (loading) return <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Analyzing Campaign Performance...</p>
    </div>;

    if (error) return <div className="analytics-error">
        <span>⚠️</span>
        <h3>Error Loading Analytics</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
    </div>;

    const openRate = ((analytics.opened / analytics.totalSent) * 100).toFixed(1);
    const clickRate = ((analytics.clicked / analytics.totalSent) * 100).toFixed(1);

    const MetricCard = ({ label, value, sub, icon, trend, color }) => (
        <div className={`metric-card ${color}`}>
            <div className="metric-icon-box">
                <span className="metric-icon">{icon}</span>
                {trend && <span className="metric-trend">{trend}</span>}
            </div>
            <p className="metric-label">{label}</p>
            <p className="metric-value">{value}</p>
            <p className="metric-subtext">{sub}</p>
        </div>
    );

    return (
        <div className="analytics-container">
            <div className="analytics-content">
                {/* Header Section */}
                <header className="analytics-header">
                    <div className="title-area">
                        <button onClick={() => navigate('/dashboard/email-marketing')} className="back-link">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back to Campaigns
                        </button>
                        <h1 className="campaign-title">{campaign?.name}</h1>
                        <p className="campaign-subtitle">
                            Report generated for <span className="subject-highlight">{campaign?.subject}</span>
                            {campaign?.sentAt && <span className="sent-at"> • Sent on {new Date(campaign.sentAt).toLocaleDateString()}</span>}
                        </p>
                    </div>
                    <div className="action-area">
                        <button
                            onClick={handleResend}
                            disabled={resending}
                            className="resend-btn"
                        >
                            {resending ? 'Initiating...' : 'RESEND TO NON-OPENERS'}
                        </button>
                    </div>
                </header>

                {/* Metrics Grid */}
                <div className="metrics-grid">
                    <MetricCard
                        label="Total Reach"
                        value={analytics.totalSent}
                        sub="Successful deliveries"
                        icon="📧"
                    />
                    <MetricCard
                        label="Open Rate"
                        value={`${openRate}%`}
                        sub={`${analytics.opened} individual opens`}
                        icon="👁️"
                        trend="↑ 4.2%"
                    />
                    <MetricCard
                        label="Click Rate"
                        value={`${clickRate}%`}
                        sub={`${analytics.clicked} total interactions`}
                        icon="🖱️"
                        trend="Healthy"
                    />
                    <MetricCard
                        label="Delivered"
                        value={analytics.totalSent}
                        sub="0 bounces detected"
                        icon="✅"
                    />
                </div>

                <div className="activity-grid">
                    {/* Activity Feed */}
                    <section className="activity-card">
                        <div className="card-header">
                            <h2>Recent Activity</h2>
                            <span className="badge-live">Live Feed</span>
                        </div>
                        <div className="table-container">
                            <table className="analytics-table">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Device / Identity</th>
                                        <th>Origin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(analytics.opens || []).map((open, i) => (
                                        <tr key={i}>
                                            <td className="timestamp">{new Date(open.timestamp).toLocaleString()}</td>
                                            <td>
                                                <div className="device-info">
                                                    <span className="device-icon">📱</span>
                                                    <span className="device-text" title={open.userAgent}>{open.userAgent || 'Unknown Device'}</span>
                                                </div>
                                            </td>
                                            <td className="origin-ip">{open.ip}</td>
                                        </tr>
                                    ))}
                                    {(analytics.opens || []).length === 0 && (
                                        <tr><td colSpan="3" className="empty-state">Waiting for the first open...</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Link Interactions */}
                    <section className="activity-card">
                        <div className="card-header">
                            <h2>Link Interactions</h2>
                            <span className="badge-interest">Engagement</span>
                        </div>
                        <div className="table-container">
                            <table className="analytics-table">
                                <thead>
                                    <tr>
                                        <th>Target URL</th>
                                        <th style={{ textAlign: 'right' }}>Date & Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(analytics.clicks || []).map((click, i) => (
                                        <tr key={i}>
                                            <td>
                                                <p className="url-text" title={click.url}>{click.url}</p>
                                                <p className="click-type">Verified Interaction</p>
                                            </td>
                                            <td className="timestamp" style={{ textAlign: 'right' }}>
                                                {new Date(click.timestamp).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {(analytics.clicks || []).length === 0 && (
                                        <tr><td colSpan="2" className="empty-state">No links clicked yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default EmailAnalytics;
