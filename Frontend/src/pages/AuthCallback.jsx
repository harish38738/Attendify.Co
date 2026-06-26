import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { GraduationCap, Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  // CRITICAL: The Emergent session_id is single-use. Under React.StrictMode the
  // effect fires twice; without this synchronous guard the second run would
  // re-consume the session_id (→ 401) or read the cleared hash (→ login loop),
  // causing intermittent "Not Approved" / dashboard / login-loop behavior.
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', '?'));
      const sessionId = params.get('session_id');

      // Clear hash from URL immediately (we've already captured the session_id)
      window.history.replaceState(null, '', window.location.pathname);

      if (!sessionId) {
        setError('No session found. Please try again.');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
        return;
      }

      try {
        const response = await api.post('/api/auth/google-session', {
          session_id: sessionId,
        });

        if (response.data.success) {
          setUser(response.data.data);
          navigate('/dashboard', { replace: true });
        } else {
          setError(response.data.message || 'Access denied');
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Authentication failed');
      }
    };

    processAuth();
  }, [navigate, setUser]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-rose-600 rounded-lg">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-sm text-slate-400 max-w-sm">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-lg">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
        <p className="text-sm text-slate-400">Verifying your Google account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
