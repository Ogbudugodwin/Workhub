import React from 'react';
import { Routes, Route } from 'react-router-dom';

import MainLayout from '../../layouts/MainLayout';
import AdminLayout from '../../layouts/AdminLayout';

import Home from '../../pages/Home';
import Login from '../../pages/Login';
import Register from '../../pages/Register';
import Jobs from '../../pages/public/Jobs';
import AllCategories from '../../pages/public/AllCategories'; // New import
import JobDetail from '../../pages/JobDetail'; // New import
import CategoryJobs from '../../pages/CategoryJobs'; // New import
import AdminDashboard from '../../pages/AdminDashboard';
import UserManager from '../../components/admin/UserManager';
import AdminCreateUser from '../../components/admin/AdminCreateUser';
import CategoryManager from '../../components/admin/CategoryManager';
import JobManager from '../../components/admin/JobManager';
import JobEditor from '../../components/admin/JobEditor';
import ApplicationsManager from '../../components/admin/ApplicationsManager';
import AttendanceManager from '../../components/admin/AttendanceManager';
import AttendanceSettings from '../../components/admin/AttendanceSettings';
import BranchManager from '../../components/admin/BranchManager';
import Settings from '../../components/admin/Settings';
import ClockIn from '../../components/attendance/ClockIn';
import ClockOut from '../../components/attendance/ClockOut';
// Placeholder CRM components - will be implemented
import WorkReportsManager from '../../components/admin/WorkReportsManager';
import LeaveRequestsManager from '../../components/admin/LeaveRequestsManager';
import ComplaintsManager from '../../components/admin/ComplaintsManager';
import EmailMarketingManager from '../../components/admin/EmailMarketingManager';
import CampaignEditor from '../../components/admin/CampaignEditor';
import CampaignSender from '../../components/admin/CampaignSender';
import EmailAnalytics from '../../components/admin/EmailAnalytics';

import ProtectedRoute from '../../components/ProtectedRoute';
import PrivilegeManager from '../../components/admin/PrivilegeManager';
import Chat from '../../pages/Chat';


const AppRoutes = () => {
    return (
        <Routes>
            {/* PUBLIC PAGES (Navbar + Footer) */}
            <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/wp-admin" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/jobs/:id" element={<JobDetail />} /> {/* New route */}
                <Route path="/categories" element={<AllCategories />} /> {/* New route */}
                <Route path="/categories/:categoryName" element={<CategoryJobs />} /> {/* New route */}
                <Route path="/jobs" element={<Jobs />} />
            </Route>

            {/* ADMIN PAGES */}
            <Route element={
                <ProtectedRoute allowedRoles={['super_admin', 'company_admin', 'staff', 'recruiter']}>
                    <AdminLayout />
                </ProtectedRoute>
            }>
                <Route path="/dashboard" element={<AdminDashboard />} />
                <Route path="/dashboard/users" element={<UserManager />} />
                <Route path="/dashboard/users/:uid" element={<PrivilegeManager />} />
                <Route path="/dashboard/create-user" element={<AdminCreateUser />} />
                <Route path="/dashboard/categories" element={<CategoryManager />} />
                <Route path="/dashboard/posts" element={<JobManager />} />
                <Route path="/dashboard/posts/new" element={<JobEditor />} />
                <Route path="/dashboard/posts/edit/:id" element={<JobEditor />} />
                <Route path="/dashboard/applications" element={<ApplicationsManager />} />
                <Route path="/dashboard/branches" element={<BranchManager />} />
                <Route path="/dashboard/attendance" element={<AttendanceManager />} />
                <Route path="/dashboard/clock-in" element={<ClockIn />} />
                <Route path="/dashboard/clock-out" element={<ClockOut />} />
                <Route path="/dashboard/attendance-settings" element={<AttendanceSettings />} />
                <Route path="/dashboard/work-reports" element={<WorkReportsManager />} />
                <Route path="/dashboard/leave-requests" element={<LeaveRequestsManager />} />
                <Route path="/dashboard/complaints" element={<ComplaintsManager />} />
                <Route path="/dashboard/email-marketing" element={<EmailMarketingManager />} />
                <Route path="/dashboard/email-marketing/new" element={<CampaignEditor />} />
                <Route path="/dashboard/email-marketing/edit/:id" element={<CampaignEditor />} />
                <Route path="/dashboard/email-marketing/send/:id" element={<CampaignSender />} />
                <Route path="/dashboard/email-marketing/analytics/:id" element={<EmailAnalytics />} />

                <Route path="/dashboard/chat" element={<Chat />} />
                <Route path="/dashboard/settings" element={<Settings />} />

            </Route>
        </Routes>
    );
};

export default AppRoutes;
