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
    // Skip /me check if URL hash contains session_id (Google Auth redirect)
    if (window.location.hash && window.location.hash.includes('session_id')) {
      setLoading(false);
      return;
    }
    console.log('[Auth] document.cookie before auth/me', document.cookie);
    try {
      const response = await api.get('/api/auth/me');
      console.log('[Auth] auth/me response', response);
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.log('[Auth] auth/me error', error.response ? error.response.data : error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const studentLogin = async (roll_number) => {
    console.log('[Auth] document.cookie before student-login', document.cookie);
    const response = await api.post('/api/auth/student-login', { roll_number });
    console.log('[Auth] student-login response', response);
    if (response.data.success) {
      setUser(response.data.data);
      return response.data;
    }
    throw new Error(response.data.message || 'Login failed');
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
    <AuthContext.Provider value={{ user, setUser, loading, studentLogin, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
