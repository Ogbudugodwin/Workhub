import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import JobCard from '../../components/JobCard';
import { fetchPublishedJobs } from '../../services/job.service';

export default function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [locationQuery, setLocationQuery] = useState(searchParams.get('location') || '');

    useEffect(() => {
        const loadJobs = async () => {
            try {
                const publishedJobs = await fetchPublishedJobs();
                setJobs(publishedJobs);
            } catch (err) {
                setError('Failed to load jobs.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadJobs();
    }, []);

    // Update state if URL parameters change (e.g. back button)
    useEffect(() => {
        setQuery(searchParams.get('q') || '');
        setLocationQuery(searchParams.get('location') || '');
    }, [searchParams]);

    const handleSearch = () => {
        const params = {};
        if (query) params.q = query;
        if (locationQuery) params.location = locationQuery;
        setSearchParams(params);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const filteredJobs = jobs.filter(job => {
        const matchesQuery = query
            ? (job.title.toLowerCase().includes(query.toLowerCase()) || job.companyName.toLowerCase().includes(query.toLowerCase()))
            : true;

        const matchesLocation = locationQuery
            ? job.location.toLowerCase().includes(locationQuery.toLowerCase())
            : true;

        return matchesQuery && matchesLocation;
    });

    if (loading) return <div>Loading jobs...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div className="jobs-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem', fontSize: '2rem', fontWeight: 'bold' }}>Find Your Dream Job</h1>

            <div className="search-container" style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2rem',
                flexWrap: 'wrap',
                background: '#f8fafc',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <input
                        type="text"
                        placeholder="Job title, keywords, or company"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1'
                        }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <input
                        type="text"
                        placeholder="Location (e.g. New York)"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1'
                        }}
                    />
                </div>
                <button
                    className="search-btn"
                    onClick={handleSearch}
                    style={{
                        padding: '0.75rem 2rem',
                        background: '#2563eb',
                        color: 'white',
                        fontWeight: '600',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Found {filteredJobs.length} Jobs
                </button>
            </div>

            <div className="job-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                {filteredJobs.map(job => (
                    <JobCard key={job.id} job={job} />
                ))}
            </div>

            {filteredJobs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>
                    <p style={{ fontSize: '1.25rem' }}>No jobs found matching your criteria.</p>
                    <button
                        onClick={() => { setQuery(''); setLocationQuery(''); setSearchParams({}); }}
                        style={{ marginTop: '1rem', color: '#2563eb', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        Clear filters
                    </button>
                </div>
            )}
        </div>
    );
}