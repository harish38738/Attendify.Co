import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import LoadingScreen from '../components/LoadingScreen';
import { AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';

const JoinClass = () => {
  const { joinCode } = useParams();
  const navigate = useNavigate();

  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', roll_number: '', password: '', confirm_password: '' });

  const fetchClassInfo = useCallback(async () => {
    try {
      const response = await api.get(`/api/classes/join-info/${joinCode}`);
      if (response.data.success) {
        setClassInfo(response.data.data);
      } else {
        setError('Invalid or expired join link');
      }
    } catch (error) {
      setError('Failed to load class information');
    } finally {
      setLoading(false);
    }
  }, [joinCode]);

  useEffect(() => {
    fetchClassInfo();
  }, [fetchClassInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const name = formData.name.trim().replace(/\s+/g, ' ');
    const rollNumber = formData.roll_number.trim();
    const password = formData.password;
    const confirmPassword = formData.confirm_password;

    setError('');
    if (name.length < 2 || name.length > 80) {
      setError('Full name must be 2 to 80 characters.');
      return;
    }
    if (!/^[a-zA-Z .'-]+$/.test(name)) {
      setError('Full name can include letters, spaces, apostrophes, periods, and hyphens.');
      return;
    }
    if (rollNumber.length < 2 || rollNumber.length > 32) {
      setError('Roll number must be 2 to 32 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(rollNumber)) {
      setError('Roll number can include letters, numbers, dots, dashes, underscores, and slashes.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6 || password.length > 128) {
      setError('Password must be 6 to 128 characters long');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/classes/join', {
        join_code: joinCode,
        name,
        roll_number: rollNumber,
        password,
      });
      if (response.data.success) {
        setSuccess(true);
        toast.success('Successfully joined the class!');
      } else {
        setError(response.data.message || 'Failed to join class');
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to join class');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen fullScreen text="Loading class info..." />;
  }

  if (error && !classInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/login')} className="bg-blue-900 hover:bg-blue-800 text-white">Go to Login</Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Successfully Joined!</h2>
          <p className="text-slate-600 mb-2">You have been added to <strong>{classInfo.class_name}</strong></p>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 mt-4">
            <p className="text-sm font-medium text-blue-900 mb-2">How to Login:</p>
            <p className="text-sm text-blue-700">Use your roll number <strong>{formData.roll_number.toUpperCase()}</strong> and password to log in on the Student tab.</p>
          </div>
          <Button onClick={() => navigate('/login')} className="w-full bg-blue-900 hover:bg-blue-800 text-white" data-testid="go-to-login-button">
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src={`${process.env.PUBLIC_URL}/attendify-logo.png`}
                alt="Attendify logo"
                className="h-20 w-20 object-contain drop-shadow-md"
              />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 font-heading tracking-tight">Join Class</h1>
            <p className="mt-2 text-slate-600">Attendify by HRK Technologies</p>
          </div>

          {classInfo && (
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">You're joining</p>
                  <p className="text-lg font-bold text-blue-900">{classInfo.class_name}</p>
                  <p className="text-xs text-blue-700">Code: {classInfo.class_code}</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="join-class-form">
              <div>
                <Label htmlFor="name" className="text-slate-700 font-medium">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 80) })}
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  data-testid="join-name-input"
                  className="mt-2 h-11 bg-white border-slate-200 placeholder:text-slate-400"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="roll_number" className="text-slate-700 font-medium">Roll Number</Label>
                <Input
                  id="roll_number"
                  type="text"
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value.slice(0, 32) })}
                  required
                  minLength={2}
                  maxLength={32}
                  autoComplete="username"
                  data-testid="join-roll-input"
                  className="mt-2 h-11 bg-white border-slate-200 placeholder:text-slate-400"
                  placeholder="Enter your roll number"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value.slice(0, 128) })}
                  required
                  minLength={6}
                  maxLength={128}
                  autoComplete="new-password"
                  data-testid="join-password-input"
                  className="mt-2 h-11 bg-white border-slate-200 placeholder:text-slate-400"
                  placeholder="Enter a password (min 6 characters)"
                />
              </div>
              <div>
                <Label htmlFor="confirm_password" className="text-slate-700 font-medium">Confirm Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value.slice(0, 128) })}
                  required
                  minLength={6}
                  maxLength={128}
                  autoComplete="new-password"
                  data-testid="join-confirm-password-input"
                  className="mt-2 h-11 bg-white border-slate-200 placeholder:text-slate-400"
                  placeholder="Confirm your password"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700" data-testid="join-error-message">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button type="submit" disabled={submitting || !formData.name.trim() || !formData.roll_number.trim() || !formData.password || !formData.confirm_password} data-testid="join-submit-button" className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                {submitting ? 'Joining...' : 'Join Class'}
              </Button>
            </form>
          </Card>

          <div className="text-center">
            <p className="text-sm text-slate-600">
              Already registered?{' '}
              <button onClick={() => navigate('/login')} className="text-blue-600 hover:text-blue-700 font-medium">Login here</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinClass;
