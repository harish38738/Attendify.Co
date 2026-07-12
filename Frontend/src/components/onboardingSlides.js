import React from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Clock3,
  FolderOpen,
  GraduationCap,
  History,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  UserCircle,
  Users,
  Zap,
} from 'lucide-react';

const FeatureBubble = ({ icon: Icon, label, className = '' }) => (
  <div className={`onboarding-feature-bubble ${className}`}>
    <Icon className="h-5 w-5" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

const FloatingCard = ({ icon: Icon, title, detail, tone = 'blue', className = '' }) => (
  <div className={`onboarding-floating-card onboarding-tone-${tone} ${className}`}>
    <span className="onboarding-floating-icon">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <span>
      <span className="block text-sm font-bold text-slate-950">{title}</span>
      <span className="block text-xs text-slate-500">{detail}</span>
    </span>
  </div>
);

const PhoneMockup = ({ children, className = '' }) => (
  <div className={`onboarding-phone-frame ${className}`}>
    <div className="onboarding-phone-speaker" />
    <div className="onboarding-phone-screen">{children}</div>
  </div>
);

const DashboardPreview = () => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-2 w-16 rounded-full bg-slate-300" />
        <div className="mt-2 h-2 w-24 rounded-full bg-slate-200" />
      </div>
      <div className="h-9 w-9 rounded-full bg-blue-100" />
    </div>
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-4 text-white shadow-lg">
      <p className="text-xs text-white/70">Attendance</p>
      <p className="mt-1 text-3xl font-black">92%</p>
      <div className="mt-3 h-2 rounded-full bg-white/25">
        <div className="h-full w-[78%] rounded-full bg-white" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <CalendarDays className="h-4 w-4 text-blue-600" />
        <p className="mt-2 text-xs font-bold">Timetable</p>
      </div>
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <Megaphone className="h-4 w-4 text-rose-500" />
        <p className="mt-2 text-xs font-bold">Updates</p>
      </div>
    </div>
  </div>
);

// Screen 1 Original Illustration
export const StudentHero = () => (
  <div className="onboarding-visual-scene onboarding-student-scene">
    <div className="onboarding-soft-ring" />
    <div className="onboarding-student-figure">
      <div className="onboarding-student-head" />
      <div className="onboarding-student-hair" />
      <div className="onboarding-student-body" />
      <div className="onboarding-student-book" />
    </div>
    <FeatureBubble icon={CalendarCheck} label="Attendance" className="bubble-one" />
    <FeatureBubble icon={CalendarDays} label="Timetable" className="bubble-two" />
    <FeatureBubble icon={FolderOpen} label="Resources" className="bubble-three" />
    <FeatureBubble icon={Megaphone} label="Announcements" className="bubble-four" />
    <FeatureBubble icon={Users} label="Classmates" className="bubble-five" />
  </div>
);

// Screen 2 Original Illustration
export const ImportantVisual = () => (
  <div className="onboarding-visual-scene">
    <PhoneMockup className="onboarding-tilted-phone">
      <div className="space-y-3">
        <FloatingCard icon={BarChart3} title="Attendance Updated" detail="89% this week" tone="green" />
        <FloatingCard icon={BookOpen} title="Academic Update" detail="New class task" tone="blue" />
        <FloatingCard icon={Megaphone} title="Announcement" detail="Lab session at 2 PM" tone="rose" />
        <FloatingCard icon={Clock3} title="Timetable Today" detail="4 classes ready" tone="violet" />
      </div>
    </PhoneMockup>
    <div className="onboarding-alert-badge">
      <Bell className="h-7 w-7 text-amber-500" />
      <span>2</span>
    </div>
  </div>
);

// Screen 3 Original Illustration
export const OnePlaceVisual = () => (
  <div className="onboarding-visual-scene onboarding-connected-scene">
    <svg className="onboarding-connection-lines" viewBox="0 0 420 420" aria-hidden="true">
      <path d="M92 112 C158 76 260 76 326 118" />
      <path d="M78 276 C150 330 270 330 344 270" />
      <path d="M74 198 C150 178 270 178 350 200" />
    </svg>
    <PhoneMockup>
      <DashboardPreview />
    </PhoneMockup>
    <FeatureBubble icon={CalendarCheck} label="Attendance" className="connect-one" />
    <FeatureBubble icon={CalendarDays} label="Timetable" className="connect-two" />
    <FeatureBubble icon={FolderOpen} label="Resources" className="connect-three" />
    <FeatureBubble icon={Users} label="Classmates" className="connect-four" />
    <FeatureBubble icon={Megaphone} label="Announcements" className="connect-five" />
    <FeatureBubble icon={History} label="History" className="connect-six" />
  </div>
);

