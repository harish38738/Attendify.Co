import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

const REPORT_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'problem', label: 'Problem' },
  { value: 'suggestion', label: 'Suggestion' },
];

const ReportIssue = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'bug',
    page: window.location.pathname,
    title: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  if (user?.role === 'super_admin') {
    return <Navigate to="/reports" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/api/reports', formData);
      if (response.data.success) {
        toast.success('Report submitted');
        setFormData({
          type: 'bug',
          page: window.location.pathname,
          title: '',
          description: '',
        });
      } else {
        toast.error(response.data.message || 'Failed to submit report');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8" data-testid="report-issue-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Report Issue</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">Send a bug, problem, feature request, or suggestion.</p>
      </div>

      <Card className="max-w-2xl bg-white border border-slate-200 shadow-sm p-5 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="report-type" className="text-slate-700 font-medium">Type</Label>
            <select
              id="report-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
            >
              {REPORT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="report-page" className="text-slate-700 font-medium">Page</Label>
            <Input
              id="report-page"
              value={formData.page}
              onChange={(e) => setFormData({ ...formData, page: e.target.value })}
              className="mt-2 bg-white border-slate-200"
              placeholder="/student/dashboard"
            />
          </div>

          <div>
            <Label htmlFor="report-title" className="text-slate-700 font-medium">Title</Label>
            <Input
              id="report-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-2 bg-white border-slate-200"
              maxLength={120}
              required
            />
          </div>

          <div>
            <Label htmlFor="report-description" className="text-slate-700 font-medium">Description</Label>
            <Textarea
              id="report-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-2 min-h-36 bg-white border-slate-200"
              maxLength={2000}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ReportIssue;
