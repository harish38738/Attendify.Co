import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { downloadResource, formatFileSize } from '../utils/resourceHelpers';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import LoadingScreen from '../components/LoadingScreen';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  BookOpen,
  ChevronLeft,
  Download,
  Eye,
  FileText,
  LibraryBig,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAnalyticsTrack } from '../utils/analytics';

const StudentResources = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useAnalyticsTrack('resources_viewed');

  useEffect(() => {
    fetchSubjects();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (location.state?.selectedSubject) {
      setSelectedSubject(location.state.selectedSubject);
    }
  }, [location.state]);

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

  const handleDownload = async (resource) => {
    try {
      await downloadResource(resource.id, resource.filename);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download resource');
    }
  };

  const handlePreview = async (resource) => {
    navigate(`/student/resources/${resource.id}`, {
      state: {
        from: '/student/resources',
        selectedSubject,
      },
    });
  };

  if (selectedSubject) {
    return (
      <div className="p-4 md:p-8" data-testid="student-resources-page">
        <div className="mb-6 md:mb-8">
          <button
            type="button"
            onClick={() => { setSelectedSubject(null); setSearch(''); setCategoryFilter('all'); }}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to subjects
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">{selectedSubject.name}</h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">Browse and download study materials</p>
        </div>

        <div className="grid gap-3 mb-6 min-[640px]:grid-cols-[1fr_14rem]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="pl-9 bg-white border-slate-200"
              data-testid="student-resource-search-input"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full bg-white border-slate-200">
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
          <LoadingScreen text="Loading resources..." fullScreen={false} />
        ) : resources.length > 0 ? (
          <Card className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]" data-testid="student-resources-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Category</th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-slate-600 uppercase">Size</th>
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
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {resource.lastUpdated ? format(new Date(resource.lastUpdated), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handlePreview(resource)} title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(resource)} title="Download">
                            <Download className="h-4 w-4" />
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
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Resources Found</h3>
            <p className="text-slate-600">No resources match your filters for this subject</p>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" data-testid="student-resources-subjects-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Resources</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">Browse study materials by subject</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        </div>
      ) : subjects.length > 0 ? (
        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Card key={subject.id} className="h-full p-5 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <button type="button" onClick={() => setSelectedSubject(subject)} className="w-full text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <LibraryBig className="h-5 w-5 text-blue-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{subject.name}</h3>
                </div>
                <p className="text-sm text-slate-500">{subject.resource_count || 0} resource{(subject.resource_count || 0) !== 1 ? 's' : ''}</p>
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
          <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Resources Available</h3>
          <p className="text-slate-600">Study materials will appear here once your admin uploads them</p>
        </Card>
      )}
    </div>
  );
};

export default StudentResources;
