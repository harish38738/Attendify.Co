import React, { useState } from 'react';
import Announcements from './Announcements';
import AcademicUpdates from './AcademicUpdates';
import { Megaphone, BookMarked } from 'lucide-react';
import SegmentedControl from '../components/SegmentedControl';

const UpdatesPage = () => {
  const [activeTab, setActiveTab] = useState('announcements');

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header and Tab Switcher */}
      <div className="px-4 py-4 md:px-8 md:py-5 bg-white border-b border-slate-200 flex flex-col min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading tracking-tight">Academic Updates &amp; Notices</h1>
          <p className="text-xs text-slate-500 mt-0.5">Send general announcements, schedule tomorrow's tests, study portions, assignments, or missed class recaps.</p>
        </div>

        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          aria-label="Update types"
          className="shrink-0 min-[560px]:w-[390px]"
          options={[
            { value: 'announcements', label: 'Announcements', icon: Megaphone, testId: 'announcements-tab' },
            { value: 'academic-updates', label: 'Academic Updates', icon: BookMarked, testId: 'academic-updates-tab' },
          ]}
        />
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'announcements' ? (
          <div className="p-0">
            <Announcements />
          </div>
        ) : (
          <div className="p-0">
            <AcademicUpdates />
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdatesPage;
