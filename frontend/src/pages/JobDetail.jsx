import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getJobById, submitApplication } from '../services/job.service';

export default function JobDetail() {
    const { id } = useParams();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [applyModal, setApplyModal] = useState(false);
    const [applicationData, setApplicationData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        yearsOfExperience: '',
        salaryExpectation: '',
        resume: null,
        coverLetter: ''
    });

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const jobData = await getJobById(id); // Implement this service function
                setJob(jobData);
            } catch (err) {
                setError('Failed to fetch job details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [id]);

    if (loading) {
        return <div className="job-detail-container">Loading job details...</div>;
    }

    if (error) {
        return <div className="job-detail-container error">{error}</div>;
    }

    if (!job) {
        return <div className="job-detail-container">Job not found.</div>;
    }

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleApply = async (e) => {
        e.preventDefault();
        try {
            await submitApplication({
                ...applicationData,
                jobId: id,
                appliedAt: new Date().toISOString()
            });
            alert('Application submitted successfully!');
            setApplyModal(false);
            setApplicationData({
                name: '',
                email: '',
                phone: '',
                address: '',
                yearsOfExperience: '',
                salaryExpectation: '',
                resume: null,
                coverLetter: ''
            });
        } catch (error) {
            alert('Failed to submit application: ' + error.message);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            setApplicationData(prev => ({ ...prev, [name]: files[0] }));
        } else {
            setApplicationData(prev => ({ ...prev, [name]: value }));
        }
    };

    return (
        <div className="job-detail-container">
            <Helmet>
                <title>{job.seoTitle || job.title + ' | WorkHub'}</title>
                <meta name="description" content={job.metaDescription || job.description?.substring(0, 160)} />
                <meta name="keywords" content={`${job.focusKeyphrase || ''}, ${job.keyphraseSynonyms || ''}`} />
            </Helmet>

            <h1 className="job-detail-title">{job.title}</h1>
            <div className="job-detail-header">
                <h2 className="job-detail-company">{job.companyName || 'Private Employer'}</h2>
                <span className="job-detail-type">{job.type}</span>
            </div>
            <div className="job-detail-meta">
                <span className="job-detail-location">📍 {job.location}</span>
                <span className="job-detail-salary">💵 {job.salary}</span>
                <span className="job-detail-posted">Posted: {formatDate(job.createdAt)}</span>
            </div>

            {/* Decoded description to handle potentially escaped HTML from DB */}
            <div className="job-detail-description" dangerouslySetInnerHTML={{
                __html: (() => {
                    const txt = document.createElement('textarea');
                    txt.innerHTML = job.description || '';
                    return txt.value;
                })()
            }}></div>
            {/* Add more job details here as needed */}
            <button className="btn-apply" onClick={() => setApplyModal(true)}>Apply Now</button>

            {applyModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '10px',
                        maxWidth: '500px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <h2 style={{ marginBottom: '20px', color: '#333', textAlign: 'center' }}>Apply for {job.title}</h2>
                        <form onSubmit={handleApply}>
                            <div className="form-row" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Full Name:</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={applicationData.name}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px' }}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Email:</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={applicationData.email}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px' }}
                                    />
                                </div>
                            </div>
                            <div className="form-row" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Phone:</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={applicationData.phone}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px' }}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Years of Experience:</label>
                                    <input
                                        type="number"
                                        name="yearsOfExperience"
                                        value={applicationData.yearsOfExperience}
                                        onChange={handleInputChange}
                                        min="0"
                                        style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px' }}
                                    />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Address:</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={applicationData.address}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Salary Expectation:</label>
                                <input
                                    type="text"
                                    name="salaryExpectation"
                                    value={applicationData.salaryExpectation}
                                    onChange={handleInputChange}
                                    placeholder="e.g. $50,000 - $60,000"
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Resume (PDF or DOC):</label>
                                <input
                                    type="file"
                                    name="resume"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' }}>Cover Letter:</label>
                                <textarea
                                    name="coverLetter"
                                    value={applicationData.coverLetter}
                                    onChange={handleInputChange}
                                    rows="4"
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px', resize: 'vertical' }}
                                ></textarea>
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setApplyModal(false)}
                                    style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Submit Application
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
