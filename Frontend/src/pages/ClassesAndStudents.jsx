import React, { useState } from 'react';
import Classes from './Classes';
import Students from './Students';
import { BookOpen, Users } from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';

const ClassesAndStudents = () => {
  const [activeTab, setActiveTab] = useState('classes');

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header and Tab Switcher */}
      <div className="px-4 py-4 md:px-8 md:py-5 bg-white border-b border-slate-200 flex flex-col min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading tracking-tight">Classes &amp; Students</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage class sections, setup join codes, and control student rosters.</p>
        </div>

        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          aria-label="Classes and students"
          className="shrink-0 min-[560px]:w-[320px]"
          options={[
            { value: 'classes', label: 'Classes', icon: BookOpen, testId: 'classes-tab' },
            { value: 'students', label: 'Students', icon: Users, testId: 'students-tab' },
          ]}
        />
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'classes' ? (
          <div className="p-0">
            <Classes />
          </div>
        ) : (
          <div className="p-0">
            <Students />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassesAndStudents;
