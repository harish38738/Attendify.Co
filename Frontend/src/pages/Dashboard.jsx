import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Users, BookOpen, CalendarCheck, TrendingUp, Clock3, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    todayAttendancePct: 0,
    todayRecords: 0,
    dayOrder: null,
    validDayOrders: [1, 2, 3, 4, 5, 6],
  });
  const [loading, setLoading] = useState(true);
  const [savingDayOrder, setSavingDayOrder] = useState(false);

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
          dayOrder: d.day_order?.day_order || null,
          validDayOrders: d.valid_day_orders || [1, 2, 3, 4, 5, 6],
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDayOrder = async (value) => {
    const nextDayOrder = Number(value);
    setSavingDayOrder(true);
    try {
      const res = await api.put('/api/settings/day-order', { day_order: nextDayOrder });
      if (res.data.success) {
        setStats((prev) => ({ ...prev, dayOrder: res.data.data.day_order?.day_order || nextDayOrder }));
        toast.success(`Today's Day Order set to Day ${nextDayOrder}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to update Day Order');
    } finally {
      setSavingDayOrder(false);
    }
  };

  const statCards = [
    { title: 'Total Classes', value: stats.totalClasses, icon: BookOpen, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
    { title: 'Total Students', value: stats.totalStudents, icon: Users, bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { title: "Today's Attendance", value: `${stats.todayAttendancePct}%`, icon: CalendarCheck, bgColor: 'bg-indigo-50', iconColor: 'text-indigo-600' },
    { title: 'Records Today', value: stats.todayRecords, icon: TrendingUp, bgColor: 'bg-rose-50', iconColor: 'text-rose-600' },
  ];

  return (
    <div className="p-4 md:p-8" data-testid="dashboard-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600 font-body">Welcome back! Here's your overview.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900"></div>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          <Card className="p-4 md:p-6 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Clock3 className="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Today's Day Order</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {stats.dayOrder ? `Day Order ${stats.dayOrder} is active for student timetables.` : 'Select today\'s Day Order before students use the timetable.'}
                  </p>
                </div>
              </div>
              <Select value={stats.dayOrder ? String(stats.dayOrder) : ''} onValueChange={updateDayOrder} disabled={savingDayOrder}>
                <SelectTrigger className="w-full md:w-56 bg-white">
                  <SelectValue placeholder="Select Day Order" />
                </SelectTrigger>
                <SelectContent>
                  {stats.validDayOrders.map((day) => (
                    <SelectItem key={day} value={String(day)}>Day Order {day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!stats.dayOrder && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>No Day Order has been selected yet.</span>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  data-testid={`stat-card-${index}`}
                  className="h-full p-4 md:p-6 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
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
      )}

    </div>
  );
};

export default Dashboard;
