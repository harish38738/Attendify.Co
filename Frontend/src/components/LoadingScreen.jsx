import React from 'react';
import { GraduationCap } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-slate-900"
      data-testid="loading-screen"
    >
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15)_0%,_transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30">
          <GraduationCap className="h-11 w-11 text-white" strokeWidth={1.8} />
        </div>

        {/* App Name */}
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Attendify
        </h1>

        {/* Spinner */}
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-700" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-500 animate-spin" />
        </div>

        {/* Loading text */}
        <p className="text-sm text-slate-400 tracking-wide">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
