import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BookOpen, Hash, GraduationCap, Building2, Calendar, LogOut, KeyRound, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useAnalyticsTrack } from '../utils/analytics';

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { logout, changeStudentPassword } = useAuth();
  const navigate = useNavigate();

  useAnalyticsTrack('profile_viewed');

  useEffect(() => {
    api.get('/api/student/profile')
      .then((response) => setProfile(response.data.data.profile))
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-4 md:p-8">
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900"></div>
      </div>
    </div>
  );
  if (!profile) return <div className="p-4 md:p-8"><Card className="p-8 text-center text-rose-600">{error}</Card></div>;

  const getInitial = (name) => {
    if (!name) return 'S';
    return name.charAt(0).toUpperCase();
  };

  const details = [
    { label: 'Roll Number', value: profile.roll_number || 'N/A', icon: Hash },
    { label: 'Class', value: profile.class ? `${profile.class.name} (${profile.class.code})` : 'Not assigned', icon: BookOpen },
    { label: 'Department', value: profile.department || 'Not specified', icon: Building2 },
    { label: 'Semester', value: profile.semester || 'Not specified', icon: GraduationCap },
    { label: 'Academic Year', value: profile.academic_year || 'Not specified', icon: Calendar }
  ];

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    if (passwordData.new.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    setPasswordLoading(true);
    try {
      await changeStudentPassword(passwordData.current, passwordData.new);
      toast.success("Password changed successfully.");
      setIsPasswordModalOpen(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8" data-testid="student-profile-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">My Profile</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">Your academic and account information.</p>
      </div>
      
      <div className="mx-auto max-w-5xl">
        <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-6 md:p-8 text-white">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl font-bold border-4 border-blue-800/30">
                {getInitial(profile.name)}
              </div>
              <div className="mt-2 sm:mt-1">
                <h2 className="text-2xl md:text-3xl font-bold">{profile.name}</h2>
                <p className="text-sm text-blue-100 mt-1">Attendify Student Account</p>
              </div>
            </div>
          </div>
          
          <div className="p-5 md:p-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 font-heading border-b border-slate-100 pb-2">Academic Details</h3>
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Attendance</p>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-3xl font-bold text-blue-900 font-heading">{(profile.attendance_percentage ?? 0).toFixed(2)}%</p>
                <span className="w-fit rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
                  {profile.attendance_status || 'Critical'}
                </span>
              </div>
              {profile.attendance_last_updated && (
                <p className="mt-2 text-xs text-blue-700">Last updated: {new Date(profile.attendance_last_updated).toLocaleString()}</p>
              )}
            </div>
            <div className="grid gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3">
              {details.map(({ label, value, icon: Icon }) => (
                <div key={label} className="h-full rounded-lg bg-slate-50 border border-slate-100 p-4 transition-colors hover:bg-slate-100/50">
                  <div className="flex items-start gap-3.5">
                    <div className="rounded-lg bg-white p-2.5 shadow-sm border border-slate-200/60">
                      <Icon className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-slate-900">{value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-5 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm"
                onClick={() => navigate('/student/report-issue')}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Report Issue
              </Button>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm"
                onClick={() => setIsPasswordModalOpen(true)}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Change Password
              </Button>
              <Button 
                variant="destructive" 
                className="w-full sm:w-auto shadow-sm"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-md p-6 bg-white shadow-xl rounded-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={passwordLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Saving...' : 'Save Password'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
