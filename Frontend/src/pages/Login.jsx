import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { AlertCircle, Eye, User, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import SegmentedControl from '../components/SegmentedControl';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const Login = () => {
  const [activeTab, setActiveTab] = useState('admin');

  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  const [adminError, setAdminError] = useState('');

  const { studentLogin, adminGoogleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    setAdminError('');
    try {
      const response = await adminGoogleLogin(credentialResponse.credential);
      if (response.success) {
        toast.success('Admin login successful!');
        navigate('/dashboard');
      }
    } catch (err) {
      setAdminError(err.message || 'Access Denied');
      toast.error('Admin login failed');
    }
  };

  const handleGoogleError = () => {
    setAdminError('Google Sign-In was unsuccessful. Try again.');
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (studentLoading) return;

    const rollNumber = studentRollNumber.trim();
    const password = studentPassword;

    setStudentError('');
    if (!rollNumber || !password) {
      setStudentError('Enter your roll number and password.');
      return;
    }
    if (rollNumber.length < 2 || rollNumber.length > 32) {
      setStudentError('Roll number must be 2 to 32 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(rollNumber)) {
      setStudentError('Roll number can include letters, numbers, dots, dashes, underscores, and slashes.');
      return;
    }

    setStudentLoading(true);
    try {
      const response = await studentLogin(rollNumber, password);
      if (response.success) {
        toast.success('Login successful!');
        navigate('/student/dashboard');
      }
    } catch (err) {
      setStudentError(err.response?.data?.detail || err.message || 'Roll number not found');
      toast.error('Login failed');
    } finally {
      setStudentLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src={`${process.env.PUBLIC_URL}/attendify-logo.png`}
                alt="Attendify logo"
                className="h-16 w-16 object-contain"
              />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 font-heading tracking-tight">
              Attendify
            </h1>
            <p className="mt-2 text-slate-600 font-body">Your Smart Academic Companion</p>
            <p className="mt-1 text-xs text-slate-500">by HRK Technologies</p>
          </div>

          <div className="w-full">
            <SegmentedControl
              value={activeTab}
              onChange={setActiveTab}
              aria-label="Login type"
              className="mb-6"
              options={[
                { value: 'admin', label: 'Admin', icon: Shield, testId: 'admin-tab' },
                { value: 'student', label: 'Student', icon: User, testId: 'student-tab' },
              ]}
            />

            {/* Admin Login Tab */}
            {activeTab === 'admin' && (
              <div className="space-y-6" data-testid="admin-login-section">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-6">
                    Sign in with your authorized Google account to access the admin dashboard.
                  </p>
                </div>

                <div className="flex justify-center">
                  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                    <div className="w-full max-w-[340px]">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        useOneTap
                        theme="outline"
                        size="large"
                        width="340"
                      />
                    </div>
                  </GoogleOAuthProvider>
                </div>

                {adminError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{adminError}</span>
                  </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-xs font-medium text-blue-900 mb-1">Admin Access:</p>
                  <p className="text-xs text-blue-700">
                    Only pre-approved email addresses can access the admin panel. Contact your institution administrator if you need access.
                  </p>
                </div>
              </div>
            )}

            {/* Student Login Tab */}
            {activeTab === 'student' && (
              <form onSubmit={handleStudentSubmit} className="space-y-5" data-testid="student-login-form">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="student-roll" className="text-sm font-semibold text-slate-700">
                      Roll Number
                    </Label>
                    <Input
                      id="student-roll"
                      type="text"
                      value={studentRollNumber}
                      onChange={(e) => setStudentRollNumber(e.target.value.slice(0, 32))}
                      required
                      minLength={2}
                      maxLength={32}
                      autoComplete="username"
                      inputMode="text"
                      data-testid="student-roll-input"
                      className="mt-2 h-12 rounded-lg bg-white border-slate-200 px-3.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 placeholder:text-slate-400"
                      placeholder="Enter your roll number (e.g., 21CS001)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-password" className="text-sm font-semibold text-slate-700">
                      Password
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="student-password"
                        type={showStudentPassword ? 'text' : 'password'}
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value.slice(0, 128))}
                        required
                        maxLength={128}
                        autoComplete="current-password"
                        data-testid="student-password-input"
                        className="h-12 rounded-lg bg-white border-slate-200 px-3.5 pr-12 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 placeholder:text-slate-400"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowStudentPassword((value) => !value)}
                        className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Default password is your roll number.
                    </p>
                  </div>
                </div>

                {studentError && (
                  <div
                    className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700"
                    data-testid="student-error-message"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{studentError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={studentLoading || !studentRollNumber.trim() || !studentPassword}
                  data-testid="student-submit-button"
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 active:scale-95"
                >
                  {studentLoading ? 'Signing in...' : 'Sign in as student'}
                </Button>

                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-emerald-900 mb-1">How to get access:</p>
                  <p className="text-xs text-emerald-700">
                    Ask your class admin for the join link, or use a roll number already registered.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Hero Image */}
      <div
        className="hidden lg:flex flex-1 bg-cover bg-center relative"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1741699427799-3fbb70fce948?crop=entropy&cs=srgb&fm=jpg&q=85)',
        }}
      >
        <div className="absolute inset-0 bg-slate-900/40" />
        <div className="relative z-10 flex items-center justify-center p-12">
          <div className="text-center text-white max-w-lg">
            <h2 className="text-5xl font-bold font-heading tracking-tight mb-4">
              Streamline Your Attendance
            </h2>
            <p className="text-xl text-slate-200 font-body">
              Efficient tracking and reporting for educational institutions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
