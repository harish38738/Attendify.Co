import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { BookOpen, CalendarCheck, User, AlertTriangle, CheckCircle2, TrendingUp, Hash, Clock3, Eye, Megaphone, XCircle, Circle } from 'lucide-react';
import { Button } from '../components/ui/button';
import TimetableViewer from '../components/TimetableViewer';
import { useAuth } from '../context/AuthContext';
import OnboardingExperience from '../components/OnboardingExperience';

const StudentDashboard = () => {
  const { user, completeOnboarding } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingChecking, setOnboardingChecking] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState('first_login_only');
  const [timetableOpen, setTimetableOpen] = useState(false);
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [attendanceChange, setAttendanceChange] = useState(null);
  const displayPercentageRef = useRef(0);

  useEffect(() => {
    fetchDashboard();
    const interval = window.setInterval(() => fetchDashboard(true), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (user?.role !== 'student') {
        setOnboardingChecking(false);
        return;
      }
      try {
        const res = await api.get('/api/settings/onboarding');
        const settings = res.data.data || {};
        const enabled = settings.enableOnboarding !== false;
        const mode = settings.onboardingMode || 'first_login_only';
        setOnboardingMode(mode);
        setShowOnboarding(
          enabled && (mode === 'every_login' || user.hasCompletedOnboarding === false)
        );
      } catch (err) {
        console.error('Failed to load onboarding settings:', err);
        setShowOnboarding(false);
      } finally {
        setOnboardingChecking(false);
      }
    };
    checkOnboarding();
  }, [user?.role, user?.hasCompletedOnboarding]);

  const [error, setError] = useState(null);
  const fetchDashboard = async (silent = false) => {
    try {
      const res = await api.get('/api/student/dashboard');
      if (res.data.success) {
        setData(res.data.data);
        if (res.data.data.attendance_change?.delta) {
          setAttendanceChange(res.data.data.attendance_change);
        }
      }
    } catch (err) {
      console.error('Failed to fetch student dashboard:', err);
      setError(err.message || 'Error fetching dashboard');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const nextValue = data?.attendance?.percentage ?? 0;
    const startValue = displayPercentageRef.current;
    const startTime = performance.now();
    const duration = 650;
    let frameId;

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const animatedValue = startValue + (nextValue - startValue) * eased;
      displayPercentageRef.current = animatedValue;
      setDisplayPercentage(animatedValue);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [data?.attendance?.percentage]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Absent': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'OD': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Pending': return 'text-slate-500 bg-slate-50 border-slate-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getAttendanceStatusStyle = (status) => {
    switch (status) {
      case 'Safe': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Warning': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Critical': return 'text-rose-700 bg-rose-50 border-rose-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getDeltaMeta = () => {
    const delta = attendanceChange?.delta ?? 0;
    if (delta > 0) {
      return {
        arrow: '↑',
        text: `+${Math.abs(delta).toFixed(2)}%`,
        label: 'Present this period',
        className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    }
    if (delta < 0) {
      return {
        arrow: '↓',
        text: `-${Math.abs(delta).toFixed(2)}%`,
        label: 'Absent this period',
        className: 'text-rose-700 bg-rose-50 border-rose-200',
      };
    }
    return null;
  };

  const todayPeriods = () => {
    const periodsPerDay = data?.class?.periods_per_day || 0;
    const records = data?.today || [];
    const byPeriod = new Map(records.map((record) => [record.period_number, record]));
    const count = Math.max(periodsPerDay, records.length);
    return Array.from({ length: count }, (_, index) => {
      const periodNumber = index + 1;
      return byPeriod.get(periodNumber) || { period_number: periodNumber, status: 'Pending' };
    });
  };

  const finishOnboarding = async () => {
    if (onboardingMode === 'first_login_only' && user?.hasCompletedOnboarding === false) {
      try {
        await completeOnboarding();
      } catch (err) {
        console.error('Failed to complete onboarding:', err);
      }
    }
    setShowOnboarding(false);
  };

  if (onboardingChecking) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingExperience
        onComplete={finishOnboarding}
        onSkip={finishOnboarding}
      />
    );
  }

  return (
    <div className="p-4 md:p-8" data-testid="student-dashboard">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">My Dashboard</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">Welcome back{user?.name ? `, ${user.name}` : ''}!</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
        </div>
      ) : error ? (
        <Card className="p-8 md:p-12 text-center bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-900 mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
        </Card>
      ) : !data ? (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
          <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Data Found</h3>
          <p className="text-slate-600">Contact your administrator</p>
        </Card>
      ) : (
        <>
          {/* Attendance Percentage - Hero Card */}
          <Card className="dashboard-enter dashboard-enter-1 p-6 md:p-8 mb-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-md">
            <div className="text-center">
              <div className="mb-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <p className="text-sm font-medium text-blue-900">Your Attendance</p>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getAttendanceStatusStyle(data?.attendance?.status)}`}>
                  {data?.attendance?.status || 'Critical'}
                </span>
              </div>
              <div className="text-6xl md:text-7xl font-bold text-blue-900 font-heading">{displayPercentage.toFixed(2)}%</div>
              {attendanceChange?.delta && (() => {
                const deltaMeta = getDeltaMeta();
                if (!deltaMeta) return null;
                return (
                  <div className={`mx-auto mt-4 inline-flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-semibold ${deltaMeta.className}`}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-lg leading-none">
                      {deltaMeta.arrow}
                    </span>
                    <span className="text-left">
                      <span className="block">{deltaMeta.text}</span>
                      <span className="block text-xs font-medium">{deltaMeta.label}</span>
                    </span>
                  </div>
                );
              })()}
              <div className="mx-auto mt-4 grid max-w-xl gap-3 text-left sm:grid-cols-2">
                <div className="rounded-md border border-blue-200 bg-white/70 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-blue-700">Working Hours Attended</p>
                  <p className="mt-1 text-lg font-bold text-blue-950">{data?.attendance?.working_hours_attended ?? data?.attendance?.present_count ?? 0}</p>
                </div>
                <div className="rounded-md border border-blue-200 bg-white/70 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-blue-700">Total Working Hours</p>
                  <p className="mt-1 text-lg font-bold text-blue-950">{data?.attendance?.total_working_hours ?? data?.attendance?.total_periods ?? 0}</p>
                </div>
              </div>
              <p className="hidden">
                Present Periods: {data?.attendance?.present_count} &nbsp;•&nbsp; Conducted Periods: {data?.attendance?.total_periods}
              </p>
              {data?.attendance?.last_updated && (
                <p className="mt-2 text-xs text-blue-600">Last updated: {new Date(data.attendance.last_updated).toLocaleString()}</p>
              )}
              {false && data?.attendance?.total_periods > 0 ? (
                data?.attendance?.is_eligible ? (
                  <div
                    className="mt-4 inline-flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-md"
                    data-testid="eligibility-badge-eligible"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Eligible</span>
                  </div>
                ) : (
                  <div
                    className="mt-4 inline-flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2 rounded-md"
                    data-testid="eligibility-badge-shortage"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Shortage
                      {data?.attendance?.periods_needed_for_75 > 0 ? ` - Need ${data?.attendance?.periods_needed_for_75} more period(s) to reach 75%` : ''}
                    </span>
                  </div>
                )
              ) : null}
            </div>
          </Card>

          {/* Summary Cards */}
          <div className="dashboard-enter dashboard-enter-1 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
            <Card className="h-full p-4 md:p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Roll Number</p>
                  <p className="text-lg font-bold text-slate-900">{data?.student?.roll_number}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Hash className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="h-full p-4 md:p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Class</p>
                  <p className="text-base font-bold text-slate-900 truncate">{data?.class?.name}</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            </Card>
            <Card className="h-full p-4 md:p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Working Hours Attended</p>
                  <p className="text-lg font-bold text-slate-900">{data?.attendance?.working_hours_attended ?? data?.attendance?.present_count}</p>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
            </Card>
            <Card className="h-full p-4 md:p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Total Working Hours</p>
                  <p className="text-lg font-bold text-slate-900">{data?.attendance?.total_working_hours ?? data?.attendance?.total_periods}</p>
                </div>
                <div className="p-2 bg-rose-50 rounded-lg">
                  <CalendarCheck className="h-4 w-4 text-rose-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Timetable and announcements */}
          <div className="mb-6 grid gap-4 min-[760px]:grid-cols-2 md:gap-6">
            <Card className="dashboard-enter dashboard-enter-2 h-full p-4 md:p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-blue-700" /><h2 className="text-lg font-bold text-slate-900 font-heading">Timetable</h2></div>
                {data.day_order?.day_order && <span className="w-fit rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Today's Day Order: Day {data.day_order.day_order}</span>}
              </div>
              {!data.day_order?.day_order ? (
                <div className="py-10 text-center"><Clock3 className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">Today's Day Order has not been selected yet.</p></div>
              ) : data.timetable ? <div><div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><img src={(api.defaults.baseURL || '') + (data?.timetable?.image_url || '') + '?v=' + (data?.timetable?.version || '')} alt="Class timetable" className="h-48 w-full object-contain" /></div><div className="mb-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2"><p><span className="font-semibold text-slate-700">Uploaded:</span> {data?.timetable?.uploaded_at ? new Date(data.timetable.uploaded_at).toLocaleString() : ''}</p><p><span className="font-semibold text-slate-700">Updated:</span> {data?.timetable?.updated_at ? new Date(data.timetable.updated_at).toLocaleString() : ''}</p></div><Button onClick={() => setTimetableOpen(true)} className="bg-blue-900 hover:bg-blue-800"><Eye className="mr-2 h-4 w-4" />View Timetable</Button></div> : <div className="py-10 text-center"><Clock3 className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">No timetable uploaded yet.</p></div>}
            </Card>
            <Card className="dashboard-enter dashboard-enter-3 h-full p-4 md:p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Megaphone className="h-5 w-5 text-blue-700" /><h2 className="text-lg font-bold text-slate-900 font-heading">Latest Announcements</h2></div>
              {(!data.announcements || data.announcements.length === 0) ? <div className="py-10 text-center"><Megaphone className="mx-auto mb-3 h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">No announcements yet.</p></div> : <div className="divide-y divide-slate-100">{data.announcements.map((announcement) => <article key={announcement.id} className="py-3 first:pt-0 last:pb-0"><h3 className="font-semibold text-slate-900">{announcement.title}</h3><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{announcement.description}</p><p className="mt-2 text-xs text-slate-400">{new Date(announcement.created_at).toLocaleString()}</p></article>)}</div>}
            </Card>
          </div>

          {/* Today's Attendance */}
          <Card className="dashboard-enter dashboard-enter-4 p-4 md:p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 font-heading mb-4">Today's Attendance</h2>
            {todayPeriods().length > 0 ? (
              <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3" data-testid="today-attendance">
                {todayPeriods().map((t, i) => {
                  const StatusIcon = t.status === 'Present' || t.status === 'OD' ? CheckCircle2 : t.status === 'Absent' ? XCircle : Circle;
                  return (
                  <div
                    key={i}
                    className={`flex flex-col items-center p-3 rounded-lg border ${getStatusColor(t?.status)}`}
                  >
                    <StatusIcon className="mb-1 h-4 w-4" />
                    <span className="text-sm font-bold">P{t?.period_number}</span>
                    <span className="mt-1 text-sm font-medium">{t?.status}</span>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6" data-testid="no-today-attendance">
                <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No attendance marked for today</p>
              </div>
            )}
          </Card>
          {data.day_order?.day_order && data.timetable && <TimetableViewer open={timetableOpen} onOpenChange={setTimetableOpen} imageUrl={(api.defaults.baseURL || '') + (data?.timetable?.image_url || '') + '?v=' + (data?.timetable?.version || '')} title={`${data.class.name} timetable - Day ${data.day_order.day_order}`} />}
        </>
      )}
    </div>
  );
};

export default StudentDashboard;
