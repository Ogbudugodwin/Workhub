import React from 'react';
import { Link } from 'react-router-dom';

export default function JobCard({ job }) {
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <Link to={`/jobs/${job.id}`} className="job-card-link">
            <div className="job-card">
                <div className="job-header">
                    <h3>{job.title}</h3>
                    <span className="job-type">{job.type}</span>
                </div>
                <div className="job-company">
                    <strong>{job.companyName || 'Private Employer'}</strong>
                </div>
                <div className="job-details">
                    <span className="job-location">📍 {job.location}</span>
                    <span className="job-salary">💵 {job.salary}</span>
                </div>
                <p className="job-description">
                    {(() => {
                        // Strip HTML tags for preview, handling potential escaped entities
                        const plainText = (job.description || '').replace(/<[^>]+>/g, '');
                        // Double check validation for escaped entities
                        const txt = document.createElement("textarea");
                        txt.innerHTML = plainText;
                        const decoded = txt.value;

                        return (
                            <>
                                {decoded.substring(0, 120)}
                                {decoded.length > 120 ? '...' : ''}
                            </>
                        );
                    })()}
                </p>
                <div className="job-footer">
                    <span className="job-posted">{formatDate(job.createdAt)}</span>
                    <button className="btn-apply">Apply Now</button>
                </div>
            </div>
        </Link>
    );
}
