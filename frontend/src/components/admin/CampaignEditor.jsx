import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EmailVisualEditor from './EmailVisualEditor';

const CampaignEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [campaign, setCampaign] = useState({
        name: '',
        subject: '',
        preheader: '',
        senderName: '',
        senderEmail: '',
        htmlContent: '',
        contentBlocks: [],
        audienceId: '',
        excludedRecipientIds: [],
        scheduledAt: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    const API_URL = "http://localhost:5000/api";

    useEffect(() => {
        const fetchCampaign = async () => {
            if (!id || id === 'new' || !currentUser?.uid) {
                setCampaign(prev => ({
                    ...prev,
                    senderName: currentUser?.displayName || 'WorkHub Admin',
                    senderEmail: currentUser?.email || ''
                }));
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_URL}/email-marketing/campaigns/${id}`, {
                    headers: { 'x-user-uid': currentUser.uid }
                });
                if (response.ok) {
                    const data = await response.json();
                    setCampaign(data);
                }
            } catch (err) {
                console.error("Campaign fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCampaign();
    }, [id, currentUser]);

    const handleSave = async (content, blocks) => {
        const payload = {
            ...campaign,
            htmlContent: content,
            contentBlocks: blocks || campaign.contentBlocks || [],
            name: campaign.name || 'New Campaign',
            subject: campaign.subject || 'No Subject'
        };

        setSaving(true);
        try {
            const isNew = !id || id === 'new';
            const method = isNew ? 'POST' : 'PUT';
            const url = isNew
                ? `${API_URL}/email-marketing/campaigns`
                : `${API_URL}/email-marketing/campaigns/${id}`;

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser?.uid
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const isNew = !id || id === 'new';
                setNotification({
                    type: 'success',
                    message: isNew ? 'Campaign created successfully!' : 'Campaign updated successfully!'
                });

                if (isNew) {
                    // For new campaigns, redirect to the dashboard after showing the message
                    const data = await response.json();
                    setTimeout(() => {
                        navigate(`/dashboard/email-marketing/edit/${data.id}`);
                    }, 1500);
                } else {
                    // For updates, just clear the notification after a delay
                    setTimeout(() => {
                        setNotification(null);
                    }, 3000);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleSend = async (recipientIds) => {
        try {
            setSaving(true);

            // Update the campaign with selected recipient lists (for record keeping)
            const updateResponse = await fetch(`${API_URL}/email-marketing/campaigns/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser?.uid
                },
                body: JSON.stringify({
                    recipientListIds: recipientIds,
                    audienceId: recipientIds[0] || null // Fallback for legacy support
                })
            });

            if (!updateResponse.ok) throw new Error("Failed to update campaign recipients");

            // Trigger Send
            const sendResponse = await fetch(`${API_URL}/email-marketing/campaigns/${id}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser?.uid
                },
                body: JSON.stringify({
                    listIds: recipientIds
                })
            });

            if (sendResponse.ok) {
                setNotification({ type: 'success', message: 'Campaign sent successfully!' });
                setTimeout(() => {
                    navigate('/dashboard/email-marketing');
                }, 2000);
            } else {
                const errData = await sendResponse.json();
                throw new Error(errData.error || "Failed to send");
            }

        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: error.message || 'Error sending campaign' });
            setTimeout(() => setNotification(null), 3000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'white' }}>
            <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #E2E8F0',
                borderTop: '4px solid #3B82F6',
                borderRadius: '50%',
                animation: 'eve-spin 1s linear infinite'
            }}></div>
            <style>{`@keyframes eve-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-white">
            {notification && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: notification.type === 'error' ? '#EF4444' : '#10B981',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'slideDown 0.3s ease-out'
                }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                    {notification.message}
                </div>
            )}
            <style>{`
                @keyframes slideDown {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
            <EmailVisualEditor
                htmlContent={campaign.htmlContent}
                initialBlocks={campaign.contentBlocks}
                campaignName={campaign.name}
                campaignSubject={campaign.subject}
                onNameChange={(name) => setCampaign({ ...campaign, name })}
                onSubjectChange={(subject) => setCampaign({ ...campaign, subject })}
                onChange={(html, blocks) => setCampaign({ ...campaign, htmlContent: html, contentBlocks: blocks })}
                onSave={() => handleSave(campaign.htmlContent, campaign.contentBlocks)}
                onSend={(listIds) => handleSend(listIds)}
                onClose={() => navigate('/dashboard/email-marketing')}
                saveButtonLabel={(!id || id === 'new') ? 'Save' : 'Update'}
            />
        </div>
    );
};

export default CampaignEditor;
