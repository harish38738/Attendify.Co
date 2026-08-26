import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import Students from './pages/Students';
import AttendanceMarking from './pages/AttendanceMarking';
import AttendanceReport from './pages/AttendanceReport';
import AdminManagement from './pages/AdminManagement';
import StudentDashboard from './pages/StudentDashboard';
import StudentHistory from './pages/StudentHistory';
import StudentClassmates from './pages/StudentClassmates';
import Resources from './pages/Resources';
import StudentResources from './pages/StudentResources';
import ResourceViewer from './pages/ResourceViewer';
import StudentProfile from './pages/StudentProfile';
import StudentNotifications from './pages/StudentNotifications';
import Timetable from './pages/Timetable';
import Announcements from './pages/Announcements';
import AdminProfile from './pages/AdminProfile';
import JoinClass from './pages/JoinClass';
import ClassTrash from './pages/ClassTrash';

import ForceChangePassword from './pages/ForceChangePassword';
import AcademicUpdates from './pages/AcademicUpdates';
import StudentAcademicUpdates from './pages/StudentAcademicUpdates';
import ClassesAndStudents from './pages/ClassesAndStudents';
import AttendancePage from './pages/AttendancePage';
import UpdatesPage from './pages/UpdatesPage';
import ReportIssue from './pages/ReportIssue';
import Reports from './pages/Reports';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const RoleBasedRedirect = () => {
  const { user } = useAuth();

  if (user?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/join/:joinCode" element={<JoinClass />} />
      <Route path="/force-change-password" element={<ForceChangePassword />} />

      {/* Admin Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute allowedRoles={['admin', 'super_admin']}>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="classes-students" element={<ClassesAndStudents />} />
        <Route path="classes" element={<Classes />} />
        <Route path="admin/trash" element={<ClassTrash />} />
        <Route path="students" element={<Students />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="reports" element={<AdminReportsRoute />} />
        <Route path="admins" element={<AdminManagement />} />
        <Route path="resources" element={<Resources />} />
        <Route path="resources/:resourceId" element={<ResourceViewer audience="admin" />} />
        <Route path="timetable" element={<Timetable />} />
        <Route path="updates" element={<UpdatesPage />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="academic-updates" element={<AcademicUpdates />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="report-issue" element={<ReportIssue />} />
        <Route path="analytics" element={<SuperAdminAnalyticsRoute />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="history" element={<StudentHistory />} />
        <Route path="classmates" element={<StudentClassmates />} />
        <Route path="resources" element={<StudentResources />} />
        <Route path="resources/:resourceId" element={<ResourceViewer audience="student" />} />
        <Route path="academic-updates" element={<StudentAcademicUpdates />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="report-issue" element={<ReportIssue />} />
        <Route path="notifications" element={<StudentNotifications />} />
      </Route>

      <Route path="*" element={<RoleBasedRedirect />} />
    </Routes>
  );
};

const AdminReportsRoute = () => {
  const { user } = useAuth();
  return user?.role === 'super_admin' ? <Reports /> : <AttendanceReport />;
};

const SuperAdminAnalyticsRoute = () => {
  const { user } = useAuth();
  if (user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <AnalyticsDashboard />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
