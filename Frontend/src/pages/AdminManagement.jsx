import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { ShieldCheck, Trash2, UserPlus, Crown, Lock } from 'lucide-react';
import { toast } from 'sonner';

const AdminManagement = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [classes, setClasses] = useState([]);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementClassId, setAnnouncementClassId] = useState('');
  const [publishing, setPublishing] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/approved-admins');
      if (res.data.success) {
        setAdmins(res.data.data.emails || []);
        setOwnerEmail(res.data.data.owner_email || '');
      }
    } catch (e) {
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const res = await api.get('/api/classes');
      if (res.data.success) {
        setClasses(res.data.data.classes || []);
        setAnnouncementClassId((curr) => {
          if (res.data.data.classes?.length > 0 && !curr) {
            return res.data.data.classes[0].id;
          }
          return curr;
        });
      }
    } catch (e) {
      toast.error('Failed to load classes');
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
    fetchClasses();
  }, [fetchAdmins, fetchClasses]);

  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    const title = announcementTitle.trim();
    const message = announcementMessage.trim();
    if (!title || !message || !announcementClassId) {
      toast.error('Please provide a class, title, and message');
      return;
    }

    setPublishing(true);
    try {
      const res = await api.post('/api/announcements', {
        class_id: announcementClassId,
        title,
        message,
      });
      if (res.data.success) {
        toast.success('Announcement published');
        setAnnouncementTitle('');
        setAnnouncementMessage('');
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to publish announcement');
    } finally {
      setPublishing(false);
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
        toast.success(res.data.message);
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
        toast.success(res.data.message);
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
    <div className="p-6 md:p-10 max-w-3xl mx-auto" data-testid="admin-management-page">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 bg-blue-900 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">Admin Management</h1>
            <p className="text-sm text-slate-500">Control who can access the admin dashboard.</p>
          </div>
        </div>
      </div>

      {/* Add admin */}
      <form
        onSubmit={handleAdd}
        className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm"
        data-testid="add-admin-form"
      >
        <Label htmlFor="new-admin-email" className="text-slate-700 font-medium">
          Add admin email
        </Label>
        <p className="text-xs text-slate-500 mt-1 mb-3">
          Add a Class Representative's Google email to grant admin access.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            id="new-admin-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="cr.email@gmail.com"
            data-testid="new-admin-email-input"
            className="h-11"
          />
          <Button
            type="submit"
            disabled={adding || !newEmail.trim()}
            data-testid="add-admin-button"
            className="h-11 bg-blue-900 hover:bg-blue-800 text-white font-medium px-6 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {adding ? 'Adding...' : 'Add Admin'}
          </Button>
        </div>
      </form>

      {/* Announcement creator */}
      <form
        onSubmit={handlePublishAnnouncement}
        className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm"
        data-testid="announcement-form"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-11 h-11 bg-slate-100 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-slate-700" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Announcements</h2>
            <p className="text-sm text-slate-500">Publish class-wide announcements and notify all students.</p>
          </div>
        </div>

        <div className="grid gap-4 min-[640px]:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="announcement-class" className="text-slate-700 font-medium">
              Choose class
            </Label>
            <select
              id="announcement-class"
              value={announcementClassId}
              onChange={(e) => setAnnouncementClassId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
              disabled={classesLoading}
              data-testid="announcement-class-select"
            >
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))
              ) : (
                <option value="">No classes available</option>
              )}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-title" className="text-slate-700 font-medium">
              Announcement title
            </Label>
            <Input
              id="announcement-title"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="Enter announcement title"
              className="h-11"
              data-testid="announcement-title-input"
            />
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <Label htmlFor="announcement-message" className="text-slate-700 font-medium">
            Message
          </Label>
          <textarea
            id="announcement-message"
            value={announcementMessage}
            onChange={(e) => setAnnouncementMessage(e.target.value)}
            placeholder="Write the announcement message here"
            className="w-full min-h-[130px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none"
            data-testid="announcement-message-input"
          />
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-slate-500">
            Target recipients: Entire class. Specific class or student targeting will be added in future releases.
          </div>
          <Button
            type="submit"
            disabled={publishing || classesLoading || classes.length === 0}
            data-testid="publish-announcement-button"
            className="bg-blue-900 hover:bg-blue-800 text-white font-medium h-11 px-6"
          >
            {publishing ? 'Publishing...' : 'Publish Announcement'}
          </Button>
        </div>
      </form>

      {/* Admin list */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden" data-testid="admin-list">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Approved Admins ({admins.length})</h2>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-slate-500" data-testid="admin-list-loading">Loading...</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {admins.map((a) => {
              const isSelf = a.email === user?.email;
              return (
                <li
                  key={a.email}
                  className="flex items-center justify-between px-6 py-4"
                  data-testid={`admin-row-${a.email}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 ${
                        a.is_owner ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {a.is_owner ? <Crown className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {a.email}
                        {isSelf && <span className="text-slate-400 font-normal"> (you)</span>}
                      </p>
                      {a.is_owner && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                          <Crown className="h-3 w-3" /> Owner
                        </span>
                      )}
                    </div>
                  </div>

                  {a.is_owner ? (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium px-3 py-1.5"
                      data-testid={`admin-protected-${a.email}`}
                      title="The owner account is permanently protected"
                    >
                      <Lock className="h-3.5 w-3.5" /> Protected
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => setRemoveTarget(a.email)}
                      data-testid={`remove-admin-${a.email}`}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9 px-3"
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

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent data-testid="remove-admin-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-slate-900">{removeTarget}</span> will lose admin access and will no
              longer be able to sign in to the admin dashboard.
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
    </div>
  );
};

export default AdminManagement;
