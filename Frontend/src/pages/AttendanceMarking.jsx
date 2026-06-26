import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { CalendarCheck, CheckCircle2, Search, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AttendanceMarking = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedPeriod, setSelectedPeriod] = useState('1');
  const [periodsPerDay, setPeriodsPerDay] = useState(6);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingRecords, setExistingRecords] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      const cls = classes.find((c) => c.id === selectedClass);
      if (cls) setPeriodsPerDay(cls.periods_per_day || 6);
      fetchStudents();
    }
  }, [selectedClass, classes]);

  const checkExisting = useCallback(async () => {
    if (!selectedClass || !selectedDate || !selectedPeriod) return;
    try {
      const res = await api.get(`/api/attendance/check?class_id=${selectedClass}&date=${selectedDate}&period_number=${selectedPeriod}`);
      if (res.data.success && res.data.data.exists) {
        setExistingRecords(true);
        setIsEditMode(true);
        // Pre-fill attendance from existing records
        const existing = {};
        res.data.data.records.forEach((r) => {
          existing[r.student_id] = r.status;
        });
        setAttendance(existing);
      } else {
        setExistingRecords(false);
        setIsEditMode(false);
        // Reset to all present
        const fresh = {};
        students.forEach((s) => { fresh[s.id] = 'Present'; });
        setAttendance(fresh);
      }
    } catch (error) {
      console.error('Check attendance error:', error);
    }
  }, [selectedClass, selectedDate, selectedPeriod, students]);

  useEffect(() => {
    if (students.length > 0) checkExisting();
  }, [selectedDate, selectedPeriod, students, checkExisting]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      if (response.data.success) {
        const classList = response.data.data.classes;
        setClasses(classList);
        if (classList.length > 0) setSelectedClass(classList[0].id);
      }
    } catch (error) {
      toast.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    try {
      const response = await api.get(`/api/classes/${selectedClass}/students`);
      if (response.data.success) {
        const studentsList = response.data.data.students;
        setStudents(studentsList);
        const init = {};
        studentsList.forEach((s) => { init[s.id] = 'Present'; });
        setAttendance(init);
      }
    } catch (error) {
      toast.error('Failed to fetch students');
    }
  };

  const cycleStatus = (studentId) => {
    const current = attendance[studentId] || 'Present';
    const next = current === 'Present' ? 'Absent' : current === 'Absent' ? 'OD' : 'Present';
    setAttendance((prev) => ({ ...prev, [studentId]: next }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-emerald-500 hover:bg-emerald-600 text-white';
      case 'Absent': return 'bg-rose-500 hover:bg-rose-600 text-white';
      case 'OD': return 'bg-amber-500 hover:bg-amber-600 text-white';
      default: return 'bg-emerald-500 hover:bg-emerald-600 text-white';
    }
  };

  const handleMarkAllPresent = () => {
    const all = {};
    students.forEach((s) => { all[s.id] = 'Present'; });
    setAttendance(all);
    toast.success('All marked as Present');
  };

  const handleSubmit = async () => {
    if (!selectedClass || students.length === 0) return;
    setSubmitting(true);
    try {
      const records = students.map((s) => ({
        student_id: s.id,
        status: attendance[s.id] || 'Present',
      }));

      const payload = {
        class_id: selectedClass,
        date: selectedDate,
        period_number: parseInt(selectedPeriod),
        records,
      };

      let res;
      if (isEditMode) {
        res = await api.put('/api/attendance', payload);
      } else {
        res = await api.post('/api/attendance', payload);
      }

      if (res.data.success) {
        toast.success(res.data.message);
        setExistingRecords(true);
        setIsEditMode(true);
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
          <CalendarCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Classes Available</h3>
          <p className="text-slate-600">Create a class and add students first</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" data-testid="attendance-marking-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Mark Attendance</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">Record student attendance by period</p>
      </div>

      <Card className="p-4 md:p-6 mb-6 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <Label className="text-slate-700 font-medium mb-2 block">Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger data-testid="class-selector" className="bg-white border-slate-200">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} ({cls.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="date" className="text-slate-700 font-medium mb-2 block">Date</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              data-testid="date-selector"
              className="bg-white border-slate-200"
            />
          </div>
          <div>
            <Label className="text-slate-700 font-medium mb-2 block">Period</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger data-testid="period-selector" className="bg-white border-slate-200">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: periodsPerDay }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    Period {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {existingRecords && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
            <Edit3 className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">Attendance already exists for this period. You are now in edit mode.</span>
          </div>
        )}
      </Card>

      {students.length > 0 ? (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-slate-200"
                data-testid="search-students"
              />
            </div>
            <Button onClick={handleMarkAllPresent} variant="outline" data-testid="mark-all-present-button" className="w-full sm:w-auto">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              All Present
            </Button>
          </div>

          <Card className="bg-white border border-slate-200 rounded-lg shadow-sm mb-6">
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {filteredStudents.map((student, index) => (
                  <div key={student.id} data-testid={`attendance-row-${index}`} className="p-4 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{student.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{student.roll_number}</p>
                      </div>
                      <Button
                        onClick={() => cycleStatus(student.id)}
                        className={`px-4 py-2 rounded-md font-medium transition-all min-w-[90px] ${getStatusColor(attendance[student.id] || 'Present')}`}
                        data-testid={`status-button-${index}`}
                      >
                        {attendance[student.id] || 'Present'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="submit-attendance-button"
              className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-8 w-full sm:w-auto"
            >
              {submitting ? 'Submitting...' : isEditMode ? 'Update Attendance' : 'Submit Attendance'}
            </Button>
          </div>
        </>
      ) : (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="no-students-message">
          <CalendarCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Students in This Class</h3>
          <p className="text-slate-600">Add students before marking attendance</p>
        </Card>
      )}
    </div>
  );
};

export default AttendanceMarking;
