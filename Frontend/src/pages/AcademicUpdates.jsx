import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BookOpen, Calendar, FileText, Pencil, Plus, Trash2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import InlineLoader from '../components/InlineLoader';

const updateTypes = [
  { value: 'TEST', label: 'Test / Exam' },
  { value: 'STUDY', label: 'Study Material Guide' },
  { value: 'TASK', label: 'Task / Assignment' },
  { value: 'INSTRUCTION', label: 'Faculty Instruction' },
  { value: 'PURCHASE', label: 'Purchase Request' },
  { value: 'MISSED_CLASS', label: 'Missed Class Summary' },
  { value: 'REMINDER', label: 'General Reminder' }
];

const emptyForm = {
  class_id: '',
  type: 'TEST',
  subject: '',
  title: '',
  description: '',
  due_date: '',
  resources: []
};

const AcademicUpdates = () => {
  const [classes, setClasses] = useState([]);
  const [allResources, setAllResources] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resourceSearch, setResourceSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [classRes, updatesRes, resourcesRes] = await Promise.all([
        api.get('/api/classes'),
        api.get('/api/academic-updates'),
        api.get('/api/resources')
      ]);

      const nextClasses = classRes.data.data.classes || [];
      setClasses(nextClasses);
      setUpdates(updatesRes.data.data.updates || []);
      setAllResources(resourcesRes.data.data.resources || []);

      setForm((curr) => {
        if (!curr.class_id && nextClasses.length > 0) {
          return { ...curr, class_id: nextClasses[0].id };
        }
        return curr;
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to load updates data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      class_id: classes[0]?.id || ''
    });
    setResourceSearch('');
    setDialogOpen(true);
  };

  const openEdit = (update) => {
    setEditing(update);
    setForm({
      class_id: update.class_id,
      type: update.type,
      subject: update.subject,
      title: update.title,
      description: update.description,
      due_date: update.due_date || '',
      resources: update.resources || []
    });
    setResourceSearch('');
    setDialogOpen(true);
  };

  const handleResourceToggle = (resourceId) => {
    setForm((prev) => {
      const alreadySelected = prev.resources.includes(resourceId);
      const nextResources = alreadySelected
        ? prev.resources.filter((id) => id !== resourceId)
        : [...prev.resources, resourceId];
      return { ...prev, resources: nextResources };
    });
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;

    const subject = form.subject.trim().replace(/\s+/g, ' ');
    const title = form.title.trim().replace(/\s+/g, ' ');
    const description = form.description.trim();

    if (!form.class_id) return toast.error('Choose a class first');
    if (subject.length < 2 || subject.length > 80) return toast.error('Subject must be 2 to 80 characters');
    if (title.length < 3 || title.length > 120) return toast.error('Title must be 3 to 120 characters');
    if (description.length < 10 || description.length > 3000) return toast.error('Description must be 10 to 3000 characters');

    setSaving(true);

    const payload = {
      ...form,
      subject,
      title,
      description,
      due_date: form.due_date || null
    };

    try {
      if (editing) {
        const editPayload = {
          type: payload.type,
          subject: payload.subject,
          title: payload.title,
          description: payload.description,
          due_date: payload.due_date,
          resources: payload.resources
        };
        await api.put(`/api/academic-updates/${editing.id}`, editPayload);
        toast.success('Academic update updated');
      } else {
        await api.post('/api/academic-updates', payload);
        toast.success('Academic update posted');
      }
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to save update');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (update) => {
    if (!window.confirm(`Delete update "${update.title}"?`)) return;
    try {
      await api.delete(`/api/academic-updates/${update.id}`);
      toast.success('Academic update deleted');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to delete update');
    }
  };

  const getTypeLabel = (type) => {
    return updateTypes.find((t) => t.value === type)?.label || type;
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'TEST': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'STUDY': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'TASK': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'INSTRUCTION': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'PURCHASE': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'MISSED_CLASS': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getResourceName = (resourceId) => {
    const res = allResources.find((r) => r.id === resourceId);
    return res ? (res.displayName || res.filename) : 'Unknown File';
  };

  const filteredUpdates = filter === 'all'
    ? updates
    : updates.filter((u) => u.class_id === filter);

  const filteredResources = allResources.filter((r) => {
    const term = resourceSearch.toLowerCase();
    const displayName = (r.displayName || '').toLowerCase();
    const filename = (r.filename || '').toLowerCase();
    const subjectName = (r.subjectName || '').toLowerCase();
    return displayName.includes(term) || filename.includes(term) || subjectName.includes(term);
  });

  return (
    <div className="p-4 md:p-8" data-testid="academic-updates-page">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Manage Academic Updates</h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">Provide updates about tests, study materials, homework, and what students missed.</p>
        </div>
        <Button onClick={openCreate} disabled={!classes.length || loading} className="bg-blue-900 hover:bg-blue-800">
          <Plus className="mr-2 h-4 w-4" />New Academic Update
        </Button>
      </div>

      {loading ? (
        <InlineLoader text="Loading updates..." />
      ) : (
        <>
          {classes.length > 0 && (
            <Card className="mb-6 p-4 bg-white border border-slate-200 shadow-sm">
              <Label className="text-sm font-semibold text-slate-700">Filter by class</Label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="mt-2 max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>
          )}

          {filteredUpdates.length === 0 ? (
            <Card className="p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
              <BookOpen className="mx-auto mb-4 h-14 w-14 text-slate-300" />
              <h2 className="text-xl font-bold text-slate-900">No academic updates found</h2>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">Create updates for your classes to help students understand what is pending, what to study, and what they missed.</p>
            </Card>
          ) : (
            <div className="grid gap-4 min-[720px]:grid-cols-2 md:gap-6">
              {filteredUpdates.map((item) => (
                <Card key={item.id} className="animate-fade-in h-full p-5 md:p-6 bg-white border border-slate-200 shadow-sm rounded-lg hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-xs font-semibold text-slate-700">
                          {item.class_name}
                        </span>
                        <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${getTypeColor(item.type)}`}>
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)} aria-label="Edit update" className="text-slate-600 hover:text-slate-900">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => remove(item)} aria-label="Delete update">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <span className="text-xs font-bold text-blue-600">{item.subject}</span>
                      <h2 className="text-xl font-bold text-slate-900 mt-1">{item.title}</h2>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{item.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-3">
                    {item.due_date && (
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>Due/Date: {new Date(item.due_date).toLocaleDateString()}</span>
                      </div>
                    )}

                    {item.resources && item.resources.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <LinkIcon className="h-3.5 w-3.5" /> Attached Resources:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.resources.map((rid) => (
                            <span key={rid} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              <FileText className="h-3 w-3 text-slate-400" />
                              {getResourceName(rid)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-[11px] text-slate-400 self-end mt-1">Created {new Date(item.created_at).toLocaleString()}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">{editing ? 'Edit Academic Update' : 'New Academic Update'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            {!editing && (
              <div>
                <Label className="text-slate-700 font-semibold">Class</Label>
                <Select value={form.class_id} onValueChange={(val) => setForm({ ...form, class_id: val })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 min-[520px]:grid-cols-2">
              <div>
                <Label className="text-slate-700 font-semibold">Update type</Label>
                <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {updateTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject" className="text-slate-700 font-semibold">Subject</Label>
                <Input id="subject" className="mt-1" placeholder="e.g. Java Programming" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value.slice(0, 80) })} minLength={2} maxLength={80} required />
              </div>
            </div>

            <div>
              <Label htmlFor="title" className="text-slate-700 font-semibold">Title</Label>
              <Input id="title" className="mt-1" placeholder="e.g. Internal Assessment portion" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 120) })} minLength={3} maxLength={120} required />
            </div>

            <div>
              <Label htmlFor="description" className="text-slate-700 font-semibold">Description / Study Portion</Label>
              <Textarea id="description" className="mt-1 min-h-[100px]" placeholder="Explain what to study, what to do, what to bring, etc." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 3000) })} minLength={10} maxLength={3000} required />
            </div>

            <div>
              <Label htmlFor="due_date" className="text-slate-700 font-semibold">Due date / target date (optional)</Label>
              <Input id="due_date" type="date" className="mt-1" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>

            <div>
              <Label className="text-slate-700 font-semibold flex items-center gap-1.5 mb-1.5">
                <LinkIcon className="h-4 w-4" /> Link existing study resources (optional)
              </Label>
              <Input placeholder="Search resources..." className="mb-2" value={resourceSearch} onChange={(e) => setResourceSearch(e.target.value.slice(0, 80))} maxLength={80} />
              
              <div className="border border-slate-200 rounded-md p-3 max-h-[180px] overflow-y-auto space-y-2 bg-slate-50">
                {filteredResources.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No matching resources found</p>
                ) : (
                  filteredResources.map((res) => {
                    const isChecked = form.resources.includes(res.id);
                    return (
                      <label key={res.id} className="flex items-start gap-2.5 p-1.5 rounded hover:bg-slate-100 cursor-pointer text-xs transition-colors">
                        <input type="checkbox" className="mt-0.5 rounded text-blue-900 border-slate-300 focus:ring-blue-900" checked={isChecked} onChange={() => handleResourceToggle(res.id)} />
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800">{res.displayName || res.filename}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">({res.subjectName} &bull; {res.category})</span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              {form.resources.length > 0 && (
                <div className="mt-2 text-xs font-semibold text-blue-900 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{form.resources.length} resource(s) selected to link to this update.</span>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded transition-colors mt-2" disabled={saving || !form.class_id || !form.subject.trim() || !form.title.trim() || !form.description.trim()}>
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Post academic update'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcademicUpdates;
