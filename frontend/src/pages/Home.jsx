import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import ImageSlider from "../components/ImageSlider";
import TestimonialSlider from "../components/TestimonialSlider";
import JobCard from "../components/JobCard";
import CategoryCard from "../components/CategoryCard";
import { fetchPublishedJobs } from "../services/job.service.js";
import { useCategoryStats } from "../useCategoryStats";

export default function Home() {
    const [jobs, setJobs] = useState([]);
    const { stats: categories } = useCategoryStats();
    const [query, setQuery] = useState("");
    const [locationQuery, setLocationQuery] = useState("");
    const navigate = useNavigate(); // Initialize hook

    useEffect(() => {
        async function loadData() {
            try {
                const publishedJobs = await fetchPublishedJobs();
                setJobs(publishedJobs);
            } catch (error) {
                console.error("Error loading home data:", error);
            }
        }
        loadData();
    }, []);

    const filteredJobs = jobs.filter((job) => {
        const matchesTitle = job.title?.toLowerCase().includes(query.toLowerCase()) ||
            job.companyName?.toLowerCase().includes(query.toLowerCase());
        const matchesLocation = locationQuery ? job.location?.toLowerCase().includes(locationQuery.toLowerCase()) : true;
        return matchesTitle && matchesLocation;
    });

    const displayedJobs = filteredJobs.slice(0, 6);

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (locationQuery) params.append('location', locationQuery);
        navigate(`/jobs?${params.toString()}`);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="home-container">
            {/* HERO SECTION */}
            <div className="hero-wrapper">
                <div className="hero-slider-background">
                    <ImageSlider />
                </div>
                <div className="hero-content-overlay">


                    <div className="hero-search-container">
                        <div className="search-input-group">
                            <span>🔍</span>
                            <input
                                type="text"
                                placeholder="Job Title or Keywords"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className="search-input-group" style={{ borderLeft: '1px solid #e2e8f0' }}>
                            <span>📍</span>
                            <input
                                type="text"
                                placeholder="Location"
                                value={locationQuery}
                                onChange={(e) => setLocationQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <button className="search-btn" onClick={handleSearch}>Search</button>
                    </div>
                </div>
            </div>

            {/* CATEGORIES */}
            <section className="section categories-section">
                <h2 className="section-title">Explore Job Categories</h2>
                <div className="categories-grid">
                    {categories.slice(0, 8).map((cat) => (
                        <CategoryCard key={cat.id} category={cat} />
                    ))}
                </div>
                <div className="view-all-jobs-container" style={{ marginTop: '5rem' }}>
                    <button className="btn-primary" onClick={() => navigate('/categories')}>View All Categories</button>
                </div>
            </section>

            {/* FEATURED JOBS */}
            <section className="section featured-jobs">
                <h2 className="section-title">Featured Jobs</h2>
                <div className="jobs-grid">
                    {displayedJobs.map((job) => (
                        <JobCard key={job.id} job={job} />
                    ))}
                </div>
                <div className="view-all-jobs-container">
                    <button className="btn-primary" onClick={() => navigate('/jobs')}>View All Jobs</button>
                </div>
            </section>

            {/* WHY CHOOSE US */}
            <section className="section why-choose-us">
                <h2 className="section-title">Why Choose Us?</h2>
                <div className="features-grid">
                    <div className="feature-item">
                        <div className="feature-icon">🛡️</div>
                        <div className="feature-text">
                            <h3>Verified Employers</h3>
                            <p>We verify every employer to ensure legit opportunities.</p>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">⚡</div>
                        <div className="feature-text">
                            <h3>Quick Applications</h3>
                            <p>Apply to jobs with just a single click.</p>
                        </div>
                    </div>
                    <div className="feature-item">
                        <div className="feature-icon">📈</div>
                        <div className="feature-text">
                            <h3>Career Growth</h3>
                            <p>Find roles that help you advance your career.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className="testimonials-section">
                <h2 className="section-title">What Our Users Say</h2>
                <TestimonialSlider />
            </section>
        </div>
    );
}
