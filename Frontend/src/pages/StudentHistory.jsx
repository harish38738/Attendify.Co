import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { CalendarCheck } from 'lucide-react';

const StudentHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (silent = false) => {
    try {
      const res = await api.get('/api/student/dashboard');
      if (res.data.success) {
        setHistory(res.data.data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-emerald-600 bg-emerald-50';
      case 'Absent': return 'text-rose-600 bg-rose-50';
      case 'OD': return 'text-amber-600 bg-amber-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="p-4 md:p-8" data-testid="student-history-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Attendance History</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">Your complete attendance records</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900"></div>
        </div>
      ) : history.length > 0 ? (
        <Card className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]" data-testid="history-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Subject</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Period</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, i) => (
                  <tr key={i} data-testid={`history-row-${i}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{record.date}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{record.subject || 'Class'}</td>
                    <td className="py-3 px-4 text-center text-sm text-slate-700">Period {record.period_number}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="no-history">
          <CalendarCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Records Yet</h3>
          <p className="text-slate-600">Your attendance history will appear here once recorded</p>
        </Card>
      )}
    </div>
  );
};

export default StudentHistory;
