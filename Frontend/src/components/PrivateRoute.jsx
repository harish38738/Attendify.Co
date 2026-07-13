import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

const PrivateRoute = ({ children, allowedRoles = ['admin', 'super_admin', 'student'] }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen fullScreen text="Checking authentication..." />;


  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  // Enforce password change for students
  if (user.role === 'student' && user.must_change_password) {
    return <Navigate to="/force-change-password" replace />;
  }

  return children;
};

export default PrivateRoute;
