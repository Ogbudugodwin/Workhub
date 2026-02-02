import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    WorkHub
                </Link>

                {/* Hamburger Menu Button */}
                <button
                    className={`hamburger ${isMenuOpen ? 'active' : ''}`}
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                >
                    <span className="hamburger-line"></span>
                    <span className="hamburger-line"></span>
                    <span className="hamburger-line"></span>
                </button>

                <div className={`navbar-collapse ${isMenuOpen ? 'active' : ''}`}>
                    <ul className="navbar-menu">
                        <li className="navbar-item">
                            <Link to="/" className="navbar-link" onClick={() => setIsMenuOpen(false)}>Home</Link>
                        </li>
                        <li className="navbar-item">
                            <Link to="/about" className="navbar-link" onClick={() => setIsMenuOpen(false)}>About Us</Link>
                        </li>
                        <li className="navbar-item">
                            <Link to="/contact" className="navbar-link" onClick={() => setIsMenuOpen(false)}>Contact Us</Link>
                        </li>
                    </ul>

                    <div className="navbar-auth">
                        <Link to="/login" className="navbar-link navbar-signin" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                        <Link to="/register" className="navbar-link navbar-signup" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
