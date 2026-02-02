import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const CampaignSender = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [campaign, setCampaign] = useState(null);
    const [audiences, setAudiences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [excludedIds, setExcludedIds] = useState([]);
    const [scheduledFor, setScheduledFor] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    const API_URL = "http://localhost:5000/api";

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;
            try {
                const [campRes, audRes] = await Promise.all([
                    fetch(`${API_URL}/email-marketing/campaigns/${id}`, { headers: { 'x-user-uid': currentUser.uid } }),
                    fetch(`${API_URL}/email-marketing/lists`, { headers: { 'x-user-uid': currentUser.uid } })
                ]);

                if (campRes.ok) {
                    const campData = await campRes.json();
                    setCampaign(campData);
                    setExcludedIds(campData.excludedRecipientIds || []);
                    if (campData.scheduledAt) setScheduledFor(campData.scheduledAt);
                }
                if (audRes.ok) setAudiences(await audRes.json());
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, currentUser]);

    const handleLaunch = async () => {
        if (!campaign.audienceId) {
            setError("No target audience selected.");
            return;
        }

        const confirmMsg = scheduledFor
            ? `Schedule this campaign for ${new Date(scheduledFor).toLocaleString()}?`
            : "Launch this campaign to your audience immediately?";

        if (!window.confirm(confirmMsg)) return;

        setSending(true);
        setError(null);
        try {
            // Update campaign with exclusions and schedule first
            await fetch(`${API_URL}/email-marketing/campaigns/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-user-uid': currentUser.uid },
                body: JSON.stringify({
                    ...campaign,
                    excludedRecipientIds: excludedIds,
                    scheduledAt: scheduledFor || null,
                    status: scheduledFor ? 'scheduled' : 'draft'
                })
            });

            if (scheduledFor) {
                setSuccess(true);
                setTimeout(() => navigate('/dashboard/email-marketing'), 3000);
                return;
            }

            // If not scheduling, send now
            const response = await fetch(`${API_URL}/email-marketing/campaigns/${id}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-uid': currentUser.uid },
                body: JSON.stringify({ audienceId: campaign.audienceId, excludedRecipientIds: excludedIds }),
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => navigate('/dashboard/email-marketing'), 3000);
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to send campaign');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    const handleSendTest = async () => {
        setIsTesting(true);
        try {
            const response = await fetch(`${API_URL}/email-marketing/campaigns/${id}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-uid': currentUser.uid },
                body: JSON.stringify({ testEmail: currentUser.email })
            });
            if (response.ok) alert(`Test sent to ${currentUser.email}`);
        } catch (err) {
            console.error(err);
        } finally {
            setIsTesting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-24 bg-#FBFCFE min-h-screen items-center"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

    const targetAudience = audiences.find(a => a.id === campaign.audienceId);
    const recipients = targetAudience?.recipients || [];
    const activeRecipients = recipients.filter(r => !excludedIds.includes(r.id || r.email));

    return (
        <div className="min-h-screen bg-[#FDFEFE] py-12 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
                {!success ? (
                    <>
                        {/* Simple Launch Control */}
                        <div className="col-span-12 flex justify-center">
                            <div className="bg-white rounded-[40px] p-12 border border-slate-100 shadow-xl max-w-lg w-full text-center">
                                <h1 className="text-3xl font-black text-slate-900 leading-tight italic uppercase mb-2">Ready to Launch?</h1>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">{campaign.name}</p>

                                <div className="mb-8">
                                    <span className="text-5xl font-black text-slate-900">{activeRecipients.length}</span>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Recipients Standing By</p>
                                </div>

                                {error && <p className="text-rose-500 text-xs font-bold uppercase mb-4">{error}</p>}

                                <button
                                    onClick={handleLaunch}
                                    disabled={sending || activeRecipients.length === 0}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all hover:-translate-y-1"
                                >
                                    {sending ? 'Initiating Launch...' : 'Confirm & Send Now'}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="col-span-12 py-32 text-center space-y-10 bg-white rounded-[60px] shadow-2xl border border-slate-50">
                        <div className="w-32 h-32 bg-indigo-50 text-indigo-600 rounded-[40px] flex items-center justify-center mx-auto animate-bounce shadow-2xl shadow-indigo-100">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-5xl font-black text-slate-900 tracking-tight italic uppercase">{scheduledFor ? 'Scheduled!' : 'Mission Success!'}</h1>
                            <p className="text-slate-400 font-medium text-lg max-w-md mx-auto">
                                {scheduledFor
                                    ? `Strategic broadcast primed for delivery on ${new Date(scheduledFor).toLocaleDateString()}.`
                                    : "The campaign is now traveling through the digital ether to your audience."}
                            </p>
                        </div>
                        <div className="w-64 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden">
                            <div className="w-full h-full bg-indigo-600 animate-slide-in"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CampaignSender;

