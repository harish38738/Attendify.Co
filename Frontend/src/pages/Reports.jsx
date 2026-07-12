import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const REPORT_TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'problem', label: 'Problem' },
  { value: 'suggestion', label: 'Suggestion' },
];

const STATUS_OPTIONS = ['open', 'reviewing', 'resolved'];

const formatLabel = (value) => value.replace(/_/g, ' ');

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const query = typeFilter === 'all' ? '' : `?type=${typeFilter}`;
      const response = await api.get(`/api/reports${query}`);
      if (response.data.success) {
        setReports(response.data.data.reports || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateStatus = async (reportId, status) => {
    setUpdatingId(reportId);
    try {
      const response = await api.put(`/api/reports/${reportId}/status`, { status });
      if (response.data.success) {
        setReports((prev) => prev.map((report) => (
          report.report_id === reportId ? { ...report, status } : report
        )));
        toast.success('Status updated');
      } else {
        toast.error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className="p-4 md:p-8" data-testid="reports-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Reports</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">Review issue reports and update their status.</p>
      </div>

      <Card className="mb-6 bg-white border border-slate-200 shadow-sm p-4">
        <Label htmlFor="report-filter" className="text-slate-700 font-medium">Filter by type</Label>
        <select
          id="report-filter"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="mt-2 h-10 w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
        >
          {REPORT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 bg-white border border-slate-200 shadow-sm">
          No reports found.
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.report_id} className="bg-white border border-slate-200 shadow-sm p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 capitalize">
                      {formatLabel(report.type)}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 capitalize">
                      {report.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{report.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{report.description}</p>
                  <div className="mt-4 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                    <p>User: {report.user_name}</p>
                    <p>Role: {report.user_role}</p>
                    <p>Page: {report.page || 'Not specified'}</p>
                    <p>Time: {new Date(report.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  <Label htmlFor={`status-${report.report_id}`} className="text-xs text-slate-600">Status</Label>
                  <select
                    id={`status-${report.report_id}`}
                    value={report.status}
                    disabled={updatingId === report.report_id}
                    onChange={(e) => updateStatus(report.report_id, e.target.value)}
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 lg:w-40"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;
