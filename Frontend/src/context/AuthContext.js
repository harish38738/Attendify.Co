import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // Skip /me check if URL hash contains auth_token (Google Auth redirect)
    if (window.location.hash && window.location.hash.includes('auth_token')) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('/api/auth/me');
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const adminGoogleLogin = async (credential) => {
    const response = await api.post('/api/auth/google-admin', { credential });

    if (response.data.success) {
      await checkAuth();
      return response.data;
    }

    throw new Error(response.data.message || 'Admin login failed');
  };

  const studentLogin = async (roll_number, password) => {
    const response = await api.post('/api/auth/student-login', { roll_number, password });
    if (response.data.success) {
      setUser(response.data.data);
      return response.data;
    }
    throw new Error(response.data.message || 'Login failed');
  };

  const changeStudentPassword = async (current_password, new_password) => {
    const response = await api.post('/api/auth/student-change-password', {
      current_password,
      new_password,
    });
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || 'Failed to change password');
  };

  const completeOnboarding = async () => {
    const response = await api.post('/api/student/onboarding-complete');
    if (response.data.success) {
      setUser((current) => current ? { ...current, hasCompletedOnboarding: true } : current);
      return response.data;
    }
    throw new Error(response.data.message || 'Failed to complete onboarding');
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      // ignore
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, studentLogin, adminGoogleLogin, logout, checkAuth, changeStudentPassword, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};
