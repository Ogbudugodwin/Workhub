import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getJobsByCategory } from '../services/job.service'; // Assuming a service to fetch jobs by category
import JobCard from '../components/JobCard'; // Assuming JobCard component exists

export default function CategoryJobs() {
    const { categoryName } = useParams();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const jobsData = await getJobsByCategory(categoryName); // Implement this service function
                setJobs(jobsData);
            } catch (err) {
                setError(`Failed to fetch jobs for category "${categoryName}".`);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, [categoryName]);

    if (loading) {
        return <div className="category-jobs-container">Loading jobs for {categoryName}...</div>;
    }

    if (error) {
        return <div className="category-jobs-container error">{error}</div>;
    }

    return (
        <div className="category-jobs-container" style={{ padding: '4rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '2rem' }}>Jobs in {categoryName}</h1>
            {jobs.length === 0 ? (
                <p>No jobs found for this category.</p>
            ) : (
                <div className="jobs-grid">
                    {jobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                    ))}
                </div>
            )}
        </div>
    );
}
