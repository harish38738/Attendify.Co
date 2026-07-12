import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import TimetableViewer from '../components/TimetableViewer';
import { AlertTriangle, Clock3, Eye, History, ImagePlus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const formatDate = (value) => value ? new Date(value).toLocaleString() : '-';
const imageUrl = (timetable) => timetable ? (api.defaults.baseURL || '') + timetable.image_url + '?v=' + timetable.version : '';

const Timetable = () => {
  const [items, setItems] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [history, setHistory] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [dayOrder, setDayOrder] = useState(null);

  const selected = useMemo(() => items.find((item) => item.class.id === selectedClassId), [items, selectedClassId]);

  const fetchTimetables = async (keepClass = selectedClassId) => {
    try {
      const response = await api.get('/api/timetables');
      if (response.data.success) {
        const nextItems = response.data.data.items || [];
        setDayOrder(response.data.data.day_order || null);
        setItems(nextItems);
        if (keepClass && nextItems.some((item) => item.class.id === keepClass)) setSelectedClassId(keepClass);
        else if (nextItems.length) setSelectedClassId(nextItems[0].class.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Unable to load timetables');
    } finally { setLoading(false); }
  };

  const fetchHistory = async (classId) => {
    if (!classId) return setHistory([]);
    try {
      const response = await api.get('/api/timetables/' + classId + '/history');
      if (response.data.success) setHistory(response.data.data.history || []);
    } catch { toast.error('Unable to load timetable history'); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTimetables(''); }, []);
  useEffect(() => { fetchHistory(selectedClassId); setFile(null); setPreview(''); }, [selectedClassId]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const chooseFile = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  };

  const saveTimetable = async () => {
    if (!selectedClassId || !file) return toast.error('Choose a timetable image first');
    setSaving(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post('/api/timetables/' + selectedClassId, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.success) {
        toast.success(selected?.timetable ? 'Timetable replaced' : 'Timetable uploaded');
        setFile(null); setPreview('');
        await fetchTimetables(selectedClassId); await fetchHistory(selectedClassId);
      }
    } catch (error) { toast.error(error.response?.data?.detail || 'Unable to save timetable'); }
    finally { setSaving(false); }
  };

  const deleteTimetable = async () => {
    if (!window.confirm('Delete the timetable for this class?')) return;
    try {
      await api.delete('/api/timetables/' + selectedClassId);
      toast.success('Timetable deleted');
      await fetchTimetables(selectedClassId); await fetchHistory(selectedClassId);
    } catch (error) { toast.error(error.response?.data?.detail || 'Unable to delete timetable'); }
  };

  return (
    <div className="p-4 md:p-8" data-testid="timetable-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Timetable</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">Upload the official timetable image for each class.</p>
      </div>
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center"><Clock3 className="mx-auto mb-3 h-12 w-12 text-slate-300" /><p className="font-semibold text-slate-900">Create a class before uploading a timetable.</p></Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-4 md:p-6 bg-white border border-slate-200 shadow-sm">
            {dayOrder?.day_order ? (
              <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                Today's Day Order: Day {dayOrder.day_order}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Select today's Day Order from the Dashboard before relying on timetable information.</span>
              </div>
            )}
          </Card>
          <Card className="p-4 md:p-6 bg-white border border-slate-200 shadow-sm">
            <Label>Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="mt-2 max-w-md"><SelectValue placeholder="Select a class" /></SelectTrigger>
              <SelectContent>{items.map((item) => <SelectItem key={item.class.id} value={item.class.id}>{item.class.name} ({item.class.code})</SelectItem>)}</SelectContent>
            </Select>
          </Card>
          <div className="grid gap-4 min-[760px]:grid-cols-2 md:gap-6">
            <Card className="h-full p-4 md:p-6 bg-white border border-slate-200 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold text-slate-900">Current timetable</h2>{selected?.timetable && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Version {selected.timetable.version}</span>}</div>
              {selected?.timetable ? (
                <>
                  <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50"><img src={imageUrl(selected.timetable)} alt="Current timetable" className="h-64 w-full object-contain" /></div>
                  <dl className="mb-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><div><dt className="font-medium text-slate-900">Uploaded</dt><dd>{formatDate(selected.timetable.uploaded_at)}</dd></div><div><dt className="font-medium text-slate-900">Updated</dt><dd>{formatDate(selected.timetable.updated_at)}</dd></div></dl>
                  <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setViewerOpen(true)}><Eye className="mr-2 h-4 w-4" />View</Button><Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={deleteTimetable}><Trash2 className="mr-2 h-4 w-4" />Delete</Button></div>
                </>
              ) : <div className="py-14 text-center"><Clock3 className="mx-auto mb-3 h-12 w-12 text-slate-300" /><p className="font-medium text-slate-700">No timetable uploaded yet.</p></div>}
            </Card>
            <Card className="h-full p-4 md:p-6 bg-white border border-slate-200 shadow-sm">
              <h2 className="mb-4 font-bold text-slate-900">{selected?.timetable ? 'Replace timetable' : 'Upload timetable'}</h2>
              <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:border-blue-400">
                {preview ? <img src={preview} alt="Timetable preview" className="max-h-56 w-full object-contain" /> : <><ImagePlus className="mb-3 h-10 w-10 text-slate-400" /><span className="font-medium text-slate-700">Choose an image to preview</span><span className="mt-1 text-xs text-slate-500">JPG, JPEG, PNG or WEBP, up to 10 MB</span></>}
                <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={chooseFile} />
              </label>
              {file && <p className="mt-3 truncate text-sm text-slate-600">Selected: {file.name}</p>}
              <Button className="mt-4 w-full bg-blue-900 hover:bg-blue-800" disabled={!file || saving} onClick={saveTimetable}><Upload className="mr-2 h-4 w-4" />{saving ? 'Saving...' : selected?.timetable ? 'Replace timetable' : 'Upload timetable'}</Button>
            </Card>
          </div>
          <Card className="bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 p-4 md:p-6"><History className="h-5 w-5 text-slate-600" /><h2 className="font-bold text-slate-900">Timetable history</h2></div>
            {history.length === 0 ? <p className="p-6 text-sm text-slate-500">No timetable history yet.</p> : <div className="divide-y divide-slate-100">{history.map((entry) => <div key={entry.history_id} className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"><div><span className="font-semibold capitalize text-slate-900">{entry.action_type}</span><p className="text-slate-500">{entry.previous_file || 'None'} -> {entry.current_file || 'Deleted'}</p></div><div className="text-slate-500 sm:text-right"><p>Version {entry.version}</p><p>{formatDate(entry.performed_at)}</p></div></div>)}</div>}
          </Card>
        </div>
      )}
      {selected?.timetable && <TimetableViewer open={viewerOpen} onOpenChange={setViewerOpen} imageUrl={imageUrl(selected.timetable)} title={selected.class.name + ' timetable'} />}
    </div>
  );
};

export default Timetable;
