import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Download,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import api from '../utils/api';
import { downloadResource, formatFileSize, getResourcePreviewUrl } from '../utils/resourceHelpers';
import { getResourceViewerType } from '../utils/resourceConfig';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import LoadingScreen from '../components/LoadingScreen';
import { toast } from 'sonner';

const metadataRows = (resource) => [
  ['Filename', resource.filename],
  ['File size', formatFileSize(resource.fileSize)],
  ['Uploaded by', resource.uploadedBy || 'Unknown'],
  ['Upload date', resource.uploadedAt ? format(new Date(resource.uploadedAt), 'MMM d, yyyy') : 'Unknown'],
  ['Subject', resource.subjectName || 'Unknown'],
  ['Category', resource.category || 'Unknown'],
];

const ResourceViewer = ({ audience = 'admin' }) => {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const backPath = audience === 'student' ? '/student/resources' : '/resources';
  const previewUrl = useMemo(() => (resource ? getResourcePreviewUrl(resource.id) : ''), [resource]);
  const viewerType = getResourceViewerType(resource);

  useEffect(() => {
    const fetchResource = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/resources/${resourceId}`);
        if (res.data.success) {
          setResource(res.data.data.resource);
        } else {
          setError(res.data.message || 'Resource could not be loaded');
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Resource could not be loaded');
      } finally {
        setLoading(false);
      }
    };

    fetchResource();
  }, [resourceId]);

  const handleBack = () => {
    navigate(location.state?.from || backPath, {
      state: {
        selectedSubject: location.state?.selectedSubject,
        selectedSubjectId: location.state?.selectedSubject?.id || location.state?.selectedSubjectId,
      },
    });
  };

  const handleDownload = async () => {
    if (!resource) return;
    setDownloading(true);
    try {
      await downloadResource(resource.id, resource.filename);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download resource');
    } finally {
      setDownloading(false);
    }
  };

  const renderPreview = () => {
    if (viewerType === 'pdf') {
      return (
        <iframe
          title={resource.displayName}
          src={previewUrl}
          className="h-[70vh] min-h-[420px] w-full rounded-lg border border-slate-200 bg-white"
        />
      );
    }

    if (viewerType === 'image') {
      return (
        <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3">
          <img src={previewUrl} alt={resource.displayName} className="max-h-[70vh] max-w-full rounded-md object-contain" />
        </div>
      );
    }

    if (viewerType === 'text') {
      return (
        <iframe
          title={resource.displayName}
          src={previewUrl}
          className="h-[65vh] min-h-[360px] w-full rounded-lg border border-slate-200 bg-white"
        />
      );
    }

    return (
      <Card className="p-6 md:p-8 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100">
          <FileArchive className="h-7 w-7 text-slate-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Preview is not available for this file</h2>
        <p className="mt-2 text-sm text-slate-600">You can still review the file details and download it from Attendify.</p>
      </Card>
    );
  };

  if (loading) {
    return <LoadingScreen text="Loading resource..." fullScreen={false} />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <button type="button" onClick={handleBack} className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Resources
        </button>
        <Card className="p-8 text-center bg-white border border-slate-200 rounded-lg shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Resource unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" data-testid="resource-viewer-page">
      <div className="mb-5 flex flex-col gap-4 md:mb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <button type="button" onClick={handleBack} className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </button>
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              {viewerType === 'image' ? <ImageIcon className="h-5 w-5 text-blue-700" /> : <FileText className="h-5 w-5 text-blue-700" />}
            </div>
            <div>
              <h1 className="break-words text-2xl font-bold text-slate-900 font-heading tracking-tight md:text-3xl">{resource.displayName}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Uploaded by {resource.uploadedBy || 'Unknown'} on {resource.uploadedAt ? format(new Date(resource.uploadedAt), 'MMM d, yyyy') : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
        <Button onClick={handleDownload} disabled={downloading} className="w-full md:w-auto">
          {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download
        </Button>
      </div>

      <div className="grid gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">{renderPreview()}</div>
        <Card className="h-fit bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">File details</h2>
          <dl className="space-y-3">
            {metadataRows(resource).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase text-slate-400">{label}</dt>
                <dd className="mt-0.5 break-words text-sm text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
};

export default ResourceViewer;
