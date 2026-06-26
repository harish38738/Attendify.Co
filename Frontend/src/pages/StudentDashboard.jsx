import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { BookOpen, CalendarCheck, User, AlertTriangle, CheckCircle2, TrendingUp, Hash } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/api/student/dashboard');
      if (res.data.success) setData(res.data.data);
    } catch (error) {
      console.error('Failed to fetch student dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Absent': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'OD': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 md:p-8">
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
          <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Data Found</h3>
          <p className="text-slate-600">Contact your administrator</p>
        </Card>
      </div>
    );
  }

  const { student, attendance, today } = data;
  const cls = data.class;

  return (
    <div className="p-4 md:p-8" data-testid="student-dashboard">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">My Dashboard</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">Welcome back, {student.name}!</p>
      </div>

      {/* Attendance Percentage - Hero Card */}
      <Card className="p-6 md:p-8 mb-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-md">
        <div className="text-center">
          <p className="text-sm font-medium text-blue-900 mb-2">Your Attendance</p>
          <div className="text-6xl md:text-7xl font-bold text-blue-900 font-heading">{attendance.percentage.toFixed(2)}%</div>
          <p className="text-xs md:text-sm text-blue-700 mt-2">
            Present Periods: {attendance.present_count} &nbsp;•&nbsp; Conducted Periods: {attendance.total_periods}
          </p>
          {attendance.total_periods > 0 ? (
            attendance.is_eligible ? (
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
                  {attendance.periods_needed_for_75 > 0
                    ? ` — Need ${attendance.periods_needed_for_75} more period(s) to reach 75%`
                    : ''}
                </span>
              </div>
            )
          ) : null}
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <Card className="p-4 md:p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Roll Number</p>
              <p className="text-lg font-bold text-slate-900">{student.roll_number}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Hash className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4 md:p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Class</p>
              <p className="text-base font-bold text-slate-900 truncate">{cls.name}</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <BookOpen className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4 md:p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Periods Attended</p>
              <p className="text-lg font-bold text-slate-900">{attendance.present_count}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4 md:p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Total Conducted</p>
              <p className="text-lg font-bold text-slate-900">{attendance.total_periods}</p>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg">
              <CalendarCheck className="h-4 w-4 text-rose-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Today's Attendance */}
      <Card className="p-4 md:p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 font-heading mb-4">Today's Attendance</h2>
        {today.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3" data-testid="today-attendance">
            {today.map((t, i) => (
              <div
                key={i}
                className={`flex flex-col items-center p-3 rounded-lg border ${getStatusColor(t.status)}`}
              >
                <span className="text-xs font-medium opacity-70">Period {t.period_number}</span>
                <span className="text-sm font-bold mt-1">{t.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6" data-testid="no-today-attendance">
            <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No attendance marked for today</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentDashboard;
