import React from 'react';

const InlineLoader = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center py-10">
    <div className="inline-flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-900" />
      <span>{text}</span>
    </div>
  </div>
);

export default InlineLoader;
