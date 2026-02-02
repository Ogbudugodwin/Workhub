import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-section">
                    <h3 className="footer-logo">WorkHub</h3>
                    <div style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                        Your trusted partner in finding the perfect career opportunity.
                        Connect with top employers and take your career to the next level.
                    </div>
                    <div className="footer-contact-info" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        <p style={{ marginBottom: '0.5rem' }}>📍 123 Business St, San Francisco, CA</p>
                        <p>📧 info@workhub.com</p>
                    </div>
                </div>

                <div className="footer-section">
                    <h4 className="footer-heading">Quick Links</h4>
                    <ul className="footer-links">
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/jobs">Find Jobs</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4 className="footer-heading">Legal</h4>
                    <ul className="footer-links">
                        <li><Link to="/privacy">Privacy Policy</Link></li>
                        <li><Link to="/terms">Terms & Conditions</Link></li>
                        <li><Link to="/faq">FAQ</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h4 className="footer-heading">Subscribe to Our Newsletter</h4>
                    <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.95rem' }}>
                        Stay updated with the latest jobs and news.
                    </p>
                    <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                        <input type="email" placeholder="Email" />
                        <button type="submit">Subscribe</button>
                    </form>
                </div>
            </div>

            <div className="footer-bottom">
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    &copy; {new Date().getFullYear()} WorkHub. All rights reserved.
                </p>
                <div className="social-links">
                    <a href="#" aria-label="Facebook">📘</a>
                    <a href="#" aria-label="Twitter">🐦</a>
                    <a href="#" aria-label="LinkedIn">💼</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