// Screen 4 Original Illustration
export const ConnectedVisual = () => (
  <div className="onboarding-list-stack">
    <FloatingCard icon={FolderOpen} title="Resources" detail="Notes, PDFs, and study files" tone="blue" />
    <FloatingCard icon={Bell} title="Notifications" detail="Important updates at the right time" tone="rose" className="onboarding-delay-1" />
    <FloatingCard icon={Users} title="Classmates" detail="Know your class community" tone="violet" className="onboarding-delay-2" />
    <FloatingCard icon={UserCircle} title="Profile" detail="Your academic identity in one place" tone="green" className="onboarding-delay-3" />
  </div>
);

// Screen 5 Original Illustration
export const SimplerVisual = () => (
  <div className="onboarding-feature-grid">
    <FloatingCard icon={ShieldCheck} title="Stay Organized" detail="Everything in one place" tone="violet" />
    <FloatingCard icon={BarChart3} title="Track Progress" detail="See your growth every day" tone="green" className="onboarding-delay-1" />
    <FloatingCard icon={Timer} title="Save Time" detail="Focus more, search less" tone="amber" className="onboarding-delay-2" />
    <FloatingCard icon={Target} title="Achieve More" detail="Small steps, big results" tone="blue" className="onboarding-delay-3" />
  </div>
);

// Screen 6 Visual - Existing Portal Image
export const PortalVisual = () => (
  <div className="onboarding-portal-scene">
    <div className="onboarding-portal-image-wrapper">
      <img
        src={`${process.env.PUBLIC_URL}/onboarding/attendify-portal-hero.png`}
        alt="Welcome to Attendify Portal"
        className="onboarding-portal-image"
      />
    </div>
  </div>
);

export const onboardingSlides = [
  {
    id: 'meet-attendify',
    eyebrowIcon: CalendarCheck,
    title: 'Meet Attendify',
    highlight: 'Attendify',
    description: 'Your all-in-one academic companion for attendance, timetable, announcements, and resources.',
    background: 'onboarding-bg-blue',
    accent: 'blue',
    cta: 'Next',
    illustration: StudentHero,
  },
  {
    id: 'important',
    eyebrowIcon: Bell,
    title: "Never Miss What's Important",
    highlight: 'Important',
    description: 'Stay informed with real-time attendance updates, academic announcements, notifications, and your daily timetable.',
    background: 'onboarding-bg-warm',
    accent: 'rose',
    cta: 'Next',
    illustration: ImportantVisual,
  },
  {
    id: 'one-place',
    eyebrowIcon: FolderOpen,
    title: 'Everything You Need. One Place.',
    highlight: 'One Place',
    description: 'From attendance to resources, Attendify keeps your academic life organized in one simple app.',
    background: 'onboarding-bg-lilac',
    accent: 'violet',
    cta: 'Next',
    illustration: OnePlaceVisual,
  },
  {
    id: 'connected',
    eyebrowIcon: Zap,
    title: 'Stay Connected',
    highlight: 'Connected',
    description: 'Access your classmates, learning resources, notifications, and important updates anytime.',
    background: 'onboarding-bg-mint',
    accent: 'green',
    cta: 'Next',
    illustration: ConnectedVisual,
  },
  {
    id: 'simpler',
    eyebrowIcon: ShieldCheck,
    title: 'Designed to Make College Life Simpler',
    highlight: 'Simpler',
    description: 'We bring clarity to your academics so you can focus on what truly matters.',
    background: 'onboarding-bg-soft',
    accent: 'violet',
    cta: 'Next',
    illustration: SimplerVisual,
  },
  {
    id: 'welcome',
    eyebrowIcon: Sparkles,
    title: 'Welcome to Attendify',
    finalTitle: 'Welcome to',
    finalProduct: 'Attendify',
    description: "Let's simplify your college life and help you stay ahead.",
    background: 'onboarding-bg-final',
    accent: 'blue',
    cta: 'Enter Attendify',
    final: true,
    illustration: PortalVisual,
    highlights: [
      { icon: ShieldCheck, title: 'Stay Organized', detail: 'Everything in one place' },
      { icon: Timer, title: 'Save Time', detail: 'Focus on what really matters' },
      { icon: Target, title: 'Stay Ahead', detail: 'Track, learn, and achieve more' },
    ],
  },
];
