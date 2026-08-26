import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Users, Activity, TrendingUp, RotateCcw, BarChart2, Calendar, UserCheck } from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'today', label: 'Today' },
];

const EVENT_LABELS = {
  dashboard_viewed: 'Dashboard',
  attendance_history_viewed: 'Attendance History',
  timetable_viewed: 'Timetable',
  resources_viewed: 'Resources',
  resource_opened: 'Resource Opened',
  announcements_viewed: 'Academic Updates',
  classmates_viewed: 'Classmates',
  profile_viewed: 'Profile',
};

const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/api/analytics/dashboard?period=${period}`),
      api.get(`/api/analytics/students?period=${period}`),
    ])
      .then(([overviewRes, studentsRes]) => {
        if (overviewRes.data.success) setOverview(overviewRes.data.data);
        if (studentsRes.data.success) setStudents(studentsRes.data.data);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load analytics');
      })
      .finally(() => setLoading(false));
  }, [period]);

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900 font-heading">{value ?? '—'}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-4 md:p-8" data-testid="analytics-dashboard">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Analytics</h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">Product usage insights — Super Admin only</p>
        </div>
        {/* Period selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === opt.value
                  ? 'bg-blue-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {[{ id: 'overview', label: 'Overview' }, { id: 'students', label: 'Students' }].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium">{error}</p>
        </Card>
      ) : activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Students" value={overview?.total_students} icon={Users} color="bg-blue-50 text-blue-700" />
            <StatCard label="Active Today" value={overview?.active_today} icon={Activity} color="bg-emerald-50 text-emerald-700" />
            <StatCard label={`Active (${PERIOD_OPTIONS.find(p => p.value === period)?.label})`} value={overview?.active_in_period} icon={UserCheck} color="bg-indigo-50 text-indigo-700" />
            <StatCard label="Returning Users" value={overview?.returning_users} icon={RotateCcw} color="bg-amber-50 text-amber-700" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Feature usage */}
            <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-bold text-slate-900 font-heading">Feature Usage</h2>
              </div>
              {overview?.feature_usage?.length > 0 ? (
                <div className="space-y-3">
                  {overview.feature_usage.map((f) => {
                    const max = overview.feature_usage[0]?.unique_users || 1;
                    const pct = Math.round((f.unique_users / max) * 100);
                    return (
                      <div key={f.event}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{EVENT_LABELS[f.event] || f.event}</span>
                          <span className="text-slate-500">{f.unique_users} user{f.unique_users !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4 text-center">No feature usage data yet.</p>
              )}
            </Card>

            {/* Daily active users */}
            <Card className="p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-bold text-slate-900 font-heading">Daily Active Users</h2>
              </div>
              {overview?.daily_active_users?.length > 0 ? (
                <div className="space-y-2">
                  {overview.daily_active_users.map((d) => {
                    const maxDay = Math.max(...overview.daily_active_users.map(x => x.active_users), 1);
                    const pct = Math.round((d.active_users / maxDay) * 100);
                    return (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-24 shrink-0">{d.date}</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-6 text-right">{d.active_users}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4 text-center">No daily activity data yet.</p>
              )}
            </Card>
          </div>

          {/* Total events */}
          <p className="text-xs text-slate-400 text-right">
            Total student events in period: {overview?.total_events_in_period ?? 0}
          </p>
        </div>
      ) : (
        /* Students tab */
        <Card className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <Calendar className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900 font-heading">Student Activity</h2>
            <span className="ml-auto text-xs text-slate-400">{PERIOD_OPTIONS.find(p => p.value === period)?.label}</span>
          </div>
          {students?.students?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Student</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Roll No.</th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Days Active</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Last Active</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Top Feature</th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.students.map((s) => (
                    <tr key={s.student_id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">{s.name || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{s.roll_number || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-bold text-slate-900">{s.days_active_in_period}</span>
                        {period !== 'today' && (
                          <span className="text-xs text-slate-400">/{period === '30d' ? 30 : 7}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {s.last_active ? new Date(s.last_active).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {s.most_used_feature ? (EVENT_LABELS[s.most_used_feature] || s.most_used_feature) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.active_in_period
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {s.active_in_period ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No student activity data for this period.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
