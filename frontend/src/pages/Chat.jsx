import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchChannels, fetchMessages, sendMessage, createChannel, fetchChatUsers, updateMessage, deleteMessage, markMessagesAsRead } from '../services/chat.service';
import { UPLOADS_URL } from '../config';
import './Chat.css';

const Chat = () => {
    const { currentUser, userData } = useAuth();
    const [channels, setChannels] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);

    // Edit state
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editText, setEditText] = useState('');

    // Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newChannelData, setNewChannelData] = useState({ name: '', type: 'public', selectedMembers: [] });

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);

    useEffect(() => {
        if (!currentUser) return;
        const loadInitialData = async () => {
            try {
                const [channelsData, usersData] = await Promise.all([
                    fetchChannels(currentUser.uid),
                    fetchChatUsers(currentUser.uid)
                ]);
                setChannels(channelsData);
                setUsers(usersData);

                // Set default channel to #general if it exists
                const general = channelsData.find(c => c.name === 'general');
                if (general) {
                    setActiveChannel(general);
                } else if (channelsData.length > 0) {
                    setActiveChannel(channelsData[0]);
                }
            } catch (err) {
                console.error("Initial load error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
        const channelInterval = setInterval(async () => {
            try {
                const channelsData = await fetchChannels(currentUser.uid);
                setChannels(channelsData);
            } catch (err) {
                console.error("Channel refresh error:", err);
            }
        }, 10000); // Poll channels every 10s for unread counts
        return () => clearInterval(channelInterval);
    }, [currentUser]);

    // Add this ref near others
    const lastDataInfo = useRef(null);

    useEffect(() => {
        if (!activeChannel || !currentUser) return;

        // Clear messages and reset tracker on channel switch
        setMessages([]);
        lastDataInfo.current = null;

        const loadMessages = async () => {
            try {
                const data = await fetchMessages(activeChannel.id, currentUser.uid);

                // Simple equality check to prevent re-renders/scrolling
                const currentDataStr = JSON.stringify(data);
                if (currentDataStr !== lastDataInfo.current) {
                    setMessages(data);
                    lastDataInfo.current = currentDataStr;

                    // Mark as read if we just received new messages in active channel
                    await markMessagesAsRead(activeChannel.id, currentUser.uid);

                    // Clear unread count locally for better UX
                    setChannels(prev => prev.map(c =>
                        c.id === activeChannel.id ? { ...c, unreadCount: 0 } : c
                    ));
                }
            } catch (err) {
                if (err.message?.includes('403')) {
                    setActiveChannel(null);
                }
            }
        };
        loadMessages();
        const interval = setInterval(loadMessages, 3000);
        return () => clearInterval(interval);
    }, [activeChannel, currentUser]);

    useEffect(() => {
        // Only scroll if it's the first load OR if user is already near the bottom
        // We use a lenient threshold (e.g., 300px) to determine "near bottom"
        const container = document.querySelector('.message-list');
        if (container) {
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
            if (isNearBottom || messages.length < 5) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!inputText.trim() || !activeChannel) return;

        try {
            const newMessage = await sendMessage({
                channelId: activeChannel.id,
                content: inputText,
                type: 'text'
            }, currentUser.uid);
            setMessages(prev => [...prev, newMessage]);
            setInputText('');
        } catch (err) {
            console.error("Send error:", err);
        }
    };

    const handleEditMessage = async (messageId) => {
        if (!editText.trim()) return;
        try {
            const updated = await updateMessage(messageId, editText, currentUser.uid);
            setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
            setEditingMessageId(null);
            setEditText('');
        } catch (err) {
            console.error("Edit error:", err);
            alert("Failed to save changes. Please try again.");
        }
    };

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;
        try {
            await deleteMessage(messageId, currentUser.uid);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (err) {
            console.error("Delete error:", err);
            alert("Failed to delete message");
        }
    };

    const startEditing = (msg) => {
        setEditingMessageId(msg.id);
        setEditText(msg.content);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0] || e;
        if (!file || !activeChannel) return;

        try {
            const newMessage = await sendMessage({
                channelId: activeChannel.id,
                file: file,
                type: file.type?.startsWith('audio/') ? 'voice' : 'file'
            }, currentUser.uid);
            setMessages(prev => [...prev, newMessage]);
        } catch (err) {
            console.error("Upload error:", err);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
                handleFileUpload(file);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Recording error:", err);
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            setMediaRecorder(null);
        }
    };

    const handleStartDM = async (targetUser) => {
        const existingDM = channels.find(c =>
            c.type === 'direct' &&
            c.members?.includes(targetUser.id) &&
            c.members?.includes(currentUser.uid) &&
            c.members?.length === 2
        );

        if (existingDM) {
            setActiveChannel(existingDM);
        } else {
            try {
                const newDM = await createChannel({
                    name: targetUser.id,
                    type: 'direct',
                    members: [currentUser.uid, targetUser.id]
                }, currentUser.uid);
                setChannels(prev => [...prev, newDM]);
                setActiveChannel(newDM);
            } catch (err) {
                console.error("Failed to start DM:", err);
            }
        }
    };

    const getChannelDisplayName = (channel) => {
        if (channel.type !== 'direct') return channel.name;
        const otherId = channel.members?.find(id => id !== currentUser.uid);
        const otherUser = users.find(u => u.id === otherId);
        return otherUser ? otherUser.name : (channel.name === currentUser.uid ? 'Self' : 'Loading...');
    };

    const toggleMemberSelection = (userId) => {
        setNewChannelData(prev => ({
            ...prev,
            selectedMembers: prev.selectedMembers.includes(userId)
                ? prev.selectedMembers.filter(id => id !== userId)
                : [...prev.selectedMembers, userId]
        }));
    };

    const handleCreateChannel = async (e) => {
        e.preventDefault();
        if (!newChannelData.name.trim() && newChannelData.type !== 'direct') return;

        try {
            const channelData = {
                name: newChannelData.name,
                type: newChannelData.type,
                members: [...newChannelData.selectedMembers, currentUser.uid]
            };

            const channel = await createChannel(channelData, currentUser.uid);
            setChannels(prev => [...prev, channel]);
            setActiveChannel(channel);
            setShowCreateModal(false);
            setNewChannelData({ name: '', type: 'public', selectedMembers: [] });
        } catch (err) {
            console.error("Failed to create channel:", err);
        }
    };

    if (loading) return <div className="chat-loading">Initializing Workspace...</div>;

    const activeName = activeChannel ? getChannelDisplayName(activeChannel) : '';

    return (
        <div className="chat-layout">
            <aside className="chat-sidebar">
                <div className="sidebar-header">
                    <h2>{userData?.companyName || 'WorkHub'}</h2>
                    <button className="add-btn" onClick={() => setShowCreateModal(true)} title="Create Channel or Group">+</button>
                </div>

                <div className="sidebar-scrollable">
                    <div className="sidebar-section">
                        <h3>Channels & Groups</h3>
                        <ul>
                            {channels.filter(c => c.type !== 'direct').map(channel => (
                                <li
                                    key={channel.id}
                                    className={activeChannel?.id === channel.id ? 'active' : ''}
                                    onClick={() => setActiveChannel(channel)}
                                >
                                    <span className="channel-prefix">{channel.type === 'public' ? '#' : '🔒'}</span>
                                    <span className="channel-name-text">{channel.name}</span>
                                    {channel.unreadCount > 0 && channel.id !== activeChannel?.id && (
                                        <span className="unread-badge">{channel.unreadCount}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="sidebar-section">
                        <h3>Direct Messages</h3>
                        <ul>
                            {channels.filter(c => c.type === 'direct').map(channel => (
                                <li
                                    key={channel.id}
                                    className={activeChannel?.id === channel.id ? 'active' : ''}
                                    onClick={() => setActiveChannel(channel)}
                                >
                                    <span className="channel-prefix">@</span>
                                    <span className="channel-name-text">{getChannelDisplayName(channel)}</span>
                                    {channel.unreadCount > 0 && channel.id !== activeChannel?.id && (
                                        <span className="unread-badge">{channel.unreadCount}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="sidebar-section">
                        <h3>Staff Directory</h3>
                        <ul className="member-list">
                            {users.length > 0 ? users.map(user => (
                                <li key={user.id} onClick={() => handleStartDM(user)} className={activeChannel?.members?.includes(user.id) && activeChannel.type === 'direct' ? 'active' : ''}>
                                    <span className="status-indicator online"></span>
                                    <div className="member-info">
                                        <span className="member-name">{user.name}</span>
                                        <span className="member-role">{user.role}</span>
                                    </div>
                                </li>
                            )) : (
                                <li className="no-members">No colleagues found</li>
                            )}
                        </ul>
                    </div>
                </div>
            </aside>

            <main className="chat-window">
                <header className="chat-header">
                    <div className="channel-info">
                        <h3>
                            <span className="title-prefix">
                                {activeChannel?.type === 'direct' ? '@' : activeChannel?.type === 'public' ? '#' : '🔒'}
                            </span>
                            {activeName}
                        </h3>
                        <div className="channel-meta">
                            <span className="member-count">{activeChannel?.members?.length || 0} members</span>
                            {activeChannel?.type === 'public' && <span className="public-badge">Public Channel</span>}
                        </div>
                    </div>
                    <div className="header-actions">
                        <button className="btn-meeting" onClick={() => window.open('https://meet.jit.si/' + activeChannel?.id, '_blank')}>
                            📹 Start Meeting
                        </button>
                    </div>
                </header>

                <div className="message-list">
                    {messages.length === 0 && (
                        <div className="chat-welcome">
                            <div className="welcome-icon">💬</div>
                            <h4>This is the start of the <strong>{activeName}</strong> conversation.</h4>
                            <p>Send a message to get things started!</p>
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <div key={msg.id || idx} className={`message-item ${msg.senderId === currentUser.uid ? 'own' : ''}`}>
                            <div className="msg-avatar" title={msg.senderName}>{msg.senderName?.[0] || '?'}</div>
                            <div className="msg-content-wrapper">
                                <div className="msg-meta">
                                    <span className="sender">{msg.senderName}</span>
                                    <span className="time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {msg.editedAt && <span className="edited-tag">(edited)</span>}
                                    {msg.senderId === currentUser.uid && !editingMessageId && (
                                        <div className="msg-actions">
                                            <button className="edit-msg-btn" onClick={() => startEditing(msg)}>Edit</button>
                                            <button className="delete-msg-btn" onClick={() => handleDeleteMessage(msg.id)}>Delete</button>
                                        </div>
                                    )}
                                </div>
                                <div className="msg-body">
                                    {editingMessageId === msg.id ? (
                                        <div className="edit-form">
                                            <input
                                                type="text"
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleEditMessage(msg.id);
                                                    if (e.key === 'Escape') setEditingMessageId(null);
                                                }}
                                                autoFocus
                                            />
                                            <div className="edit-actions">
                                                <button onClick={() => handleEditMessage(msg.id)}>Save</button>
                                                <button onClick={() => setEditingMessageId(null)}>Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {msg.type === 'text' && <p>{msg.content}</p>}
                                            {msg.type === 'file' && (
                                                <div className="file-attachment">
                                                    <div className="file-box">
                                                        <span className="file-icon">📄</span>
                                                        <div className="file-details">
                                                            <span className="file-name">{msg.fileName}</span>
                                                            <a href={`${UPLOADS_URL}${msg.fileUrl}`} target="_blank" rel="noreferrer">Download File</a>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {msg.type === 'voice' && (
                                                <div className="voice-note">
                                                    <audio controls src={`${UPLOADS_URL}${msg.fileUrl}`}></audio>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {!editingMessageId && (
                    <form className="chat-input-area" onSubmit={handleSendMessage}>
                        <div className="input-toolbar">
                            <button type="button" onClick={() => fileInputRef.current.click()} title="Attach File">📎</button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                            <button
                                type="button"
                                title={isRecording ? "Stop Recording" : "Record Voice Note"}
                                onClick={isRecording ? stopRecording : startRecording}
                                className={isRecording ? 'recording' : ''}
                            >
                                {isRecording ? '⏹️' : '🎙️'}
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder={`Message ${activeChannel?.type === 'direct' ? '@' : '#'} ${activeName}`}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                        <button type="submit" disabled={!inputText.trim()} className="send-btn">
                            <span>➤</span>
                        </button>
                    </form>
                )}
            </main>

            {/* CREATE CHANNEL MODAL */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="chat-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Group or Channel</h3>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateChannel}>
                            <div className="form-group">
                                <label>Group / Channel Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. design-team or marketing-group"
                                    value={newChannelData.name}
                                    onChange={e => setNewChannelData({ ...newChannelData, name: e.target.value })}
                                    required={newChannelData.type !== 'direct'}
                                />
                            </div>
                            <div className="form-group">
                                <label>Type</label>
                                <div className="type-options">
                                    <label className={`type-option ${newChannelData.type === 'public' ? 'selected' : ''}`}>
                                        <input type="radio" name="chatType" value="public" checked={newChannelData.type === 'public'} onChange={e => setNewChannelData({ ...newChannelData, type: e.target.value })} />
                                        <span><strong># Public Channel</strong><br /><small>Visible to everyone</small></span>
                                    </label>
                                    <label className={`type-option ${newChannelData.type === 'private' ? 'selected' : ''}`}>
                                        <input type="radio" name="chatType" value="private" checked={newChannelData.type === 'private'} onChange={e => setNewChannelData({ ...newChannelData, type: e.target.value })} />
                                        <span><strong>🔒 Private Group</strong><br /><small>Only selected members can join/view</small></span>
                                    </label>
                                    <label className={`type-option ${newChannelData.type === 'direct' ? 'selected' : ''}`}>
                                        <input type="radio" name="chatType" value="direct" checked={newChannelData.type === 'direct'} onChange={e => setNewChannelData({ ...newChannelData, type: e.target.value })} />
                                        <span><strong>👥 Direct Message</strong><br /><small>Chat with one or more colleagues</small></span>
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Select Members ({newChannelData.selectedMembers.length} selected)</label>
                                <div className="member-selector">
                                    {users.map(user => (
                                        <div
                                            key={user.id}
                                            className={`selector-item ${newChannelData.selectedMembers.includes(user.id) ? 'selected' : ''}`}
                                            onClick={() => toggleMemberSelection(user.id)}
                                        >
                                            <span className="checkbox"></span>
                                            <span className="name">{user.name}</span>
                                            <span className="member-role">{user.role}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={newChannelData.type !== 'direct' && !newChannelData.name.trim()}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
