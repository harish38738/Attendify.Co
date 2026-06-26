import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { BarChart3, Download } from 'lucide-react';
import { toast } from 'sonner';

const AttendanceReport = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchClasses(); }, []);
  useEffect(() => { if (selectedClass) fetchReport(); }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      if (res.data.success) {
        const list = res.data.data.classes;
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0].id);
      }
    } catch (error) {
      toast.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      const res = await api.get(`/api/attendance/report/${selectedClass}`);
      if (res.data.success) setReport(res.data.data.report);
    } catch (error) {
      toast.error('Failed to fetch report');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/api/attendance/export/${selectedClass}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      const cls = classes.find((c) => c.id === selectedClass);
      link.href = url;
      link.setAttribute('download', `attendance_${cls?.code || 'report'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const getStatusBadge = (row) => {
    if (row.total === 0) return 'bg-slate-100 text-slate-500';
    return row.is_eligible
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-rose-100 text-rose-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" data-testid="attendance-report-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Attendance Reports</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">View attendance summary per student</p>
      </div>

      <Card className="p-4 md:p-6 mb-6 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label className="text-slate-700 font-medium mb-2 block">Select Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger data-testid="class-filter" className="bg-white border-slate-200">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={fetchReport} data-testid="refresh-button" className="bg-blue-900 hover:bg-blue-800 text-white flex-1 md:flex-none">
              Refresh
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              data-testid="export-csv-button"
              disabled={report.length === 0}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex-1 md:flex-none"
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {report.length > 0 ? (
        <Card className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="report-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Roll No</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase">Present</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase">Absent</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase">OD</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase">Total</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase">Attended</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase">%</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-slate-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.map((s, i) => (
                  <tr key={i} data-testid={`report-row-${i}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-900">{s.roll_number}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-center text-sm text-emerald-600 font-medium">{s.present}</td>
                    <td className="py-3 px-4 text-center text-sm text-rose-600 font-medium">{s.absent}</td>
                    <td className="py-3 px-4 text-center text-sm text-amber-600 font-medium">{s.od}</td>
                    <td className="py-3 px-4 text-center text-sm text-slate-700">{s.total}</td>
                    <td className="py-3 px-4 text-center text-sm text-blue-600 font-medium">{s.attended}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(s)}`}>{s.percentage}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.is_eligible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {s.total === 0 ? '—' : s.is_eligible ? 'Eligible' : 'Shortage'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="no-records-message">
          <BarChart3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Records Yet</h3>
          <p className="text-slate-600">Mark attendance to see reports here</p>
        </Card>
      )}
    </div>
  );
};

export default AttendanceReport;
