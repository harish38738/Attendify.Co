import React from 'react';
import { BookOpen } from 'lucide-react';

const StudentResources = () => {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-6">
          <BookOpen className="h-10 w-10 text-blue-700" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Resources</h1>
        <p className="text-xl font-semibold text-slate-700 mb-4">Coming Soon</p>
        <p className="text-sm text-slate-500">This feature will be available in a future update.</p>
      </div>
    </div>
  );
};

export default StudentResources;
