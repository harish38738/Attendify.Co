import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { downloadResource, previewResource, formatFileSize } from '../utils/resourceHelpers';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  LibraryBig,
  Upload,
  Download,
  Eye,
  RefreshCw,
  Search,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const Resources = () => {
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');

  const [renameSubjectOpen, setRenameSubjectOpen] = useState(false);
  const [renameSubjectName, setRenameSubjectName] = useState('');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadDisplayName, setUploadDisplayName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [renameResourceOpen, setRenameResourceOpen] = useState(false);
  const [renameResourceTarget, setRenameResourceTarget] = useState(null);
  const [renameResourceName, setRenameResourceName] = useState('');

  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    fetchSubjects();
    fetchCategories();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/api/resources/subjects');
      if (res.data.success) setSubjects(res.data.data.subjects || []);
    } catch {
      toast.error('Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/resources/categories');
      if (res.data.success) setCategories(res.data.data.categories || []);
    } catch {
      toast.error('Failed to fetch categories');
    }
  };

  const fetchResources = useCallback(async () => {
    if (!selectedSubject) return;
    setResourcesLoading(true);
    try {
      const params = { subject_id: selectedSubject.id };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/api/resources', { params });
      if (res.data.success) setResources(res.data.data.resources || []);
    } catch {
      toast.error('Failed to fetch resources');
    } finally {
      setResourcesLoading(false);
    }
  }, [selectedSubject, categoryFilter, search]);

  useEffect(() => {
    if (selectedSubject) fetchResources();
  }, [selectedSubject, fetchResources]);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/resources/subjects', { name: subjectName });
      if (res.data.success) {
        toast.success('Subject created');
        setSubjectDialogOpen(false);
        setSubjectName('');
        fetchSubjects();
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Failed to create subject');
    }
  };

  const handleRenameSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/api/resources/subjects/${selectedSubject.id}/rename`, { name: renameSubjectName });
      if (res.data.success) {
        toast.success('Subject renamed');
        setRenameSubjectOpen(false);
        setSelectedSubject({ ...selectedSubject, name: renameSubjectName });
        fetchSubjects();
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Failed to rename subject');
    }
  };

  const handleDeleteSubject = async (subject) => {
    if (!window.confirm(`Delete "${subject.name}" and all its resources? This cannot be undone.`)) return;
    try {
      const res = await api.delete(`/api/resources/subjects/${subject.id}`);
      if (res.data.success) {
        toast.success('Subject deleted');
        if (selectedSubject?.id === subject.id) setSelectedSubject(null);
        fetchSubjects();
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Failed to delete subject');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      if (uploadDisplayName.trim()) formData.append('displayName', uploadDisplayName.trim());
      const res = await api.post(`/api/resources/subjects/${selectedSubject.id}/resources`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('Resource uploaded');
        setUploadOpen(false);
        setUploadCategory('');
        setUploadDisplayName('');
        setUploadFile(null);
        fetchResources();
        fetchSubjects();
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const handleRenameResource = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/api/resources/${renameResourceTarget.id}/rename`, { displayName: renameResourceName });
      if (res.data.success) {
        toast.success('Resource renamed');
        setRenameResourceOpen(false);
        fetchResources();
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Failed to rename resource');
    }
  };

  const handleReplace = async (e) => {
    e.preventDefault();
    if (!replaceFile) {
      toast.error('Please select a file');
      return;
    }
    setReplacing(true);
    try {
      const formData = new FormData();
      formData.append('file', replaceFile);
      const res = await api.put(`/api/resources/${replaceTarget.id}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('Resource replaced');
        setReplaceTarget(null);
        setReplaceFile(null);
        fetchResources();
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Failed to replace resource');
    } finally {
      setReplacing(false);
    }
  };

  const handleDeleteResource = async (resource) => {
    if (!window.confirm(`Delete "${resource.displayName}"?`)) return;
    try {
      const res = await api.delete(`/api/resources/${resource.id}`);
      if (res.data.success) {
        toast.success('Resource deleted');
        fetchResources();
        fetchSubjects();
      } else {
        toast.error(res.data.message);
      }
    } catch {
      toast.error('Failed to delete resource');
    }
  };

  const handleDownload = async (resource) => {
    try {
      await downloadResource(resource.id, resource.filename);
      toast.success('Download started');
      fetchResources();
    } catch {
      toast.error('Failed to download resource');
    }
  };

  const handlePreview = async (resource) => {
    try {
      await previewResource(resource.id);
    } catch {
      toast.error('Failed to preview resource');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto" />
      </div>
    );
  }

  if (selectedSubject) {
    return (
      <div className="p-4 md:p-8" data-testid="admin-resources-page">
        <div className="mb-6 md:mb-8">
          <button
            type="button"
            onClick={() => { setSelectedSubject(null); setSearch(''); setCategoryFilter('all'); }}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to subjects
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">{selectedSubject.name}</h1>
              <p className="mt-2 text-sm md:text-base text-slate-600">Manage resources for this subject</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { setRenameSubjectName(selectedSubject.name); setRenameSubjectOpen(true); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename Subject
              </Button>
              <Button onClick={() => setUploadOpen(true)} data-testid="upload-resource-button">
                <Upload className="h-4 w-4 mr-2" />
                Upload Resource
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="pl-9 bg-white border-slate-200"
              data-testid="resource-search-input"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-56 bg-white border-slate-200">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {resourcesLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
          </div>
        ) : resources.length > 0 ? (
          <Card className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="resources-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Category</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Size</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Downloads</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Updated</th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr key={resource.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{resource.displayName}</p>
                            <p className="text-xs text-slate-500">{resource.filename}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{resource.category}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{formatFileSize(resource.fileSize)}</td>
                      <td className="py-3 px-4 text-sm text-slate-700">{resource.downloadCount}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {resource.lastUpdated ? format(new Date(resource.lastUpdated), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {resource.previewable && (
                            <Button variant="ghost" size="icon" onClick={() => handlePreview(resource)} title="Preview">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(resource)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setRenameResourceTarget(resource); setRenameResourceName(resource.displayName); setRenameResourceOpen(true); }} title="Rename">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setReplaceTarget(resource); setReplaceFile(null); }} title="Replace file">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteResource(resource)} title="Delete" className="text-rose-600 hover:text-rose-700">
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
          <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Resources</h3>
            <p className="text-slate-600 mb-4">Upload your first resource for this subject</p>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Resource
            </Button>
          </Card>
        )}

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Resource</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="upload-category">Category</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory} required>
                  <SelectTrigger id="upload-category" className="mt-2">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="upload-display-name">Display Name (optional)</Label>
                <Input id="upload-display-name" value={uploadDisplayName} onChange={(e) => setUploadDisplayName(e.target.value)} placeholder="Defaults to filename" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="upload-file">File</Label>
                <Input id="upload-file" type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} required className="mt-2" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip" />
              </div>
              <Button type="submit" disabled={uploading || !uploadCategory} className="w-full">
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={renameSubjectOpen} onOpenChange={setRenameSubjectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Subject</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRenameSubject} className="space-y-4">
              <div>
                <Label htmlFor="rename-subject">Subject Name</Label>
                <Input id="rename-subject" value={renameSubjectName} onChange={(e) => setRenameSubjectName(e.target.value)} required className="mt-2" />
              </div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={renameResourceOpen} onOpenChange={setRenameResourceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Resource</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRenameResource} className="space-y-4">
              <div>
                <Label htmlFor="rename-resource">Display Name</Label>
                <Input id="rename-resource" value={renameResourceName} onChange={(e) => setRenameResourceName(e.target.value)} required className="mt-2" />
              </div>
              <Button type="submit" className="w-full">Save</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!replaceTarget} onOpenChange={(open) => { if (!open) { setReplaceTarget(null); setReplaceFile(null); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Replace File</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleReplace} className="space-y-4">
              <p className="text-sm text-slate-600">Replace file for &quot;{replaceTarget?.displayName}&quot;</p>
              <div>
                <Label htmlFor="replace-file">New File</Label>
                <Input id="replace-file" type="file" onChange={(e) => setReplaceFile(e.target.files?.[0] || null)} required className="mt-2" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip" />
              </div>
              <Button type="submit" disabled={replacing} className="w-full">
                {replacing ? 'Replacing...' : 'Replace File'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" data-testid="admin-resources-subjects-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Resources</h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">Manage subjects and study materials</p>
        </div>
        <Button onClick={() => setSubjectDialogOpen(true)} data-testid="create-subject-button">
          <Plus className="h-4 w-4 mr-2" />
          Add Subject
        </Button>
      </div>

      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Card key={subject.id} className="p-5 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => setSelectedSubject(subject)} className="flex-1 text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <LibraryBig className="h-5 w-5 text-blue-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{subject.name}</h3>
                  </div>
                  <p className="text-sm text-slate-500">{subject.resource_count || 0} resource{(subject.resource_count || 0) !== 1 ? 's' : ''}</p>
                </button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteSubject(subject)} className="text-rose-600 hover:text-rose-700 flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
          <LibraryBig className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Subjects Yet</h3>
          <p className="text-slate-600 mb-4">Create a subject to start uploading resources</p>
          <Button onClick={() => setSubjectDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </Card>
      )}

      <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div>
              <Label htmlFor="subject-name">Subject Name</Label>
              <Input id="subject-name" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required placeholder="e.g., Data Structures" className="mt-2" data-testid="subject-name-input" />
            </div>
            <Button type="submit" className="w-full">Create Subject</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Resources;
