import { useState, useEffect, useCallback } from 'react';
import { API_URL } from './config';

export const useCategoryStats = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            // Adjust the URL if your backend runs on a specific port (e.g., http://localhost:5000/api/...)
            const response = await fetch(`${API_URL}/categories`);
            if (!response.ok) {
                const errorText = await response.text().catch(() => response.statusText);
                throw new Error(`Error ${response.status}: ${errorText || 'Failed to fetch category statistics'}`);
            }

            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, error, refreshStats: fetchStats };
};