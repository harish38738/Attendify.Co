import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { KeyRound, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const ForceChangePassword = () => {
  const { changeStudentPassword, user, checkAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If user is not logged in or doesn't need to change password, redirect them
  if (!user || user.role !== 'student' || !user.must_change_password) {
    navigate('/student/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (passwordData.new !== passwordData.confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (passwordData.new.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (passwordData.new === passwordData.current) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);
    try {
      await changeStudentPassword(passwordData.current, passwordData.new);
      toast.success("Password updated successfully!");
      await checkAuth(); // Refresh user state to clear must_change_password flag
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.message || "Failed to update password. Check your current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl rounded-xl">
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full">
            <KeyRound className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Update Required</h2>
        <p className="text-center text-slate-600 mb-6">
          For your security, please change your default password before accessing Attendify.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password (Roll Number)</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={passwordData.current}
              onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value.slice(0, 128) })}
              required
              maxLength={128}
              autoComplete="current-password"
              placeholder="Enter your current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={passwordData.new}
              onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value.slice(0, 128) })}
              required
              minLength={6}
              maxLength={128}
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={passwordData.confirm}
              onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value.slice(0, 128) })}
              required
              minLength={6}
              maxLength={128}
              autoComplete="new-password"
              placeholder="Confirm new password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-11"
              disabled={loading || !passwordData.current || !passwordData.new || !passwordData.confirm}
            >
              {loading ? 'Updating...' : 'Update Password & Continue'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-slate-600"
              onClick={logout}
              disabled={loading}
            >
              Cancel & Logout
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ForceChangePassword;
