import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import InlineLoader from '../components/InlineLoader';

const emptyForm = { class_id: '', title: '', description: '' };

const Announcements = () => {
  const [classes, setClasses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [classResponse, announcementResponse] = await Promise.all([api.get('/api/classes'), api.get('/api/announcements')]);
      const nextClasses = classResponse.data.data.classes || [];
      setClasses(nextClasses);
      setAnnouncements(announcementResponse.data.data.announcements || []);
      if (!form.class_id && nextClasses.length) setForm((current) => ({ ...current, class_id: nextClasses[0].id }));
    } catch (error) { toast.error(error.response?.data?.detail || 'Unable to load announcements'); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, class_id: classes[0]?.id || '' }); setDialogOpen(true); };
  const openEdit = (announcement) => { setEditing(announcement); setForm({ class_id: announcement.class_id, title: announcement.title, description: announcement.description }); setDialogOpen(true); };

  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    const title = form.title.trim().replace(/\s+/g, ' ');
    const description = form.description.trim();
    if (!form.class_id) return toast.error('Choose a class first');
    if (title.length < 3 || title.length > 120) return toast.error('Title must be 3 to 120 characters');
    if (description.length < 10 || description.length > 2000) return toast.error('Description must be 10 to 2000 characters');
    setSaving(true);
    try {
      if (editing) await api.put('/api/announcements/' + editing.id, { title, description });
      else await api.post('/api/announcements', { ...form, title, description });
      toast.success(editing ? 'Announcement updated' : 'Announcement posted');
      setDialogOpen(false); await loadData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Unable to save announcement'); }
    finally { setSaving(false); }
  };

  const remove = async (announcement) => {
    if (!window.confirm('Delete "' + announcement.title + '"?')) return;
    try { await api.delete('/api/announcements/' + announcement.id); toast.success('Announcement deleted'); await loadData(); }
    catch (error) { toast.error(error.response?.data?.detail || 'Unable to delete announcement'); }
  };

  const visible = filter === 'all' ? announcements : announcements.filter((item) => item.class_id === filter);

  return (
    <div className="p-4 md:p-8" data-testid="announcements-page">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-8">
        <div><h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Announcements</h1><p className="mt-2 text-sm md:text-base text-slate-600">Share important updates with a class.</p></div>
        <Button onClick={openCreate} disabled={!classes.length || loading} className="bg-blue-900 hover:bg-blue-800"><Plus className="mr-2 h-4 w-4" />New announcement</Button>
      </div>
      {loading ? (
        <InlineLoader text="Loading announcements..." />
      ) : (
        <>
          {classes.length > 0 && <Card className="mb-6 p-4 bg-white border border-slate-200"><Label>Filter by class</Label><Select value={filter} onValueChange={setFilter}><SelectTrigger className="mt-2 max-w-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All classes</SelectItem>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Card>}
          {visible.length === 0 ? <Card className="p-10 text-center"><Megaphone className="mx-auto mb-3 h-12 w-12 text-slate-300" /><h2 className="font-semibold text-slate-900">No announcements yet</h2><p className="mt-1 text-sm text-slate-500">Post an announcement to notify students.</p></Card> : <div className="grid gap-4 min-[720px]:grid-cols-2">{visible.map((item) => <Card key={item.id} className="animate-fade-in h-full p-5 bg-white border border-slate-200 shadow-sm"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{item.class_name}</span><h2 className="mt-3 text-lg font-bold text-slate-900">{item.title}</h2></div><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openEdit(item)} aria-label="Edit announcement"><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="ghost" className="text-rose-600" onClick={() => remove(item)} aria-label="Delete announcement"><Trash2 className="h-4 w-4" /></Button></div></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.description}</p><p className="mt-4 text-xs text-slate-400">Posted {new Date(item.created_at).toLocaleString()}</p></Card>)}</div>}
        </>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit announcement' : 'New announcement'}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-4">{!editing && <div><Label>Class</Label><Select value={form.class_id} onValueChange={(value) => setForm({ ...form, class_id: value })}><SelectTrigger className="mt-1"><SelectValue placeholder="Choose class" /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>}<div><Label htmlFor="announcement-title">Title</Label><Input id="announcement-title" className="mt-1" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value.slice(0, 120) })} minLength={3} maxLength={120} required /></div><div><Label htmlFor="announcement-description">Description</Label><Textarea id="announcement-description" className="mt-1 min-h-32" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value.slice(0, 2000) })} minLength={10} maxLength={2000} required /></div><Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800" disabled={saving || !form.class_id || !form.title.trim() || !form.description.trim()}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Post announcement'}</Button></form></DialogContent></Dialog>
    </div>
  );
};
export default Announcements;
