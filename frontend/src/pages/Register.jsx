import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setError('');
            setSuccess('');
            setLoading(true);
            await register(email, password, name);
            setSuccess('Registration successful! Redirecting...');
            setTimeout(() => {
                navigate('/');
            }, 1000);
        } catch (err) {
            console.error(err);
            setError('Failed to create an account: ' + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Create Account</h2>
                <p className="auth-subtitle">Join us to find your dream job</p>

                {error && <div style={{ color: 'red', marginBottom: '1rem', background: '#ffe6e6', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}
                {success && <div style={{ color: 'green', marginBottom: '1rem', background: '#e6ffe6', padding: '0.5rem', borderRadius: '4px' }}>{success}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            placeholder="Enter your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account?
                    <Link to="/login" className="auth-link">Log In</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
