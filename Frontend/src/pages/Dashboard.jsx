import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Users, BookOpen, CalendarCheck, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    todayAttendancePct: 0,
    todayRecords: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/api/admin/dashboard');
      if (res.data.success) {
        const d = res.data.data;
        setStats({
          totalClasses: d.total_classes,
          totalStudents: d.total_students,
          todayAttendancePct: d.today_attendance_pct,
          todayRecords: d.today_records_count,
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Classes', value: stats.totalClasses, icon: BookOpen, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
    { title: 'Total Students', value: stats.totalStudents, icon: Users, bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { title: "Today's Attendance", value: `${stats.todayAttendancePct}%`, icon: CalendarCheck, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
    { title: 'Records Today', value: stats.todayRecords, icon: TrendingUp, bgColor: 'bg-rose-50', iconColor: 'text-rose-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" data-testid="dashboard-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600 font-body">Welcome back! Here's your overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              data-testid={`stat-card-${index}`}
              className="p-4 md:p-6 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                  <p className="text-2xl md:text-3xl font-bold text-slate-900 font-heading">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-2 md:p-3 rounded-lg`}>
                  <Icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.iconColor}`} strokeWidth={1.5} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
