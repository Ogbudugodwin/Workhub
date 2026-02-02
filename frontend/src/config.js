
// Configuration for API endpoints
// In development, this relies on the proxy in vite.config.js if VITE_API_URL is empty
// In production, set VITE_API_URL to your backend's URL (e.g., https://my-backend.onrender.com)

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_URL = `${API_BASE_URL}/api`;
export const UPLOADS_URL = `${API_BASE_URL}/uploads`;

export default API_URL;
