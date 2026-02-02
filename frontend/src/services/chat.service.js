import { API_URL as BASE_API_URL } from '../config';
const API_URL = `${BASE_API_URL}/chat`;


async function authFetch(url, options = {}, uid) {
    const headers = { ...options.headers };
    if (uid) headers['x-user-uid'] = uid;
    return fetch(url, { ...options, headers });
}

export const fetchChatUsers = async (uid) => {
    const response = await authFetch(`${API_URL}/users`, {}, uid);
    if (!response.ok) throw new Error("Failed to fetch chat users");
    return response.json();
};

export const fetchChannels = async (uid) => {
    const response = await authFetch(`${API_URL}/channels`, {}, uid);
    if (!response.ok) throw new Error("Failed to fetch channels");
    return response.json();
};

export const createChannel = async (channelData, uid) => {
    const response = await authFetch(`${API_URL}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(channelData),
    }, uid);
    if (!response.ok) throw new Error("Failed to create channel");
    return response.json();
};

export const fetchMessages = async (channelId, uid) => {
    const response = await authFetch(`${API_URL}/messages/${channelId}`, {}, uid);
    if (!response.ok) throw new Error("Failed to fetch messages");
    return response.json();
};

export const sendMessage = async (messageData, uid) => {
    const formData = new FormData();
    Object.keys(messageData).forEach(key => {
        formData.append(key, messageData[key]);
    });

    const response = await authFetch(`${API_URL}/messages`, {
        method: "POST",
        body: formData, // FormData handles its own Content-Type
    }, uid);
    if (!response.ok) throw new Error("Failed to send message");
    return response.json();
};
export const updateMessage = async (messageId, content, uid) => {
    const response = await authFetch(`${API_URL}/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    }, uid);
    if (!response.ok) throw new Error("Failed to update message");
    return response.json();
};

export const deleteMessage = async (messageId, uid) => {
    const response = await authFetch(`${API_URL}/messages/${messageId}`, {
        method: "DELETE"
    }, uid);
    if (!response.ok) throw new Error("Failed to delete message");
    return response.json();
};
export const markMessagesAsRead = async (channelId, uid) => {
    const response = await authFetch(`${API_URL}/read/${channelId}`, {
        method: "POST"
    }, uid);
    if (!response.ok) throw new Error("Failed to mark messages as read");
    return response.json();
};
