import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import EmailListManager from './EmailListManager';
import CustomerManager from './CustomerManager';
import './EmailMarketingDashboard.css';

const EmailMarketingManager = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();
    const [realSearchParams, setRealSearchParams] = useSearchParams();

    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const tab = realSearchParams.get('tab');
        if (tab && ['dashboard', 'campaigns', 'customers', 'automation', 'settings'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [realSearchParams]);

    const handleTabChange = (tabId) => {
        setRealSearchParams({ tab: tabId });
        setActiveTab(tabId);
    };

    const API_URL = "http://localhost:5000/api";

    const fetchCampaigns = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/email-marketing/campaigns`, {
                headers: { 'x-user-uid': currentUser.uid },
            });
            const data = await response.json();
            if (response.ok) {
                setCampaigns(data);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };



    const handleDuplicateCampaign = async (id, e) => {
        e.stopPropagation();
        try {
            const response = await fetch(`${API_URL}/email-marketing/campaigns/${id}/duplicate`, {
                method: 'POST',
                headers: { 'x-user-uid': currentUser.uid }
            });

            if (response.ok) {
                fetchCampaigns(); // Refresh list
            } else {
                alert("Failed to duplicate campaign");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteCampaign = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) return;

        try {
            const response = await fetch(`${API_URL}/email-marketing/campaigns/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-uid': currentUser.uid }
            });

            if (response.ok) {
                setCampaigns(campaigns.filter(c => c.id !== id));
            } else {
                alert("Failed to delete campaign");
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, [currentUser, activeTab]);

    const filteredDashboardCampaigns = [
        { n: 'Spring Sale Promo', s: '12,000', o: '45%', c: '12%' },
        { n: 'Product Launch Email', s: '8,500', o: '38%', c: '8%' },
        { n: 'Holiday Newsletter', s: '10,200', o: '52%', c: '15%' },
        { n: 'Customer Feedback Survey', s: '6,800', o: '48%', c: '10%' }
    ].filter(c => c.n.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="emd-container">
            <header className="emd-header">
                <div className="emd-search-container">
                    <svg className="emd-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="emd-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="emd-header-right">
                    <div className="emd-notification">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        <span className="emd-notif-badge">3</span>
                    </div>
                    <div className="emd-user-profile">
                        <img src={`https://ui-avatars.com/api/?name=${userData?.name || 'Jessica Carter'}&background=3063E6&color=fff&bold=true`} alt="Avatar" className="emd-user-avatar" />
                        <span className="emd-user-name">{userData?.name || 'Jessica Carter'}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </header>

            <div className="emd-sidebar-tabs">
                <button
                    onClick={() => handleTabChange('dashboard')}
                    className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => handleTabChange('campaigns')}
                    className={`nav-tab ${activeTab === 'campaigns' ? 'active' : ''}`}
                >
                    Campaigns
                </button>
                <button
                    onClick={() => handleTabChange('customers')}
                    className={`nav-tab ${activeTab === 'customers' ? 'active' : ''}`}
                >
                    Audience
                </button>
                <button
                    onClick={() => handleTabChange('automation')}
                    className={`nav-tab ${activeTab === 'automation' ? 'active' : ''}`}
                >
                    Automation
                </button>

                <button
                    onClick={() => handleTabChange('settings')}
                    className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
                >
                    Settings
                </button>
            </div>

            <div className="emd-content">
                {activeTab === 'dashboard' && (
                    <>
                        <div className="emd-grid">
                            <div className="emd-card">
                                <div className="emd-card-header">
                                    <h3 className="emd-card-title">Sales Performance</h3>
                                    <span className="emd-card-subtitle">Monthly Revenue: <span className="emd-revenue-value">$28,500</span></span>
                                </div>
                                <div className="emd-chart-container">
                                    <div className="emd-y-axis">
                                        <span>$10k</span>
                                        <span>$20k</span>
                                        <span>$10k</span>
                                        <span>$0</span>
                                    </div>
                                    <svg viewBox="0 0 400 200" className="w-full h-full pl-10 overflow-visible">
                                        <line x1="0" y1="40" x2="400" y2="40" stroke="#F1F5F9" strokeWidth="1" />
                                        <line x1="0" y1="80" x2="400" y2="80" stroke="#F1F5F9" strokeWidth="1" />
                                        <line x1="0" y1="120" x2="400" y2="120" stroke="#F1F5F9" strokeWidth="1" />
                                        <line x1="0" y1="160" x2="400" y2="160" stroke="#F1F5F9" strokeWidth="1" />

                                        {/* Main Teal Line */}
                                        <path d="M 0 170 L 60 150 L 130 110 L 200 130 L 270 50 L 340 60" fill="none" stroke="#2D9F9D" strokeWidth="4" />
                                        {/* Secondary Grey Line */}
                                        <path d="M 0 185 L 60 170 L 130 130 L 200 145 L 270 90 L 340 110" fill="none" stroke="#94A3B8" strokeWidth="3" />

                                        {[0, 60, 130, 200, 270, 340].map((x, i) => {
                                            const yTeal = [170, 150, 110, 130, 50, 60][i];
                                            const yGrey = [185, 170, 130, 145, 90, 110][i];
                                            return (
                                                <g key={i}>
                                                    <circle cx={x} cy={yTeal} r="5" fill="#2D9F9D" stroke="white" strokeWidth="2" />
                                                    <circle cx={x} cy={yGrey} r="4" fill="#94A3B8" stroke="white" strokeWidth="2" />
                                                </g>
                                            );
                                        })}
                                    </svg>
                                    <div className="emd-x-axis">
                                        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                                    </div>
                                </div>
                            </div>

                            <div className="emd-card">
                                <div className="emd-card-header">
                                    <h3 className="emd-card-title">Audience Growth</h3>
                                </div>
                                <div className="emd-chart-container">
                                    <div className="emd-y-axis">
                                        <span>2k</span>
                                        <span>1k</span>
                                        <span>150</span>
                                        <span>0</span>
                                    </div>
                                    <div className="flex items-end justify-between h-full pl-10 border-b border-gray-100 pb-2">
                                        {[
                                            { t: 60, r: 35, m: 'Jan' }, { t: 55, r: 70, m: 'Feb' },
                                            { t: 80, r: 40, m: 'Mar' }, { t: 45, r: 30, m: 'Apr' },
                                            { t: 90, r: 50, m: 'May' }, { t: 75, r: 45, m: 'Jun' }
                                        ].map((d, i) => (
                                            <div key={i} className="flex gap-1 h-full items-end w-4 group transition-all duration-300">
                                                <div style={{ height: `${d.t}%` }} className="w-2 bg-[#2D9F9D] rounded-t-sm"></div>
                                                <div style={{ height: `${d.r}%` }} className="w-2 bg-[#E85C5C] rounded-t-sm"></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="emd-x-axis">
                                        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                                    </div>
                                </div>
                                <div className="emd-legend">
                                    <div className="emd-legend-item"><div className="emd-legend-dot bg-[#2D9F9D]"></div>New Subscribers</div>
                                    <div className="emd-legend-item"><div className="emd-legend-dot bg-[#E85C5C]"></div>Unsubscribes</div>
                                </div>
                            </div>
                        </div>

                        <div className="emd-full-card">
                            <div className="emd-table-header">
                                <h3 className="emd-card-title">Recent Campaigns</h3>
                            </div>
                            <table className="emd-table">
                                <thead>
                                    <tr>
                                        <th>Campaign</th>
                                        <th>Sent</th>
                                        <th>Open Rate</th>
                                        <th>Click Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDashboardCampaigns.map((row, i) => (
                                        <tr key={i}>
                                            <td className="emd-campaign-name">{row.n}</td>
                                            <td>{row.s}</td>
                                            <td className="emd-rate-high">{row.o}</td>
                                            <td>{row.c}</td>
                                        </tr>
                                    ))}
                                    {filteredDashboardCampaigns.length === 0 && (
                                        <tr><td colSpan="4" className="text-center py-10 text-gray-400">No campaigns match your search.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'campaigns' && (
                    <div className="emd-full-card">
                        <div className="emd-table-header flex justify-between items-center">
                            <h3 className="emd-card-title">Campaign History</h3>
                            <button
                                onClick={() => navigate('/dashboard/email-marketing/new')}
                                className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-[0_10px_20px_-5px_rgba(59,130,246,0.3)] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
                            >
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                New Campaign
                            </button>
                        </div>
                        <table className="emd-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Subject</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" className="text-center py-12">Synchronizing Repository...</td></tr>
                                ) : campaigns.filter(c =>
                                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
                                ).map(c => (
                                    <tr key={c.id}>
                                        <td className="emd-campaign-name">{c.name}</td>
                                        <td>{c.subject}</td>
                                        <td><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${c.status === 'sent' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>{c.status}</span></td>
                                        <td>
                                            <div className="emd-actions-wrapper">
                                                <button
                                                    onClick={() => navigate(c.status === 'sent' ? `/dashboard/email-marketing/analytics/${c.id}` : `/dashboard/email-marketing/edit/${c.id}`)}
                                                    className="emd-action-btn emd-action-view"
                                                    title="View Details"
                                                >
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    View
                                                </button>
                                                <button
                                                    onClick={(e) => handleDuplicateCampaign(c.id, e)}
                                                    className="emd-action-btn emd-action-duplicate"
                                                    title="Duplicate & Resend"
                                                >
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                                    Duplicate
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteCampaign(c.id, e)}
                                                    className="emd-action-btn emd-action-delete"
                                                    title="Delete Campaign"
                                                >
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'automation' && <div className="emd-card"><h3>Analytics Module</h3><p>Real-time performance metrics arriving shortly.</p></div>}
                {activeTab === 'customers' && <CustomerManager searchQuery={searchQuery} />}

                {activeTab === 'settings' && <div className="emd-card"><h3>Strategic Configuration</h3><p>Global defaults for campaign transmission frequencies.</p></div>}
            </div>
        </div>
    );
};

export default EmailMarketingManager;
