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
import StudentResources from './pages/StudentResources';
import StudentProfile from './pages/StudentProfile';
import StudentNotifications from './pages/StudentNotifications';
import JoinClass from './pages/JoinClass';
import AuthCallback from './pages/AuthCallback';
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
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/join/:joinCode" element={<JoinClass />} />

      {/* Admin Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="classes" element={<Classes />} />
        <Route path="students" element={<Students />} />
        <Route path="attendance" element={<AttendanceMarking />} />
        <Route path="reports" element={<AttendanceReport />} />
        <Route path="admins" element={<AdminManagement />} />
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
        <Route path="profile" element={<StudentProfile />} />
        <Route path="notifications" element={<StudentNotifications />} />
      </Route>

      <Route path="*" element={<RoleBasedRedirect />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
