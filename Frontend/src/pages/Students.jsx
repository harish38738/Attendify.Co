import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Plus, Users as UsersIcon, User, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const Students = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', roll_number: '' });

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editData, setEditData] = useState({ name: '', roll_number: '' });

  useEffect(() => { fetchClasses(); }, []);
  useEffect(() => { if (selectedClass) fetchStudents(); }, [selectedClass]);

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

  const fetchStudents = async () => {
    if (!selectedClass) return;
    try {
      const res = await api.get(`/api/classes/${selectedClass}/students`);
      if (res.data.success) setStudents(res.data.data.students);
    } catch (error) {
      toast.error('Failed to fetch students');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClass) { toast.error('Select a class first'); return; }
    try {
      const res = await api.post(`/api/classes/${selectedClass}/students`, formData);
      if (res.data.success) {
        toast.success('Student added');
        setDialogOpen(false);
        setFormData({ name: '', roll_number: '' });
        fetchStudents();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add student');
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from this class?`)) return;
    try {
      await api.delete(`/api/students/${studentId}`);
      toast.success('Student removed');
      fetchStudents();
    } catch (error) {
      toast.error('Failed to remove student');
    }
  };

  const openEdit = (student) => {
    setEditTarget(student);
    setEditData({ name: student.name, roll_number: student.roll_number });
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/api/students/${editTarget.id}`, editData);
      if (res.data.success) {
        toast.success('Student updated');
        setEditOpen(false);
        fetchStudents();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update student');
    }
  };

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
          <UsersIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Classes Available</h3>
          <p className="text-slate-600">Please create a class first before adding students</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" data-testid="students-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Students</h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">Manage students in your classes</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-student-button" disabled={!selectedClass} className="bg-blue-900 hover:bg-blue-800 text-white w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] mx-4">
            <DialogHeader><DialogTitle className="text-xl font-bold font-heading">Add New Student</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4" data-testid="add-student-form">
              <div>
                <Label htmlFor="name" className="text-slate-700 font-medium">Full Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="student-name-input" placeholder="e.g., John Doe" className="mt-2 bg-white border-slate-200" />
              </div>
              <div>
                <Label htmlFor="roll_number" className="text-slate-700 font-medium">Roll Number</Label>
                <Input id="roll_number" value={formData.roll_number} onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })} required data-testid="student-roll-input" placeholder="e.g., 21CS001" className="mt-2 bg-white border-slate-200" />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" data-testid="submit-student-button" className="bg-blue-900 hover:bg-blue-800 text-white w-full sm:w-auto">Add Student</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <Label className="text-slate-700 font-medium mb-2 block">Select Class</Label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger data-testid="class-selector" className="w-full bg-white border-slate-200">
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {students.length > 0 ? (
        <Card className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="students-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Roll Number</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id} data-testid={`student-row-${index}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 rounded-full flex-shrink-0"><User className="h-3 w-3 text-blue-600" /></div>
                        <span className="font-medium text-slate-900 text-sm truncate">{student.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-mono text-xs">{student.roll_number}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(student)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50" data-testid={`edit-student-${index}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id, student.name)} className="text-rose-600 hover:bg-rose-50" data-testid={`delete-student-${index}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="no-students-message">
          <UsersIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Students in This Class</h3>
          <p className="text-slate-600 mb-6">Add students manually or share the join link</p>
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-900 hover:bg-blue-800 text-white"><Plus className="h-4 w-4 mr-2" /> Add Your First Student</Button>
        </Card>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px] mx-4">
          <DialogHeader><DialogTitle className="text-lg font-bold">Edit Student</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2" data-testid="edit-student-form">
            <div>
              <Label htmlFor="edit-name" className="text-slate-700 font-medium">Full Name</Label>
              <Input id="edit-name" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required data-testid="edit-student-name" className="mt-2 bg-white border-slate-200" />
            </div>
            <div>
              <Label htmlFor="edit-roll" className="text-slate-700 font-medium">Roll Number</Label>
              <Input id="edit-roll" value={editData.roll_number} onChange={(e) => setEditData({ ...editData, roll_number: e.target.value })} required data-testid="edit-student-roll" className="mt-2 bg-white border-slate-200" />
              <p className="text-xs text-slate-500 mt-1">Must be unique within the class</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="edit-student-submit" className="bg-blue-900 hover:bg-blue-800 text-white">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
