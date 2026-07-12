import React from 'react';

const SegmentedControl = ({ value, onChange, options, className = '', 'aria-label': ariaLabel }) => {
  return (
    <div
      className={`grid w-full grid-cols-2 rounded-lg bg-slate-100 p-1 ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={option.testId}
            onClick={() => onChange(option.value)}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-blue-900 text-white shadow-sm'
                : 'bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            {Icon && <Icon className="h-4 w-4" strokeWidth={1.8} />}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
