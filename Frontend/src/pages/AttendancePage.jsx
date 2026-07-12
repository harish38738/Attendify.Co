import React, { useState } from 'react';
import AttendanceMarking from './AttendanceMarking';
import AttendanceReport from './AttendanceReport';
import { CalendarCheck, BarChart3 } from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';

const AttendancePage = () => {
  const [activeTab, setActiveTab] = useState('marking');

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header and Tab Switcher */}
      <div className="px-4 py-4 md:px-8 md:py-5 bg-white border-b border-slate-200 flex flex-col min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading tracking-tight">Attendance</h1>
          <p className="text-xs text-slate-500 mt-0.5">Mark or edit period attendance, review classroom metrics, and export reports.</p>
        </div>

        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          aria-label="Attendance views"
          className="shrink-0 min-[560px]:w-[360px]"
          options={[
            { value: 'marking', label: 'Mark Attendance', icon: CalendarCheck, testId: 'mark-attendance-tab' },
            { value: 'reports', label: 'Reports', icon: BarChart3, testId: 'reports-tab' },
          ]}
        />
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'marking' ? (
          <div className="p-0">
            <AttendanceMarking />
          </div>
        ) : (
          <div className="p-0">
            <AttendanceReport />
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
