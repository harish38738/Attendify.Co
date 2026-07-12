import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Trash2, RefreshCw, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

const ClassTrash = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    try {
      const response = await api.get('/api/classes/trash');
      if (response.data.success) {
        setClasses(response.data.data.classes);
      }
    } catch (error) {
      toast.error('Failed to fetch trash');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (classId) => {
    try {
      const response = await api.put(`/api/classes/${classId}/restore`);
      if (response.data.success) {
        toast.success('Class restored');
        fetchTrash();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to restore class');
    }
  };

  const handlePermanentDelete = async (cls) => {
    const input = window.prompt(`This action cannot be undone.\nType the class name "${cls.name}" to confirm deletion.`);
    if (input !== cls.name) {
      if (input !== null) {
        toast.error('Class name did not match. Deletion cancelled.');
      }
      return;
    }

    try {
      const response = await api.delete(`/api/classes/${cls.id}/permanent`);
      if (response.data.success) {
        toast.success('Class permanently deleted');
        fetchTrash();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to permanently delete class');
    }
  };

  return (
    <div className="p-4 md:p-8" data-testid="class-trash-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/classes')} className="text-slate-500 hover:text-slate-900 -ml-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Classes
            </Button>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Trash</h1>
          <p className="mt-2 text-sm md:text-base text-slate-600 font-body">Manage deleted classes</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        </div>
      ) : classes.length === 0 ? (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
          <Trash2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Trash is Empty</h3>
          <p className="text-slate-600">No deleted classes found.</p>
        </Card>
      ) : (
        <div className="grid gap-4 min-[860px]:grid-cols-2">
          {classes.map((cls) => (
            <Card key={cls.id} className="h-full p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col min-[520px]:flex-row min-[520px]:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{cls.name}</h3>
                <p className="text-sm text-slate-500">
                  {cls.department} • {cls.year} • Sec {cls.section}
                </p>
                <div className="mt-2 text-xs text-slate-400">
                  Deleted at: {cls.deleted_at ? new Date(cls.deleted_at).toLocaleString() : 'Unknown'}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleRestore(cls.id)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                  <RefreshCw className="h-4 w-4 mr-1" /> Restore
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePermanentDelete(cls)} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete Forever
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassTrash;
