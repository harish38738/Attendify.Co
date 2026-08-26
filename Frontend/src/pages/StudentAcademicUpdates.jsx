import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { downloadResource } from '../utils/resourceHelpers';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  BookOpen, 
  Calendar, 
  FileText, 
  Download, 
  Eye,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Backpack,
  Clock,
  Compass
} from 'lucide-react';
import { toast } from 'sonner';
import { useAnalyticsTrack } from '../utils/analytics';

const StudentAcademicUpdates = () => {
  const navigate = useNavigate();
  const [sections, setSections] = useState({
    tomorrows_tests: [],
    what_to_study: [],
    pending_work: [],
    faculty_instructions: [],
    missed_while_absent: []
  });
  const [loading, setLoading] = useState(true);

  useAnalyticsTrack('announcements_viewed');

  const fetchUpdates = async () => {
    try {
      const res = await api.get('/api/student/academic-updates');
      if (res.data.success) {
        setSections(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch academic updates');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleDownload = async (resourceId, filename) => {
    try {
      await downloadResource(resourceId, filename);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download resource');
    }
  };

  const handlePreview = async (resourceId) => {
    navigate(`/student/resources/${resourceId}`, {
      state: {
        from: '/student/academic-updates',
      },
    });
  };

  const hasAnyUpdates = Object.values(sections).some(arr => arr.length > 0);

  const formatDue = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="p-4 md:p-8" data-testid="student-academic-updates-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading tracking-tight">Academic Updates</h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">Your personalized academic dashboard highlighting what's coming, pending tasks, study material, and missed classes.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900"></div>
        </div>
      ) : !hasAnyUpdates ? (
        <Card className="p-8 md:p-12 text-center bg-white border border-slate-200 rounded-lg shadow-sm max-w-2xl mx-auto mt-8">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
          <h2 className="text-2xl font-bold text-slate-900">All Caught Up!</h2>
          <p className="mt-3 text-sm text-slate-500">There are no academic updates, upcoming tests, or pending tasks for your class at the moment. Keep checkin' back later!</p>
        </Card>
      ) : (
        <div className="space-y-8 md:space-y-10">
          
          {/* Section: Tomorrow's Tests */}
          {sections.tomorrows_tests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2 pb-2 border-b border-rose-200">
                <span className="p-1.5 rounded-md bg-rose-100 text-rose-700">📝</span>
                Tomorrow's Tests &amp; Exams
              </h2>
              <div className="grid gap-4 min-[720px]:grid-cols-2">
                {sections.tomorrows_tests.map((item) => (
                  <Card key={item.id} className="h-full p-5 bg-white border-l-4 border-l-rose-500 border-y border-r border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">{item.subject}</span>
                        {item.due_date && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1 bg-slate-100 text-slate-700`}>
                            <Calendar className="h-3.5 w-3.5" /> {formatDue(item.due_date)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    </div>

                    {/* Resources */}
                    {item.resolved_resources && item.resolved_resources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Attached portions / files:
                        </span>
                        <div className="space-y-1.5">
                          {item.resolved_resources.map((file) => (
                            <div key={file.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded border border-slate-100 text-xs">
                              <span className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                              <div className="flex gap-1 shrink-0">
                                <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlePreview(file.id)} title="Preview">
                                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                                </Button>
                                <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(file.id, file.name)} title="Download">
                                  <Download className="h-3.5 w-3.5 text-slate-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Section: What To Study */}
          {sections.what_to_study.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2 pb-2 border-b border-emerald-200">
                <span className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 font-heading">📖</span>
                What To Study
              </h2>
              <div className="grid gap-4 min-[720px]:grid-cols-2">
                {sections.what_to_study.map((item) => (
                  <Card key={item.id} className="h-full p-5 bg-white border-l-4 border-l-emerald-500 border-y border-r border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{item.subject}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    </div>

                    {item.resolved_resources && item.resolved_resources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Associated files to read:
                        </span>
                        <div className="space-y-1.5">
                          {item.resolved_resources.map((file) => (
                            <div key={file.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded border border-slate-100 text-xs">
                              <span className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                              <div className="flex gap-1 shrink-0">
                                <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlePreview(file.id)} title="Preview">
                                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                                </Button>
                                <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(file.id, file.name)} title="Download">
                                  <Download className="h-3.5 w-3.5 text-slate-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Section: Pending Work */}
          {sections.pending_work.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2 pb-2 border-b border-blue-200">
                <span className="p-1.5 rounded-md bg-blue-100 text-blue-700">📋</span>
                Pending Work &amp; Submissions
              </h2>
              <div className="grid gap-4 min-[720px]:grid-cols-2">
                {sections.pending_work.map((item) => {
                  const overdue = isOverdue(item.due_date);
                  return (
                    <Card key={item.id} className="h-full p-5 bg-white border-l-4 border-l-blue-500 border-y border-r border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{item.subject}</span>
                          {item.due_date && (
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1 ${
                              overdue ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              <Clock className="h-3.5 w-3.5" /> Due: {formatDue(item.due_date)} {overdue && '(Overdue)'}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mt-2">{item.title}</h3>
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                      </div>

                      {item.resolved_resources && item.resolved_resources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" /> Submission references:
                          </span>
                          <div className="space-y-1.5">
                            {item.resolved_resources.map((file) => (
                              <div key={file.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded border border-slate-100 text-xs">
                                <span className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                                <div className="flex gap-1 shrink-0">
                                  <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlePreview(file.id)} title="Preview">
                                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                                  </Button>
                                  <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(file.id, file.name)} title="Download">
                                    <Download className="h-3.5 w-3.5 text-slate-500" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Faculty Instructions */}
          {sections.faculty_instructions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2 pb-2 border-b border-sky-200">
                <span className="p-1.5 rounded-md bg-sky-100 text-sky-700">📌</span>
                Faculty Instructions &amp; Requirements
              </h2>
              <div className="grid gap-4 min-[720px]:grid-cols-2">
                {sections.faculty_instructions.map((item) => (
                  <Card key={item.id} className="h-full p-5 bg-white border-l-4 border-l-sky-500 border-y border-r border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">{item.subject}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    </div>

                    {item.resolved_resources && item.resolved_resources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Attached files:
                        </span>
                        <div className="space-y-1.5">
                          {item.resolved_resources.map((file) => (
                            <div key={file.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded border border-slate-100 text-xs">
                              <span className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                              <div className="flex gap-1 shrink-0">
                                <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlePreview(file.id)} title="Preview">
                                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                                </Button>
                                <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(file.id, file.name)} title="Download">
                                  <Download className="h-3.5 w-3.5 text-slate-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Section: Missed While Absent */}
          {sections.missed_while_absent.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2 pb-2 border-b border-purple-200">
                <span className="p-1.5 rounded-md bg-purple-100 text-purple-700">🔄</span>
                Missed While Absent
              </h2>
              <div className="grid gap-4 min-[720px]:grid-cols-2">
                {sections.missed_while_absent.map((item) => (
                  <Card key={item.id} className="h-full p-5 bg-white border-l-4 border-l-purple-500 border-y border-r border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">{item.subject}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    </div>

                    {item.resolved_resources && item.resolved_resources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Shared materials / homework:
                        </span>
                        <div className="space-y-1.5">
                          {item.resolved_resources.map((file) => (
                            <div key={file.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded border border-slate-100 text-xs">
                              <span className="font-medium text-slate-700 truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                              <div className="flex gap-1 shrink-0">
                                <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlePreview(file.id)} title="Preview">
                                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                                </Button>
                                <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(file.id, file.name)} title="Download">
                                  <Download className="h-3.5 w-3.5 text-slate-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default StudentAcademicUpdates;
