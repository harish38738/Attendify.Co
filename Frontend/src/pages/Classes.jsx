import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, Trash2, BookOpen, Copy, Link as LinkIcon, Users, Pencil, Eye, RefreshCw, User, ChevronLeft, ToggleLeft, ToggleRight, Clock, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const DEFAULT_FORM = { name: '', code: '', periods_per_day: 6, department: '', year: '', section: '', semester: '', academic_year: '', max_students: 100 };

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Edit class dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editData, setEditData] = useState({ name: '', department: '', year: '', section: '', semester: '', academic_year: '', max_students: 100 });
  const [editError, setEditError] = useState('');

  // View students inside class
  const [viewClass, setViewClass] = useState(null);
  const [viewStudents, setViewStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Delete confirm dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      if (response.data.success) setClasses(response.data.data.classes);
    } catch (error) {
      toast.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (creating) return;
    const maxStudents = parseInt(formData.max_students);
    if (isNaN(maxStudents) || maxStudents < 1 || maxStudents > 100) {
      toast.error('Maximum students must be between 1 and 100');
      return;
    }
    setCreating(true);
    try {
      const response = await api.post('/api/classes', {
        ...formData,
        periods_per_day: parseInt(formData.periods_per_day),
        max_students: maxStudents,
      });
      if (response.data.success) {
        toast.success('Class created successfully');
        setDialogOpen(false);
        setFormData(DEFAULT_FORM);
        fetchClasses();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create class');
    } finally {
      setCreating(false);
    }
  };

  const navigate = useNavigate();

  // Returns true if the class can be trashed by the current user
  const canDeleteClass = (cls) => !!cls.can_delete;

  // Returns tooltip text for the delete button
  const getDeleteTooltip = (cls) => {
    if (!cls.can_delete) return 'Only the super admin can delete classes containing data.';
    return 'Move to Trash';
  };

  const openDeleteConfirm = (cls) => {
    setClassToDelete(cls);
    setDeleteConfirmInput('');
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const response = await api.delete(`/api/classes/${classToDelete.id}`);
      if (response.data.success) {
        toast.success('Class moved to trash');
        fetchClasses();
        if (viewClass?.id === classToDelete.id) setViewClass(null);
        setDeleteConfirmOpen(false);
      } else {
        toast.error(response.data.message || 'Failed to move class to trash');
      }
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to move class to trash';
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEdit = (cls) => {
    setEditTarget(cls);
    setEditData({
      name: cls.name || '',
      department: cls.department || '',
      year: cls.year || '',
      section: cls.section || '',
      semester: cls.semester || '',
      academic_year: cls.academic_year || '',
      max_students: cls.max_students ?? 100,
    });
    setEditError('');
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    const maxStudents = parseInt(editData.max_students);
    if (isNaN(maxStudents) || maxStudents < 1 || maxStudents > 100) {
      setEditError('Maximum students must be between 1 and 100.');
      return;
    }
    try {
      const res = await api.put(`/api/classes/${editTarget.id}`, { ...editData, max_students: maxStudents });
      if (res.data.success) {
        toast.success('Class updated successfully');
        setEditOpen(false);
        fetchClasses();
        if (viewClass?.id === editTarget.id) {
          setViewClass({ ...viewClass, ...editData, max_students: maxStudents });
        }
      } else {
        setEditError(res.data.message);
      }
    } catch (error) {
      setEditError(error.response?.data?.detail || 'Failed to update class');
    }
  };

  const handleJoinLink = async (classId, action) => {
    try {
      const res = await api.put(`/api/classes/${classId}/join-link`, { action });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchClasses();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error('Failed to update join link');
    }
  };

  const copyJoinLink = (joinCode) => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${joinCode}`);
    toast.success('Join link copied!');
  };

  const copyJoinCode = (joinCode) => {
    navigator.clipboard.writeText(joinCode);
    toast.success('Join code copied!');
  };

  const openClassView = async (cls) => {
    setViewClass(cls);
    setStudentsLoading(true);
    try {
      const res = await api.get(`/api/classes/${cls.id}/students`);
      if (res.data.success) setViewStudents(res.data.data.students);
    } catch (e) {
      toast.error('Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  // Edit Dialog Component (shared)
  const EditClassDialog = () => (
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="sm:max-w-[520px] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Edit Class</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleEdit} className="space-y-4 mt-2" data-testid="edit-class-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="edit-name" className="text-slate-700 font-medium">Class Name *</Label>
              <Input id="edit-name" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} required data-testid="edit-class-name-input" className="mt-1.5 bg-white border-slate-200" />
            </div>
            <div>
              <Label htmlFor="edit-department" className="text-slate-700 font-medium">Department</Label>
              <Input id="edit-department" value={editData.department} onChange={(e) => setEditData({ ...editData, department: e.target.value })} placeholder="e.g., Computer Science" className="mt-1.5 bg-white border-slate-200" />
            </div>
            <div>
              <Label htmlFor="edit-year" className="text-slate-700 font-medium">Year</Label>
              <Input id="edit-year" value={editData.year} onChange={(e) => setEditData({ ...editData, year: e.target.value })} placeholder="e.g., 2" className="mt-1.5 bg-white border-slate-200" />
            </div>
            <div>
              <Label htmlFor="edit-section" className="text-slate-700 font-medium">Section</Label>
              <Input id="edit-section" value={editData.section} onChange={(e) => setEditData({ ...editData, section: e.target.value })} placeholder="e.g., A" className="mt-1.5 bg-white border-slate-200" />
            </div>
            <div>
              <Label htmlFor="edit-semester" className="text-slate-700 font-medium">Semester</Label>
              <Input id="edit-semester" value={editData.semester} onChange={(e) => setEditData({ ...editData, semester: e.target.value })} placeholder="e.g., 3" className="mt-1.5 bg-white border-slate-200" />
            </div>
            <div>
              <Label htmlFor="edit-academic-year" className="text-slate-700 font-medium">Academic Year</Label>
              <Input id="edit-academic-year" value={editData.academic_year} onChange={(e) => setEditData({ ...editData, academic_year: e.target.value })} placeholder="e.g., 2024-25" className="mt-1.5 bg-white border-slate-200" />
            </div>
            <div>
              <Label htmlFor="edit-max-students" className="text-slate-700 font-medium">Max Students (1–100)</Label>
              <Input id="edit-max-students" type="number" min={1} max={100} value={editData.max_students} onChange={(e) => setEditData({ ...editData, max_students: e.target.value })} required data-testid="edit-max-students-input" className="mt-1.5 bg-white border-slate-200" />
            </div>
          </div>

          {editError && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{editError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" data-testid="edit-class-submit" className="bg-blue-900 hover:bg-blue-800 text-white">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  // === Detail View ===
  if (viewClass) {
    const joinEnabled = viewClass.join_enabled !== false;
    return (
      <div className="p-4 md:p-8" data-testid="class-detail-page">
        <button
          onClick={() => setViewClass(null)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          data-testid="back-to-classes"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Classes
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">{viewClass.name}</h1>
            <p className="mt-1 text-sm text-slate-500 font-mono">{viewClass.code} &middot; {viewClass.periods_per_day} periods/day</p>
            {(viewClass.department || viewClass.year || viewClass.section) && (
              <p className="mt-0.5 text-sm text-slate-500">
                {[viewClass.department, viewClass.year && `Year ${viewClass.year}`, viewClass.section && `Sec ${viewClass.section}`, viewClass.semester && `Sem ${viewClass.semester}`].filter(Boolean).join(' · ')}
              </p>
            )}
            {viewClass.academic_year && (
              <p className="mt-0.5 text-xs text-slate-400">Academic Year: {viewClass.academic_year}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded px-2 py-1">
              Max: {viewClass.max_students ?? 100} students
            </span>
            <Button
              variant="outline"
              size="sm"
              data-testid="edit-class-button"
              onClick={() => openEdit(viewClass)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
            {/* Delete button in detail view */}
            {canDeleteClass(viewClass) ? (
              <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50" data-testid="delete-class-detail-button" onClick={() => openDeleteConfirm(viewClass)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Move to Trash
              </Button>
            ) : (
              <div className="flex flex-col items-start gap-1">
                <Button variant="outline" size="sm" className="text-slate-400 border-slate-200 cursor-not-allowed opacity-60" disabled data-testid="delete-class-detail-button-disabled">
                  <Lock className="h-3.5 w-3.5 mr-1.5" /> Move to Trash
                </Button>
                <span className="text-xs text-slate-500 italic">Only the super admin can delete classes containing data.</span>
              </div>
            )}
          </div>
        </div>

        {/* Join Link Controls */}
        <Card className="p-4 md:p-6 mb-6 bg-white border border-slate-200 rounded-lg shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-3">Join Link</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              onClick={() => handleJoinLink(viewClass.id, joinEnabled ? 'disable' : 'enable')}
              data-testid="toggle-join-link"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${joinEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
            >
              {joinEnabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
              {joinEnabled ? 'Enabled' : 'Disabled'}
            </button>

            {joinEnabled && viewClass.join_code && (
              <>
                <code className="text-xs bg-slate-100 px-3 py-1.5 rounded font-mono text-slate-700 border border-slate-200">
                  {viewClass.join_code}
                </code>
                <Button variant="ghost" size="sm" onClick={() => copyJoinCode(viewClass.join_code)} className="text-slate-600" title="Copy code">
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Code
                </Button>
                <Button variant="ghost" size="sm" onClick={() => copyJoinLink(viewClass.join_code)} className="text-blue-600" title="Copy link">
                  <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Link
                </Button>
              </>
            )}

            <Button variant="outline" size="sm" onClick={() => handleJoinLink(viewClass.id, 'regenerate')} data-testid="regenerate-join-link" className="text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
            </Button>
          </div>
        </Card>

        {/* Students in this class */}
        <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-4 md:p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Students ({viewStudents.length} / {viewClass.max_students ?? 100})</h2>
            </div>
          </div>
          {studentsLoading ? (
            <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800 mx-auto"></div><p className="mt-3 text-sm text-slate-500">Loading students…</p></div>
          ) : viewStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]" data-testid="class-students-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Roll Number</th>
                  </tr>
                </thead>
                <tbody>
                  {viewStudents.map((s, i) => (
                    <tr key={s.id} data-testid={`class-student-row-${i}`} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 rounded-full"><User className="h-3 w-3 text-blue-600" /></div>
                          <span className="text-sm font-medium text-slate-900">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{s.roll_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No students in this class yet</p>
            </div>
          )}
        </Card>

        <EditClassDialog />

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-rose-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Move class to Trash?
              </DialogTitle>
            </DialogHeader>
            
            {classToDelete && (
              <div className="py-4">
                <p className="mb-4 text-slate-700">Class: <strong>{classToDelete.name}</strong></p>
                
                {classToDelete.delete_reason === 'empty_class' ? (
                  <div className="text-sm text-slate-600 space-y-4">
                    <p>This class will be moved to Trash.</p>
                    <p>No data will be permanently deleted.<br/>You can restore this class later.</p>
                    <p>Are you sure you want to continue?</p>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 space-y-4">
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                      <p className="font-semibold mb-2 text-slate-700">This class contains:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>{classToDelete.student_count || 0} students</li>
                        <li>{classToDelete.attendance_count || 0} attendance records</li>
                        <li>{classToDelete.resource_count || 0} resources</li>
                        <li>{classToDelete.announcement_count || 0} announcements</li>
                      </ul>
                    </div>
                    
                    <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-800">
                      <p className="font-semibold mb-1">Important:</p>
                      <p>No data will be permanently deleted. Attendify will safely store all records internally and this class can be restored later.</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="confirm-delete" className="font-medium text-slate-700 mb-1.5 block">
                        To confirm, type the class name:
                      </Label>
                      <Input
                        id="confirm-delete"
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        placeholder={classToDelete.name}
                        className="bg-white border-slate-300"
                        data-testid="delete-confirm-input"
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={confirmDelete}
                    disabled={deleteLoading || (classToDelete.delete_reason !== 'empty_class' && deleteConfirmInput !== classToDelete.name)}
                    data-testid="confirm-delete-button"
                  >
                    {deleteLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Move to Trash
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === Grid View ===
  return (
    <div className="p-4 md:p-8" data-testid="classes-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Classes</h1>
          <p className="mt-2 text-sm md:text-base text-slate-600 font-body">Manage your classes</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-class-button" disabled={loading} className="bg-blue-900 hover:bg-blue-800 text-white w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Class
            </Button>
          </DialogTrigger>
          <Button variant="outline" onClick={() => navigate('/admin/trash')} className="text-slate-600 border-slate-200 hover:bg-slate-50 w-full sm:w-auto mt-2 sm:mt-0">
            <Trash2 className="h-4 w-4 mr-2" />
            Trash
          </Button>
          <DialogContent className="sm:max-w-[540px] mx-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading">Create new class</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4" data-testid="create-class-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="name" className="text-slate-700 font-medium">Class Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="class-name-input" placeholder="e.g., Computer Science - Semester 5" className="mt-1.5 bg-white border-slate-200" />
                </div>
                <div>
                  <Label htmlFor="code" className="text-slate-700 font-medium">Class Code *</Label>
                  <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required data-testid="class-code-input" placeholder="e.g., CS5A" className="mt-1.5 bg-white border-slate-200" />
                </div>
                <div>
                  <Label htmlFor="periods" className="text-slate-700 font-medium">Periods Per Day *</Label>
                  <Input id="periods" type="number" min={1} max={10} value={formData.periods_per_day} onChange={(e) => setFormData({ ...formData, periods_per_day: e.target.value })} required data-testid="periods-per-day-input" className="mt-1.5 bg-white border-slate-200" />
                </div>
                <div>
                  <Label htmlFor="department" className="text-slate-700 font-medium">Department</Label>
                  <Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="e.g., Computer Science" className="mt-1.5 bg-white border-slate-200" />
                </div>
                <div>
                  <Label htmlFor="year" className="text-slate-700 font-medium">Year</Label>
                  <Input id="year" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="e.g., 2" className="mt-1.5 bg-white border-slate-200" />
                </div>
                <div>
                  <Label htmlFor="section" className="text-slate-700 font-medium">Section</Label>
                  <Input id="section" value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} placeholder="e.g., A" className="mt-1.5 bg-white border-slate-200" />
                </div>
                <div>
                  <Label htmlFor="semester" className="text-slate-700 font-medium">Semester</Label>
                  <Input id="semester" value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} placeholder="e.g., 3" className="mt-1.5 bg-white border-slate-200" />
                </div>
                <div>
                  <Label htmlFor="academic-year" className="text-slate-700 font-medium">Academic Year</Label>
                  <Input id="academic-year" value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} placeholder="e.g., 2024-25" className="mt-1.5 bg-white border-slate-200" />
                </div>
                <div>
                  <Label htmlFor="max-students" className="text-slate-700 font-medium">Max Students (1–100)</Label>
                  <Input id="max-students" type="number" min={1} max={100} value={formData.max_students} onChange={(e) => setFormData({ ...formData, max_students: e.target.value })} data-testid="max-students-input" className="mt-1.5 bg-white border-slate-200" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" disabled={creating} data-testid="submit-class-button" className="bg-blue-900 hover:bg-blue-800 text-white w-full sm:w-auto">
                  {creating ? 'Creating...' : 'Create class'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        </div>
      ) : classes.length > 0 ? (
        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6" data-testid="classes-grid">
          {classes.map((cls) => {
            const joinEnabled = cls.join_enabled !== false;
            return (
              <Card key={cls.id} data-testid={`class-card-${cls.code}`} className="animate-fade-in h-full p-4 md:p-6 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <button onClick={() => openClassView(cls)} className="flex items-center gap-3 min-w-0 flex-1 text-left group">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm md:text-base truncate group-hover:text-blue-700 transition-colors">{cls.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">{cls.code}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cls)} data-testid={`edit-class-${cls.code}`} aria-label="Edit class" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canDeleteClass(cls) ? (
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => openDeleteConfirm(cls)}
                        data-testid={`delete-class-${cls.code}`}
                        aria-label="Move class to trash"
                        className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8"
                        title={getDeleteTooltip(cls)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost" size="icon"
                        disabled
                        data-testid={`delete-class-${cls.code}-disabled`}
                        aria-label="Delete class (disabled)"
                        className="text-slate-300 cursor-not-allowed h-8 w-8"
                        title="Only the super admin can delete classes containing data."
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {cls.student_count || 0} / {cls.max_students ?? 100}</span>
                  <span>{cls.periods_per_day} periods/day</span>
                </div>

                {(cls.department || cls.section) && (
                  <p className="text-xs text-slate-400 mb-2 truncate">
                    {[cls.department, cls.year && `Yr ${cls.year}`, cls.section && `Sec ${cls.section}`, cls.semester && `Sem ${cls.semester}`].filter(Boolean).join(' · ')}
                  </p>
                )}

                <div className="pt-3 border-t border-slate-100">
                  {cls.join_code && joinEnabled ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700 truncate">{cls.join_code}</code>
                      <Button variant="ghost" size="icon" onClick={() => copyJoinCode(cls.join_code)} aria-label="Copy join code" className="h-7 w-7 text-slate-600"><Copy className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => copyJoinLink(cls.join_code)} aria-label="Copy join link" className="h-7 w-7 text-blue-600"><LinkIcon className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Join link disabled</p>
                  )}
                </div>

                <Button variant="outline" size="sm" className="w-full mt-3 text-xs" data-testid={`view-class-${cls.code}`} onClick={() => openClassView(cls)}>
                  <Eye className="h-3 w-3 mr-1.5" /> View Details
                </Button>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="no-classes-message">
          <BookOpen className="h-12 md:h-16 w-12 md:w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">No Classes Yet</h3>
          <p className="text-sm md:text-base text-slate-600 mb-6">Get started by creating your first class</p>
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-900 hover:bg-blue-800 text-white"><Plus className="h-4 w-4 mr-2" /> Create Your First Class</Button>
        </Card>
      )}

      {/* Edit Class Dialog (grid view) */}
      <EditClassDialog />
    </div>
  );
};

export default Classes;
