import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Card } from '../components/ui/card';
import { Users, User } from 'lucide-react';

const StudentClassmates = () => {
  const [classmates, setClassmates] = useState([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassmates();
  }, []);

  const fetchClassmates = async () => {
    try {
      const res = await api.get('/api/student/dashboard');
      if (res.data.success) {
        setClassmates(res.data.data.classmates || []);
        setClassName(res.data.data.class?.name || '');
      }
    } catch (error) {
      console.error('Failed to fetch classmates:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8" data-testid="student-classmates-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Classmates</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">
          {className ? `Students in ${className}` : 'Your classmates'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900"></div>
        </div>
      ) : classmates.length > 0 ? (
        <Card className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px]" data-testid="classmates-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Roll Number</th>
                </tr>
              </thead>
              <tbody>
                {classmates.map((mate, i) => (
                  <tr key={i} data-testid={`classmate-row-${i}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-blue-50 rounded-full flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-900">{mate.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">{mate.roll_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="no-classmates">
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Classmates</h3>
          <p className="text-slate-600">No other students have joined this class yet</p>
        </Card>
      )}
    </div>
  );
};

export default StudentClassmates;
