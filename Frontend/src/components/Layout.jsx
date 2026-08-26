import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CalendarCheck,
  LogOut,
  Menu,
  X,
  History,
  Bell,
  LibraryBig,
  Clock3,
  Megaphone,
  User,
  BookMarked,
  BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'super_admin'] },
    { name: 'Classes & Students', href: '/classes-students', icon: Users, roles: ['admin', 'super_admin'] },
    { name: 'Attendance', href: '/attendance', icon: CalendarCheck, roles: ['admin', 'super_admin'] },
    { name: 'Resources', href: '/resources', icon: LibraryBig, roles: ['admin', 'super_admin'] },
    { name: 'Timetable', href: '/timetable', icon: Clock3, roles: ['admin', 'super_admin'] },
    { name: 'Updates', href: '/updates', icon: Megaphone, roles: ['admin', 'super_admin'] },
    { name: 'Analytics', href: '/analytics', icon: BarChart2, roles: ['super_admin'] },
  ];

  const studentNavigation = [
    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Classmates', href: '/student/classmates', icon: Users },
    { name: 'Resources', href: '/student/resources', icon: BookOpen },
    { name: 'Attendance History', href: '/student/history', icon: History },
    { name: 'Academic Updates', href: '/student/academic-updates', icon: BookMarked },
    { name: 'Profile', href: '/student/profile', icon: User },
  ];

  const navItems = user?.role === 'student'
    ? studentNavigation
    : navigation.filter((item) => item.roles.includes(user?.role));

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/student/notifications');
      if (response.data.success) {
        setNotifications(response.data.data.notifications || []);
        setUnreadCount(response.data.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const markNotificationRead = async (notification) => {
    if (notification.read) {
      if (notification.link) navigate(notification.link);
      return;
    }
    try {
      await api.put(`/api/student/notifications/${notification.id}/read`);
      setNotifications((prev) => prev.map((note) => (
        note.id === notification.id ? { ...note, read: true } : note
      )));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
      if (notification.link) {
        navigate(notification.link);
      }
    } catch (error) {
      toast.error('Unable to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/api/student/notifications/read-all');
      setNotifications((prev) => prev.map((note) => ({ ...note, read: true })));
      setUnreadCount(0);
    } catch (error) {
      toast.error('Unable to mark all notifications as read');
    }
  };

  const handleNavClick = (href) => {
    setMobileMenuOpen(false);
    navigate(href);
  };

  useEffect(() => {
    if (user?.role !== 'student') {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }
    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 30000);
    const refresh = () => fetchNotifications();
    window.addEventListener('attendify:notifications-changed', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('attendify:notifications-changed', refresh); };
  }, [user]);

  return (
    <div className="flex h-screen min-w-0 bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:h-screen md:w-64 bg-slate-900 text-white flex-col overflow-hidden" data-testid="sidebar">
        {/* Logo */}
        <div className="shrink-0 flex flex-col px-6 py-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src={`${process.env.PUBLIC_URL}/attendify-logo.png`}
              alt="Attendify logo"
              className="h-12 w-12 shrink-0 object-contain"
            />
            <div className="flex min-w-0 flex-col justify-center">
              <span className="text-xl font-bold font-heading leading-tight">Attendify</span>
              <p className="text-xs text-slate-400 leading-tight">by HRK Technologies</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                className={`flex min-h-[44px] items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-800/50 text-white border-r-4 border-blue-400 translate-x-1'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900">
          <div
            onClick={() => navigate(isAdmin ? '/profile' : '/student/profile')}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700/50 cursor-pointer rounded-md mb-2 transition-colors duration-200 flex min-h-[44px] items-center gap-3"
            title="View Profile"
            data-testid="profile-card"
          >
            {isAdmin ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-base shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'A')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              </>
            ) : (
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || user?.roll_number}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex min-h-[44px] items-center gap-3 px-4 py-3 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out overflow-hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Close Button */}
        <div className="shrink-0 flex items-center justify-between px-6 py-6 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <img
                src={`${process.env.PUBLIC_URL}/attendify-logo.png`}
                alt="Attendify logo"
                className="h-12 w-12 shrink-0 object-contain"
              />
              <div className="flex min-w-0 flex-col justify-center">
                <span className="text-xl font-bold font-heading leading-tight">Attendify</span>
                <p className="text-xs text-slate-400 leading-tight">by HRK Technologies</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-slate-800 transition-colors"
            data-testid="mobile-menu-close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.href)}
                data-testid={`mobile-nav-${item.name.toLowerCase().replace(' ', '-')}`}
                className={`flex min-h-[44px] items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full text-left ${
                  isActive
                    ? 'bg-blue-800/50 text-white border-r-4 border-blue-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile User Info & Logout */}
        <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-900">
          <div
            onClick={() => navigate(isAdmin ? '/profile' : '/student/profile')}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700/50 cursor-pointer rounded-md mb-2 transition-colors duration-200 flex min-h-[44px] items-center gap-3"
            title="View Profile"
            data-testid="mobile-profile-card"
          >
            {isAdmin ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-base shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'A')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              </>
            ) : (
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || user?.roll_number}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            data-testid="mobile-logout-button"
            className="flex min-h-[44px] items-center gap-3 px-4 py-3 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
            data-testid="mobile-menu-button"
          >
            <Menu className="h-6 w-6 text-slate-700" />
          </button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <img
                src={`${process.env.PUBLIC_URL}/attendify-logo.png`}
                alt="Attendify logo"
                className="h-8 w-8 shrink-0 object-contain"
              />
              <span className="text-lg font-bold font-heading leading-tight text-slate-900">Attendify</span>
            </div>
            <p className="mt-1.5 text-[10px] leading-tight text-slate-500">by HRK Technologies</p>
          </div>
          {user?.role === 'student' ? (
            <button
              onClick={() => navigate('/student/notifications')}
              aria-label="Open notifications"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
              data-testid="mobile-notifications-button"
            >
              <Bell className="h-6 w-6 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          ) : (
            <div className="w-10" />
          )}
        </header>



        {/* Student notification bar */}
        {user?.role === 'student' && (
          <header className="hidden md:flex items-center justify-end gap-2 px-6 py-4 border-b border-slate-200 bg-white">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open notifications"
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                  data-testid="notification-trigger"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={8} className="w-[min(calc(100vw-2rem),24rem)]">
                <div className="flex items-center justify-between px-3 py-2">
                  <DropdownMenuLabel className="text-sm font-semibold">Notifications</DropdownMenuLabel>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                </div>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">No notifications yet.</div>
                ) : (
                  notifications.map((note) => (
                    <DropdownMenuItem
                      key={note.id}
                      onSelect={() => markNotificationRead(note)}
                      className={`flex flex-col gap-1 px-3 py-2 text-left ${note.read ? 'opacity-80' : 'bg-slate-50'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-slate-900">{note.title}</span>
                        {!note.read && (
                          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{note.message}</p>
                      <p className="text-[11px] text-slate-400">{new Date(note.created_at).toLocaleString()}</p>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
        )}

        {/* Page Content */}
        <div className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
