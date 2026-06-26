import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CalendarCheck,
  BarChart3,
  ShieldCheck,
  LogOut,
  GraduationCap,
  Menu,
  X,
  History,
  Bell,
  LibraryBig,
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

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { name: 'Classes', href: '/classes', icon: BookOpen, roles: ['admin'] },
    { name: 'Students', href: '/students', icon: Users, roles: ['admin'] },
    { name: 'Mark Attendance', href: '/attendance', icon: CalendarCheck, roles: ['admin'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'] },
    { name: 'Resources', href: '/resources', icon: LibraryBig, roles: ['admin'] },
    { name: 'Admins', href: '/admins', icon: ShieldCheck, roles: ['admin'] },
  ];

  const studentNavigation = [
    { name: 'My Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Classmates', href: '/student/classmates', icon: Users },
    { name: 'Resources', href: '/student/resources', icon: BookOpen },
    { name: 'Attendance History', href: '/student/history', icon: History },
    { name: 'Profile', href: '/student/profile', icon: ShieldCheck },
  ];

  const navItems = user?.role === 'student' ? studentNavigation : navigation;

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
    if (user?.role === 'student') {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-white flex-col" data-testid="sidebar">
        {/* Logo */}
        <div className="flex flex-col px-6 py-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold font-heading">Attendify</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">by HRK Technologies</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
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
        <div className="p-4 border-t border-slate-800">
          <div className="px-4 py-3 bg-slate-800 rounded-md mb-2">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email || user?.roll_number}</p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center gap-3 px-4 py-3 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors duration-200"
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
        className={`md:hidden fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Close Button */}
        <div className="flex items-center justify-between px-6 py-8 border-b border-slate-800">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold font-heading">Attendify</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-11">by HRK Technologies</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-md hover:bg-slate-800 transition-colors"
            data-testid="mobile-menu-close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.href)}
                data-testid={`mobile-nav-${item.name.toLowerCase().replace(' ', '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 w-full text-left ${
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
        <div className="p-4 border-t border-slate-800">
          <div className="px-4 py-3 bg-slate-800 rounded-md mb-2">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email || user?.roll_number}</p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="mobile-logout-button"
            className="flex items-center gap-3 px-4 py-3 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white w-full transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-md hover:bg-slate-100 transition-colors"
            data-testid="mobile-menu-button"
          >
            <Menu className="h-6 w-6 text-slate-700" />
          </button>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-blue-900" />
              <span className="text-lg font-bold font-heading text-slate-900">Attendify</span>
            </div>
            <p className="text-[10px] text-slate-500">by HRK Technologies</p>
          </div>
          {user?.role === 'student' ? (
            <button
              onClick={() => navigate('/student/notifications')}
              className="relative p-2 rounded-md hover:bg-slate-100 transition-colors"
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
                  className="relative inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
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
              <DropdownMenuContent sideOffset={8} className="w-96 max-w-full">
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
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
