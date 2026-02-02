import { API_URL } from '../config';


// Helper for authenticated requests
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

// -- JOBS SERVICE --

export async function fetchJobs(uid) {
    try {
        const response = await authFetch(`${API_URL}/jobs`, {}, uid);
        if (!response.ok) throw new Error('Failed to fetch jobs');
        return await response.json();
    } catch (error) {
        console.error("Error fetching jobs: ", error);
        return [];
    }
}

export async function getJobById(id, uid) {
    try {
        const response = await authFetch(`${API_URL}/jobs/${id}`, {}, uid);
        if (!response.ok) throw new Error('Failed to fetch job details');
        return await response.json();
    } catch (error) {
        console.error("Error fetching job by ID: ", error);
        throw error;
    }
}

export async function fetchPublishedJobs() {
    try {
        const response = await fetch(`${API_URL}/jobs/published`);
        if (!response.ok) throw new Error('Failed to fetch published jobs');
        return await response.json();
    } catch (error) {
        console.error("Error fetching published jobs: ", error);
        return [];
    }
}

export async function getJobsByCategory(categoryName) {
    try {
        const response = await fetch(`${API_URL}/jobs/category/${categoryName}`);
        if (!response.ok) throw new Error(`Failed to fetch jobs for category ${categoryName}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching jobs for category ${categoryName}: `, error);
        return [];
    }
}

export async function createJob(jobData, uid) {
    try {
        const response = await authFetch(`${API_URL}/jobs`, {
            method: 'POST',
            body: JSON.stringify(jobData),
        }, uid);

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create job');
            return data;
        } else {
            const text = await response.text();
            console.error("Non-JSON response received:", text);
            throw new Error(`Server Error: Received unexpected response from server. Status: ${response.status}`);
        }
    } catch (error) {
        console.error("createJob Service Error:", error);
        throw error;
    }
}

export async function updateJob(id, jobData, uid) {
    try {
        const response = await authFetch(`${API_URL}/jobs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(jobData),
        }, uid);
        if (!response.ok) throw new Error('Failed to update job');
        return await response.json();
    } catch (error) {
        throw error;
    }
}

export async function updateJobStatus(id, status, declineReason, uid) {
    try {
        const response = await authFetch(`${API_URL}/jobs/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, declineReason }),
        }, uid);
        if (!response.ok) throw new Error('Failed to update job status');
        return await response.json();
    } catch (error) {
        throw error;
    }
}

export async function deleteJob(id, uid) {
    try {
        const response = await authFetch(`${API_URL}/jobs/${id}`, {
            method: 'DELETE',
        }, uid);
        if (!response.ok) throw new Error('Failed to delete job');
        return await response.json();
    } catch (error) {
        throw error;
    }
}

// -- APPLICATIONS SERVICE --

export async function submitApplication(applicationData) {
    try {
        const formData = new FormData();
        Object.keys(applicationData).forEach(key => {
            if (applicationData[key] !== null && applicationData[key] !== undefined && applicationData[key] !== '') {
                formData.append(key, applicationData[key]);
            }
        });

        const response = await fetch(`${API_URL}/applications`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to submit application: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Submit application error:', error);
        throw error;
    }
}

// -- CATEGORIES SERVICE --

export async function fetchCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        return await response.json();
    } catch (error) {
        console.error("Error fetching categories: ", error);
        return [];
    }
}

export async function addCategory(categoryData) {
    try {
        const formData = new FormData();
        formData.append('name', categoryData.name);
        if (categoryData.icon) {
            formData.append('icon', categoryData.icon);
        }

        const response = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add category');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}

export async function deleteCategory(id) {
    try {
        const response = await fetch(`${API_URL}/categories/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete category');
        return await response.json();
    } catch (error) {
        throw error;
    }
}

export async function updateCategory(id, categoryData) {
    try {
        const formData = new FormData();
        if (categoryData.name) formData.append('name', categoryData.name);
        if (categoryData.icon) formData.append('icon', categoryData.icon);

        const response = await fetch(`${API_URL}/categories/${id}`, {
            method: 'PUT',
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update category');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}
