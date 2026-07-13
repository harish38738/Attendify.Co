import React from 'react';

const LoadingScreen = ({ fullScreen = false, text = "Loading..." }) => {
  const containerClasses = fullScreen 
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900"
    : "flex flex-col items-center justify-center w-full min-h-[60vh] bg-transparent px-4 text-center";

  const textClasses = fullScreen ? "text-white" : "text-slate-900";
  const subTextClasses = fullScreen ? "text-slate-400" : "text-slate-500";
  const spinnerTrackClasses = fullScreen ? "border-slate-700" : "border-slate-200";
  const spinnerHighlightClasses = "border-transparent border-t-blue-600";

  return (
    <div
      className={containerClasses}
      data-testid="loading-screen"
    >
      {/* Subtle radial glow only for full screen */}
      {fullScreen && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15)_0%,_transparent_70%)]" />
      )}

      <div className="relative z-10 flex flex-col items-center gap-5 animate-fade-in">
        {/* Logo */}
        <img
          src={`${process.env.PUBLIC_URL}/attendify-logo.png`}
          alt="Attendify logo"
          className={`${fullScreen ? 'h-20 w-20 shadow-lg shadow-blue-600/30' : 'h-14 w-14 shadow-sm'} object-contain`}
        />

        {/* App Name */}
        {fullScreen && (
          <h1 className={`text-3xl font-bold ${textClasses} tracking-tight`}>
            Attendify
          </h1>
        )}

        <div className="flex flex-col items-center gap-3">
          {/* Spinner */}
          <div className={`${fullScreen ? 'w-10 h-10' : 'w-8 h-8'} relative`}>
            <div className={`absolute inset-0 rounded-full border-[3px] ${spinnerTrackClasses}`} />
            <div className={`absolute inset-0 rounded-full border-[3px] ${spinnerHighlightClasses} animate-spin`} />
          </div>

          {/* Loading text */}
          <p className={`max-w-xs text-sm ${subTextClasses} tracking-wide font-medium`}>{text}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
