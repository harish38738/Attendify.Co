import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import OnboardingExperience from '../components/OnboardingExperience';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Eye, Mail, RotateCcw, Settings2, ShieldCheck, Users, Trash2, UserPlus, Crown, Lock, LogOut, MessageSquare, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

const OWNER_EMAIL = "harishragavkumars@gmail.com";

const AdminProfile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'super_admin';
  const [profile, setProfile] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [onboardingSettings, setOnboardingSettings] = useState({
    enableOnboarding: true,
    onboardingMode: 'first_login_only',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [resettingOnboarding, setResettingOnboarding] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/admin/profile');
      setProfile(response.data.data.profile);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Unable to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const res = await api.get('/api/auth/approved-admins');
      if (res.data.success) {
        setAdmins(res.data.data.emails || []);
      }
    } catch (e) {
      toast.error('Failed to load admins list');
    } finally {
      setAdminsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAdmins();
    if (isSuperAdmin) {
      fetchOnboardingSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOnboardingSettings = async () => {
    try {
      const res = await api.get('/api/settings/onboarding');
      if (res.data.success) {
        setOnboardingSettings({
          enableOnboarding: res.data.data.enableOnboarding !== false,
          onboardingMode: res.data.data.onboardingMode || 'first_login_only',
        });
      }
    } catch (e) {
      toast.error('Failed to load onboarding settings');
    }
  };

  const saveOnboardingSettings = async (nextSettings) => {
    setOnboardingSettings(nextSettings);
    setSettingsSaving(true);
    try {
      const res = await api.put('/api/settings/onboarding', nextSettings);
      if (res.data.success) {
        toast.success('Onboarding settings updated');
      } else {
        toast.error(res.data.message || 'Unable to update onboarding settings');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Unable to update onboarding settings');
      fetchOnboardingSettings();
    } finally {
      setSettingsSaving(false);
    }
  };

  const resetStudentOnboarding = async () => {
    setResettingOnboarding(true);
    try {
      const res = await api.post('/api/settings/onboarding/reset-students');
      if (res.data.success) {
        toast.success(`Onboarding reset for ${res.data.data?.matched || 0} student account(s)`);
      } else {
        toast.error(res.data.message || 'Unable to reset onboarding');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Unable to reset onboarding');
    } finally {
      setResettingOnboarding(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setAdding(true);
    try {
      const res = await api.post('/api/auth/approved-admins', { email });
      if (res.data.success) {
        toast.success(res.data.message || `${email} successfully approved`);
        setNewEmail('');
        fetchAdmins();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add admin');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await api.delete(`/api/auth/approved-admins/${encodeURIComponent(removeTarget)}`);
      if (res.data.success) {
        toast.success(res.data.message || `${removeTarget} successfully removed`);
        fetchAdmins();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove admin');
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full" data-testid="admin-profile-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Admin Profile</h1>
        <p className="mt-2 text-sm text-slate-600">Your admin account credentials and management settings.</p>
      </div>

      {(loading || !profile) ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900"></div>
        </div>
      ) : (
        <div className="grid gap-4 min-[860px]:grid-cols-[minmax(280px,1fr)_1.5fr] md:gap-6 max-w-7xl mx-auto">
          {/* Left Column: Admin Profile Card */}
          <div className="space-y-6">
            <Card className="p-6 bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center">
              {/* Automatic Alphabet Avatar */}
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-900 text-white font-bold text-3xl mb-4 shadow-sm">
                {profile.name ? profile.name.charAt(0).toUpperCase() : (profile.email ? profile.email.charAt(0).toUpperCase() : 'A')}
              </div>
              
              <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
              <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${profile.email === OWNER_EMAIL ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {profile.email === OWNER_EMAIL ? <Crown className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {profile.email === OWNER_EMAIL ? 'Owner' : 'Admin'}
              </span>

              <div className="w-full space-y-4 mt-6 border-t border-slate-100 pt-6">
              <div className="flex items-start gap-3 text-left">
                <Mail className="mt-0.5 h-5 w-5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">Email Address</p>
                  <p className="break-all font-medium text-slate-900 text-sm mt-0.5">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-left">
                <Users className="mt-0.5 h-5 w-5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">Managed Classes</p>
                  <p className="font-semibold text-slate-900 text-sm mt-0.5">{profile?.managed_classes?.length || 0}</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="mt-8 border-rose-200 text-rose-600 hover:bg-rose-50 w-full flex items-center justify-center gap-2"
              data-testid="profile-logout-button"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
            {isSuperAdmin ? (
              <Button
                onClick={() => navigate('/reports')}
                className="mt-3 bg-blue-900 hover:bg-blue-800 text-white w-full flex items-center justify-center gap-2"
                data-testid="profile-reports-button"
              >
                <ClipboardList className="h-4 w-4" />
                Reports
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/report-issue')}
                variant="outline"
                className="mt-3 border-slate-200 text-slate-700 hover:bg-slate-50 w-full flex items-center justify-center gap-2"
                data-testid="profile-report-issue-button"
              >
                <MessageSquare className="h-4 w-4" />
                Report Issue
              </Button>
            )}
          </Card>
        </div>

        {/* Right Column: Manage Admins */}
        <div className="space-y-6">
          {isSuperAdmin && (
            <Card className="bg-white border border-slate-200 shadow-sm p-6" data-testid="system-settings">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-slate-950 rounded-lg">
                    <Settings2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 font-heading">System Settings</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Manage product-wide student experience controls.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewOpen(true)}
                  className="h-10 gap-2"
                  data-testid="preview-onboarding-button"
                >
                  <Eye className="h-4 w-4" />
                  Preview Onboarding
                </Button>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-900">Onboarding</h3>
                  <p className="mt-1 text-sm text-slate-500">Control how students enter Attendify after login.</p>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                    <div>
                      <Label htmlFor="enable-onboarding" className="text-sm font-semibold text-slate-900">
                        Enable Onboarding
                      </Label>
                      <p className="mt-1 text-xs text-slate-500">
                        When off, students move directly from login to dashboard.
                      </p>
                    </div>
                    <Switch
                      id="enable-onboarding"
                      checked={onboardingSettings.enableOnboarding}
                      disabled={settingsSaving}
                      onCheckedChange={(checked) => saveOnboardingSettings({
                        ...onboardingSettings,
                        enableOnboarding: checked,
                      })}
                      data-testid="enable-onboarding-switch"
                    />
                  </div>

                  <div className="rounded-lg border border-slate-200 px-4 py-4">
                    <Label className="text-sm font-semibold text-slate-900">Display Mode</Label>
                    <RadioGroup
                      value={onboardingSettings.onboardingMode}
                      onValueChange={(value) => saveOnboardingSettings({
                        ...onboardingSettings,
                        onboardingMode: value,
                      })}
                      className="mt-3 gap-3"
                      disabled={settingsSaving || !onboardingSettings.enableOnboarding}
                      data-testid="onboarding-mode-radio"
                    >
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50">
                        <RadioGroupItem value="first_login_only" className="mt-1" />
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">First Login Only</span>
                          <span className="block text-xs text-slate-500">Default. Students see it once, then continue directly to dashboard.</span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50">
                        <RadioGroupItem value="every_login" className="mt-1" />
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">Every Login</span>
                          <span className="block text-xs text-slate-500">Show onboarding after every student login.</span>
                        </span>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-amber-950">Development reset</p>
                      <p className="mt-1 text-xs text-amber-700">
                        Mark all students as not completed so the first-login onboarding appears again.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetStudentOnboarding}
                      disabled={resettingOnboarding}
                      className="h-10 shrink-0 gap-2 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                      data-testid="reset-onboarding-button"
                    >
                      <RotateCcw className={`h-4 w-4 ${resettingOnboarding ? 'animate-spin' : ''}`} />
                      {resettingOnboarding ? 'Resetting...' : 'Reset Onboarding'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-900/10 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-blue-900" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-heading">Manage Admins</h2>
                <p className="text-xs text-slate-500 mt-0.5">Approve Google accounts for admin dashboard access.</p>
              </div>
            </div>

            {/* Add admin form */}
            <form onSubmit={handleAdd} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-6" data-testid="add-admin-form">
              <Label htmlFor="new-admin-email" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Add approved admin email
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="new-admin-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  data-testid="new-admin-email-input"
                  className="bg-white h-10 border-slate-200"
                  required
                />
                <Button
                  type="submit"
                  disabled={adding || !newEmail.trim()}
                  data-testid="add-admin-button"
                  className="bg-blue-900 hover:bg-blue-800 text-white font-medium h-10 px-4 shrink-0 flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {adding ? 'Adding...' : 'Add Admin'}
                </Button>
              </div>
            </form>

            {/* Approved Admins List */}
            <div className="border border-slate-100 rounded-xl overflow-hidden" data-testid="admin-list">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Approved Admins list ({admins.length})</h3>
              </div>
              {adminsLoading ? (
                <div className="p-8 text-center text-sm text-slate-500" data-testid="admin-list-loading">Loading...</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {admins.map((a) => {
                    const isSelf = a.email === user?.email;
                    const isOwnerAccount = a.email === OWNER_EMAIL;
                    return (
                      <li key={a.email} className="flex items-center justify-between p-4" data-testid={`admin-row-${a.email}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 font-bold text-xs ${isOwnerAccount ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {a.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {a.email}
                              {isSelf && <span className="text-slate-400 font-normal"> (you)</span>}
                            </p>
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold mt-0.5 ${isOwnerAccount ? 'text-amber-700' : 'text-slate-500'}`}>
                              {isOwnerAccount ? <Crown className="h-2.5 w-2.5" /> : <ShieldCheck className="h-2.5 w-2.5" />}
                              {isOwnerAccount ? 'Owner' : 'Admin'}
                            </span>
                          </div>
                        </div>

                        {isOwnerAccount ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded border border-slate-100" data-testid={`admin-protected-${a.email}`}>
                            <Lock className="h-3 w-3" /> Protected
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemoveTarget(a.email)}
                            data-testid={`remove-admin-${a.email}`}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0 shrink-0"
                            title="Remove admin access"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>

      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent data-testid="remove-admin-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-slate-900">{removeTarget}</span> will lose all administrative rights and will no longer be able to sign in to the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="remove-admin-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              data-testid="remove-admin-confirm"
              className="bg-rose-600 hover:bg-rose-700"
            >
              {removing ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {previewOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950" data-testid="onboarding-preview-modal">
          <OnboardingExperience
            preview
            onComplete={() => setPreviewOpen(false)}
            onSkip={() => setPreviewOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
