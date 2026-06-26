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
import { Plus, Trash2, BookOpen, Copy, Link as LinkIcon, Users, Pencil, Eye, RefreshCw, LinkIcon as Link2, User, ChevronLeft, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', periods_per_day: 6 });

  // Rename
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameName, setRenameName] = useState('');

  // View students inside class
  const [viewClass, setViewClass] = useState(null);
  const [viewStudents, setViewStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

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
    try {
      const response = await api.post('/api/classes', {
        ...formData,
        periods_per_day: parseInt(formData.periods_per_day),
      });
      if (response.data.success) {
        toast.success('Class created successfully');
        setDialogOpen(false);
        setFormData({ name: '', code: '', periods_per_day: 6 });
        fetchClasses();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create class');
    }
  };

  const handleDelete = async (classId) => {
    if (!window.confirm('Delete this class? All students and attendance records will be removed.')) return;
    try {
      const response = await api.delete(`/api/classes/${classId}`);
      if (response.data.success) {
        toast.success('Class deleted');
        fetchClasses();
        if (viewClass?.id === classId) setViewClass(null);
      }
    } catch (error) {
      toast.error('Failed to delete class');
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/api/classes/${renameTarget.id}/rename`, { name: renameName });
      if (res.data.success) {
        toast.success('Class renamed');
        setRenameOpen(false);
        fetchClasses();
        if (viewClass?.id === renameTarget.id) setViewClass({ ...viewClass, name: renameName });
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error('Failed to rename class');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
      </div>
    );
  }

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
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              data-testid="rename-class-button"
              onClick={() => { setRenameTarget(viewClass); setRenameName(viewClass.name); setRenameOpen(true); }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Rename
            </Button>
            <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50" data-testid="delete-class-detail-button" onClick={() => handleDelete(viewClass.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
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

            <Button variant="outline" size="sm" onClick={() => handleJoinLink(viewClass.id, 'regenerate')} data-testid="regenerate-join-link" className="text-amber-600 border-amber-200 hover:bg-amber-50">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
            </Button>
          </div>
        </Card>

        {/* Students in this class */}
        <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="p-4 md:p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Students ({viewStudents.length})</h2>
            </div>
          </div>
          {studentsLoading ? (
            <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto"></div></div>
          ) : viewStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="class-students-table">
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

        {/* Rename Dialog */}
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent className="sm:max-w-[400px] mx-4">
            <DialogHeader><DialogTitle className="text-lg font-bold">Rename Class</DialogTitle></DialogHeader>
            <form onSubmit={handleRename} className="space-y-4 mt-2" data-testid="rename-class-form">
              <div>
                <Label htmlFor="rename" className="text-slate-700 font-medium">Class Name</Label>
                <Input id="rename" value={renameName} onChange={(e) => setRenameName(e.target.value)} required data-testid="rename-input" className="mt-2 bg-white border-slate-200" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
                <Button type="submit" data-testid="rename-submit" className="bg-blue-900 hover:bg-blue-800 text-white">Save</Button>
              </div>
            </form>
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
            <Button data-testid="create-class-button" className="bg-blue-900 hover:bg-blue-800 text-white w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] mx-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-heading">Create New Class</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4" data-testid="create-class-form">
              <div>
                <Label htmlFor="name" className="text-slate-700 font-medium">Class Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="class-name-input" placeholder="e.g., Computer Science - Semester 5" className="mt-2 bg-white border-slate-200" />
              </div>
              <div>
                <Label htmlFor="code" className="text-slate-700 font-medium">Class Code</Label>
                <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required data-testid="class-code-input" placeholder="e.g., CS5" className="mt-2 bg-white border-slate-200" />
              </div>
              <div>
                <Label htmlFor="periods" className="text-slate-700 font-medium">Periods Per Day</Label>
                <Input id="periods" type="number" min={1} max={10} value={formData.periods_per_day} onChange={(e) => setFormData({ ...formData, periods_per_day: e.target.value })} required data-testid="periods-per-day-input" className="mt-2 bg-white border-slate-200" />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" data-testid="submit-class-button" className="bg-blue-900 hover:bg-blue-800 text-white w-full sm:w-auto">Create Class</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="classes-grid">
          {classes.map((cls) => {
            const joinEnabled = cls.join_enabled !== false;
            return (
              <Card key={cls.id} data-testid={`class-card-${cls.code}`} className="p-4 md:p-6 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
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
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setRenameTarget(cls); setRenameName(cls.name); setRenameOpen(true); }} className="text-slate-400 hover:text-slate-700 h-8 w-8" title="Rename">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cls.id)} data-testid={`delete-class-${cls.code}`} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {cls.student_count || 0} students</span>
                  <span>{cls.periods_per_day} periods/day</span>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  {cls.join_code && joinEnabled ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700 truncate">{cls.join_code}</code>
                      <Button variant="ghost" size="icon" onClick={() => copyJoinCode(cls.join_code)} className="h-7 w-7 text-slate-600"><Copy className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => copyJoinLink(cls.join_code)} className="h-7 w-7 text-blue-600"><LinkIcon className="h-3 w-3" /></Button>
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

      {/* Rename Dialog (from grid) */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[400px] mx-4">
          <DialogHeader><DialogTitle className="text-lg font-bold">Rename Class</DialogTitle></DialogHeader>
          <form onSubmit={handleRename} className="space-y-4 mt-2" data-testid="rename-class-form">
            <div>
              <Label htmlFor="rename-grid" className="text-slate-700 font-medium">Class Name</Label>
              <Input id="rename-grid" value={renameName} onChange={(e) => setRenameName(e.target.value)} required data-testid="rename-input" className="mt-2 bg-white border-slate-200" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="rename-submit" className="bg-blue-900 hover:bg-blue-800 text-white">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Classes;
