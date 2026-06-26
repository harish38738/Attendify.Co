import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { GraduationCap, AlertCircle, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const GOOGLE_AUTH_URL = 'https://auth.emergentagent.com/';

const Login = () => {
  const [activeTab, setActiveTab] = useState('admin');

  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  const { studentLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `${GOOGLE_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setStudentError('');
    setStudentLoading(true);
    try {
      const response = await studentLogin(studentRollNumber);
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
              <div className="flex items-center justify-center w-16 h-16 bg-blue-900 rounded-lg">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 font-heading tracking-tight">
              Attendify
            </h1>
            <p className="mt-2 text-slate-600 font-body">Attendance Management System</p>
            <p className="mt-1 text-xs text-slate-500">by HRK Technologies</p>
          </div>

          {/* Login Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger
                value="admin"
                data-testid="admin-tab"
                className="flex items-center gap-2 data-[state=active]:bg-blue-900 data-[state=active]:text-white rounded-md transition-all font-medium text-slate-700"
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </TabsTrigger>
              <TabsTrigger
                value="student"
                data-testid="student-tab"
                className="flex items-center gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md transition-all font-medium text-slate-700"
              >
                <User className="h-4 w-4" />
                <span>Student</span>
              </TabsTrigger>
            </TabsList>

            {/* Admin Login Tab — Google Auth */}
            <TabsContent value="admin">
              <div className="space-y-6" data-testid="admin-login-section">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-6">
                    Sign in with your authorized Google account to access the admin dashboard.
                  </p>
                </div>

                <Button
                  onClick={handleGoogleLogin}
                  data-testid="google-login-button"
                  className="w-full h-12 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-300 shadow-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </Button>

                <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-xs font-medium text-blue-900 mb-1">Admin Access:</p>
                  <p className="text-xs text-blue-700">
                    Only pre-approved email addresses can access the admin panel. Contact your institution administrator if you need access.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Student Login Tab */}
            <TabsContent value="student">
              <form onSubmit={handleStudentSubmit} className="space-y-6" data-testid="student-login-form">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="student-roll" className="text-slate-700 font-medium">
                      Roll Number
                    </Label>
                    <Input
                      id="student-roll"
                      type="text"
                      value={studentRollNumber}
                      onChange={(e) => setStudentRollNumber(e.target.value)}
                      required
                      data-testid="student-roll-input"
                      className="mt-2 h-11 bg-white border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 placeholder:text-slate-400"
                      placeholder="Enter your roll number (e.g., 21CS001)"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Login with your roll number only. No password needed.
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
                  disabled={studentLoading}
                  data-testid="student-submit-button"
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md transition-all duration-200 active:scale-95"
                >
                  {studentLoading ? 'Signing in...' : 'Sign In as Student'}
                </Button>

                <div className="mt-4 p-4 bg-emerald-50 rounded-md border border-emerald-200">
                  <p className="text-xs font-medium text-emerald-900 mb-1">How to get access:</p>
                  <p className="text-xs text-emerald-700">
                    Ask your class admin for the join link, or use a roll number already registered.
                  </p>
                </div>
              </form>
            </TabsContent>
          </Tabs>
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
