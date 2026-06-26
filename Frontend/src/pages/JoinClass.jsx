import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { GraduationCap, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';

const JoinClass = () => {
  const { joinCode } = useParams();
  const navigate = useNavigate();

  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ name: '', roll_number: '' });

  useEffect(() => {
    fetchClassInfo();
  }, [joinCode]);

  const fetchClassInfo = async () => {
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/api/classes/join', {
        join_code: joinCode,
        name: formData.name,
        roll_number: formData.roll_number,
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
      </div>
    );
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
            <p className="text-sm text-blue-700">Use your roll number <strong>{formData.roll_number.toUpperCase()}</strong> on the Student login tab.</p>
            <p className="text-xs text-blue-600 mt-2">No password needed!</p>
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
              <div className="flex items-center justify-center w-16 h-16 bg-blue-900 rounded-lg">
                <GraduationCap className="h-10 w-10 text-white" />
              </div>
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
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
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  required
                  data-testid="join-roll-input"
                  className="mt-2 h-11 bg-white border-slate-200 placeholder:text-slate-400"
                  placeholder="Enter your roll number"
                />
                <p className="text-xs text-slate-500 mt-1">This will be your login credential (no password needed)</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700" data-testid="join-error-message">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button type="submit" disabled={submitting} data-testid="join-submit-button" className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
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
