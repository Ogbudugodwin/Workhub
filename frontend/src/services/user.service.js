import { API_URL } from '../config';


async function authFetch(url, options = {}, uid) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    if (uid) {
        headers['x-user-uid'] = uid;
    }
    return fetch(url, { ...options, headers });
}

export async function getUserById(uid, adminUid) {
    try {
        const response = await authFetch(`${API_URL}/users/${uid}`, {}, adminUid);
        if (!response.ok) throw new Error('Failed to fetch user details');
        return await response.json();
    } catch (error) {
        console.error("Error fetching user by ID: ", error);
        throw error;
    }
}

export async function updateUser(uid, userData, adminUid) {
    try {
        const response = await authFetch(`${API_URL}/users/${uid}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        }, adminUid);
        if (!response.ok) throw new Error('Failed to update user');
        return await response.json();
    } catch (error) {
        throw error;
    }
}

export async function createUser(userData, adminUid) {
    try {
        const response = await authFetch(`${API_URL}/users/admin-create`, {
            method: 'POST',
            body: JSON.stringify(userData),
        }, adminUid);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create user');
        }
        return await response.json();
    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    }
}

export async function getAllUsers(adminUid) {
    try {
        const response = await authFetch(`${API_URL}/users`, {}, adminUid);
        if (!response.ok) throw new Error('Failed to fetch users');
        return await response.json();
    } catch (error) {
        console.error("Error fetching users: ", error);
        return [];
    }
}
