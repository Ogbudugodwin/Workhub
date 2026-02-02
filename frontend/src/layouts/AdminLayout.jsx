import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

// Utility to check if user has a specific privilege
const hasPrivilege = (user, privilege) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true; // Super admin has all privileges
    return (user.privileges || []).includes(privilege);
};

const AdminLayout = () => {
    const location = useLocation();
    const { userData, logout, currentUser } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [isEmailMarketingOpen, setIsEmailMarketingOpen] = useState(location.pathname.includes('email-marketing'));

    const loadUsers = async () => {
        // PREVENT FETCH IF NOT AUTHORIZED
        // If userData isn't loaded yet, or if they don't have permission, skip this.
        if (!currentUser || !userData) return;

        // Strict Privilege Check for loading sidebar user list
        if (userData?.role !== 'super_admin' && !(userData?.privileges || []).includes('view_users')) {
            return;
        }

        if (!currentUser) return;
        setLoadingUsers(true);
        try {
            const response = await fetch(`${API_URL}/users`, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-uid': currentUser.uid,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [currentUser, userData]);


    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className={`wp-admin-layout ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            {/* Mobile Toggle Overlay */}
            {isSidebarOpen && <div className="wp-overlay" onClick={toggleSidebar}></div>}

            {/* Sidebar */}
            <aside className={`wp-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="wp-sidebar-brand">
                    WorkHub Admin
                </div>
                <nav className="wp-sidebar-nav">
                    <ul>
                        <li className={location.pathname === '/dashboard' ? 'active' : ''}>
                            <Link to="/dashboard" onClick={() => setIsSidebarOpen(false)}>
                                <span className="wp-icon">📊</span> Dashboard
                            </Link>
                        </li>
                        {(hasPrivilege(userData, 'view_jobs') || userData?.role === 'recruiter' || userData?.role === 'company_admin') && (
                            <li className={location.pathname.startsWith('/dashboard/posts') ? 'active' : ''}>
                                <Link to="/dashboard/posts" onClick={() => setIsSidebarOpen(false)}>
                                    <span className="wp-icon">📌</span> Job Posts
                                </Link>
                            </li>
                        )}
                        {hasPrivilege(userData, 'view_categories') && (
                            <li className={location.pathname === '/dashboard/categories' ? 'active' : ''}>
                                <Link to="/dashboard/categories" onClick={() => setIsSidebarOpen(false)}>
                                    <span className="wp-icon">📁</span> Categories
                                </Link>
                            </li>
                        )}
                        {(hasPrivilege(userData, 'view_applications') || userData?.role === 'recruiter' || userData?.role === 'company_admin') && (
                            <li className={location.pathname === '/dashboard/applications' ? 'active' : ''}>
                                <Link to="/dashboard/applications" onClick={() => setIsSidebarOpen(false)}>
                                    <span className="wp-icon">📋</span> Applications
                                </Link>
                            </li>
                        )}

                        {/* Branch Management */}
                        {(userData?.role === 'super_admin' || hasPrivilege(userData, 'view_branches')) && (
                            <li className={location.pathname === '/dashboard/branches' ? 'active' : ''}>
                                <Link to="/dashboard/branches" onClick={() => setIsSidebarOpen(false)}>
                                    <span className="wp-icon">🏢</span> Branches
                                </Link>
                            </li>
                        )}


                        {/* CRM Section: Shows if ANY CRM privilege exists */}
                        {(userData?.role === 'super_admin' ||
                            hasPrivilege(userData, 'view_attendance') ||
                            hasPrivilege(userData, 'manage_attendance') ||
                            hasPrivilege(userData, 'view_reports') ||
                            hasPrivilege(userData, 'view_leave') ||
                            hasPrivilege(userData, 'view_complaints')) && (
                                <>
                                    <li style={{ marginTop: '15px', padding: '5px 15px' }}>
                                        <span style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            color: '#666',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>CRM</span>
                                    </li>
                                    {(userData?.role === 'staff' || hasPrivilege(userData, 'view_attendance') || hasPrivilege(userData, 'manage_attendance')) && (
                                        <li className={location.pathname === '/dashboard/attendance' ? 'active' : ''}>
                                            <Link to="/dashboard/attendance" onClick={() => setIsSidebarOpen(false)}>
                                                <span className="wp-icon">📅</span> {userData?.role === 'staff' ? 'Attendance History' : 'Attendance Records'}
                                            </Link>
                                        </li>
                                    )}
                                    {(userData?.role === 'staff' || hasPrivilege(userData, 'manage_attendance')) && (
                                        <>
                                            <li className={location.pathname === '/dashboard/clock-in' ? 'active' : ''}>
                                                <Link to="/dashboard/clock-in" onClick={() => setIsSidebarOpen(false)}>
                                                    <span className="wp-icon">🕒</span> Clock In
                                                </Link>
                                            </li>
                                            <li className={location.pathname === '/dashboard/clock-out' ? 'active' : ''}>
                                                <Link to="/dashboard/clock-out" onClick={() => setIsSidebarOpen(false)}>
                                                    <span className="wp-icon">⏳</span> Clock Out
                                                </Link>
                                            </li>
                                        </>
                                    )}

                                    {(userData?.role === 'staff' || hasPrivilege(userData, 'view_reports')) && (
                                        <li className={location.pathname === '/dashboard/work-reports' ? 'active' : ''}>
                                            <Link to="/dashboard/work-reports" onClick={() => setIsSidebarOpen(false)}>
                                                <span className="wp-icon">📊</span> {userData?.role === 'staff' ? 'My Reports' : 'Work Reports'}
                                            </Link>
                                        </li>
                                    )}
                                    {(userData?.role === 'staff' || hasPrivilege(userData, 'view_leave')) && (
                                        <li className={location.pathname === '/dashboard/leave-requests' ? 'active' : ''}>
                                            <Link to="/dashboard/leave-requests" onClick={() => setIsSidebarOpen(false)}>
                                                <span className="wp-icon">🏖️</span> Leave Requests
                                            </Link>
                                        </li>
                                    )}
                                    {(userData?.role === 'staff' || hasPrivilege(userData, 'view_complaints')) && (
                                        <li className={location.pathname === '/dashboard/complaints' ? 'active' : ''}>
                                            <Link to="/dashboard/complaints" onClick={() => setIsSidebarOpen(false)}>
                                                <span className="wp-icon">⚠️</span> Complaints
                                            </Link>
                                        </li>
                                    )}
                                </>
                            )}

                        {(userData?.role === 'staff' || userData?.role === 'super_admin' || hasPrivilege(userData, 'view_chat')) && (
                            <li className={location.pathname === '/dashboard/chat' ? 'active' : ''}>
                                <Link to="/dashboard/chat" onClick={() => setIsSidebarOpen(false)}>
                                    <span className="wp-icon">💬</span> Communication
                                </Link>
                            </li>
                        )}

                        {(userData?.role === 'super_admin' || hasPrivilege(userData, 'view_email_marketing')) && (
                            <li className={`wp-has-submenu ${isEmailMarketingOpen ? 'expanded' : ''} ${location.pathname.startsWith('/dashboard/email-marketing') ? 'active' : ''}`}>
                                <button
                                    onClick={() => setIsEmailMarketingOpen(!isEmailMarketingOpen)}
                                    className="wp-submenu-toggle"
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1rem 1.5rem',
                                        color: '#eee',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.95rem',
                                        borderLeft: '4px solid transparent',
                                        textAlign: 'left'
                                    }}
                                >
                                    <span className="wp-icon">📧</span> Email Marketing
                                    <span style={{ marginLeft: 'auto', transition: 'transform 0.3s', transform: isEmailMarketingOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                                </button>
                                <ul className="wp-submenu" style={{
                                    listStyle: 'none',
                                    padding: '0',
                                    margin: '0',
                                    backgroundColor: '#191e23',
                                    maxHeight: isEmailMarketingOpen ? '500px' : '0',
                                    overflow: 'hidden',
                                    transition: 'max-height 0.3s ease-out'
                                }}>
                                    <li>
                                        <Link to="/dashboard/email-marketing?tab=dashboard" onClick={() => setIsSidebarOpen(false)} style={{ paddingLeft: '3rem' }}>Dashboard</Link>
                                    </li>
                                    <li>
                                        <Link to="/dashboard/email-marketing?tab=campaigns" onClick={() => setIsSidebarOpen(false)} style={{ paddingLeft: '3rem' }}>Campaigns</Link>
                                    </li>
                                    {hasPrivilege(userData, 'view_customers') && (
                                        <li>
                                            <Link to="/dashboard/email-marketing?tab=customers" onClick={() => setIsSidebarOpen(false)} style={{ paddingLeft: '3rem' }}>Subscribers</Link>
                                        </li>
                                    )}
                                    <li>
                                        <Link to="/dashboard/email-marketing?tab=automation" onClick={() => setIsSidebarOpen(false)} style={{ paddingLeft: '3rem' }}>Analytics</Link>
                                    </li>
                                    <li>
                                        <Link to="/dashboard/email-marketing?tab=settings" onClick={() => setIsSidebarOpen(false)} style={{ paddingLeft: '3rem' }}>Settings</Link>
                                    </li>
                                </ul>
                            </li>
                        )}


                        {(userData?.role === 'super_admin' || userData?.role === 'company_admin') && (
                            <>
                                <li className={location.pathname === '/dashboard/users' ? 'active' : ''}>
                                    <Link to="/dashboard/users" onClick={() => setIsSidebarOpen(false)}>
                                        <span className="wp-icon">👥</span> Users
                                    </Link>
                                </li>
                                {(userData?.role === 'super_admin' || hasPrivilege(userData, 'create_users')) && (
                                    <li className={location.pathname === '/dashboard/create-user' ? 'active' : ''}>
                                        <Link to="/dashboard/create-user" onClick={() => setIsSidebarOpen(false)}>
                                            <span className="wp-icon">➕</span> Add User
                                        </Link>
                                    </li>
                                )}
                            </>
                        )}
                        <li className={location.pathname === '/dashboard/settings' ? 'active' : ''}>
                            <Link to="/dashboard/settings" onClick={() => setIsSidebarOpen(false)}>
                                <span className="wp-icon">⚙️</span> Settings
                            </Link>
                        </li>
                    </ul>
                </nav>
                <div className="wp-sidebar-footer">
                    <Link to="/" className="wp-back-link">← Back to Site</Link>
                </div>
            </aside>

            {/* Main Content */}
            <div className="wp-main-content">
                {/* Top Bar - Hidden on Email Marketing for clean design */}
                {!location.pathname.startsWith('/dashboard/email-marketing') && (
                    <header className="wp-topbar">
                        <div className="topbar-left">
                            <button className="wp-mobile-toggle" onClick={toggleSidebar} aria-label="Toggle Menu">
                                ☰
                            </button>
                            <span className="wp-page-title">Dashboard</span>
                        </div>

                        <div className="wp-user-menu">
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginRight: '10px', fontWeight: 'bold' }}>
                                {userData?.role?.toUpperCase()}
                            </span>
                            <span className="user-name-display">{userData?.name || 'Admin'}</span>
                            <button
                                onClick={() => logout()}
                                style={{ marginLeft: '20px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                Log Out
                            </button>
                        </div>
                    </header>
                )}

                {/* Page Content */}
                <main className="wp-content-area">
                    <Outlet context={{ users, loadUsers, loadingUsers }} />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
