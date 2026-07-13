import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Bell, CheckCircle2 } from 'lucide-react';

const StudentNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/student/notifications');
      if (res.data.success) {
        setNotifications(res.data.data.notifications || []);
      } else {
        setError(res.data.message || 'Unable to load notifications');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-4 md:p-8" data-testid="student-notifications-page">
      <div className="mb-6 md:mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Notifications</h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">Stay updated with attendance changes and class alerts.</p>
        </div>
        <Button onClick={fetchNotifications} variant="outline" size="sm">
          <Bell className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900"></div>
        </div>
      ) : error ? (
        <Card className="p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
          <p className="text-sm text-rose-600">{error}</p>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="p-10 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
          <CheckCircle2 className="h-14 w-14 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">No notifications yet</h2>
          <p className="text-sm text-slate-500">You will receive updates here when your attendance changes.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((note) => (
            <Card
              key={note.id}
              className={`p-4 border ${note.read ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-white'} shadow-sm`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{note.message}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${note.read ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700'}`}>
                    {note.read ? 'Read' : 'New'}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{formatDate(note.created_at)}</span>
                {note.link && (
                  <a href={note.link} className="font-medium text-blue-600 hover:text-blue-800">
                    View details
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentNotifications;
