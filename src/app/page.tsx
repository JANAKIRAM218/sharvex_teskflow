'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, CheckSquare, BarChart3,
  Bell, Settings, LogOut, Zap, Menu, X, ChevronRight,
  ListTodo, Calendar, UserCircle, HomeIcon, Search, MessageCircle
} from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import LoginPage from '@/components/auth/LoginPage';

// Admin pages
import AdminDashboard from '@/components/admin/AdminDashboard';
import EmployeeManagement from '@/components/admin/EmployeeManagement';
import TaskManagement from '@/components/admin/TaskManagement';
import Analytics from '@/components/admin/Analytics';
import AdminNotifications from '@/components/admin/AdminNotifications';
import AdminSettings from '@/components/admin/AdminSettings';

// Employee pages
import EmployeeDashboard from '@/components/employee/EmployeeDashboard';
import MyTasks from '@/components/employee/MyTasks';
import CalendarPage from '@/components/employee/Calendar';
import EmployeeNotifications from '@/components/employee/EmployeeNotifications';
import Profile from '@/components/employee/Profile';
import EmployeeSettings from '@/components/employee/EmployeeSettings';
import WorkUploads from '@/components/employee/WorkUploads';
import TeamChat from '@/components/shared/TeamChat';

type AdminPage = 'dashboard' | 'employees' | 'tasks' | 'analytics' | 'notifications' | 'settings';
type EmployeePage = 'dashboard' | 'my-tasks' | 'calendar' | 'notifications' | 'profile' | 'settings' | 'work-uploads';

const ADMIN_NAV: { id: AdminPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'work-uploads', label: 'Work Uploads', icon: Zap },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const EMPLOYEE_NAV: { id: EmployeePage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'my-tasks', label: 'My Tasks', icon: ListTodo },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'chat', label: 'Team Chat', icon: MessageCircle },
  { id: 'work-uploads', label: 'Work Uploads', icon: Zap },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Mobile bottom nav for employee portal (5 items max)
const EMPLOYEE_MOBILE_NAV: { id: EmployeePage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Home', icon: HomeIcon },
  { id: 'my-tasks', label: 'Tasks', icon: ListTodo },
  { id: 'work-uploads', label: 'Uploads', icon: Zap },
  { id: 'notifications', label: 'Alerts', icon: Bell },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

function AppSidebar() {
  const { user, logout } = useAuthStore();
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useAppStore();
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out bg-[#0D1117] border-r border-[rgba(255,255,255,0.06)] flex flex-col overflow-hidden ${
          sidebarOpen
            ? 'w-64 translate-x-0'
            : 'w-0 -translate-x-full lg:w-[72px] lg:translate-x-0'
        }`}
      >
        {/* Logo section */}
        <div className="flex items-center h-14 sm:h-16 px-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
          <Image src="/logo.png" alt="Sharvex TaskFlow" width={36} height={36} className="w-9 h-9 rounded-xl shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 overflow-hidden ml-3"
              >
                <span className="text-lg font-bold bg-gradient-to-r from-[#00FFB2] to-[#00E5FF] bg-clip-text text-transparent whitespace-nowrap">
                  Sharvex TaskFlow
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Close button - mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-[#94A3B8] hover:text-[#E5E7EB] lg:hidden shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-[rgba(0,255,178,0.1)] text-[#00FFB2] border border-[rgba(0,255,178,0.15)] shadow-[0_0_15px_rgba(0,255,178,0.08)]'
                    : 'text-[#94A3B8] hover:text-[#E5E7EB] hover:bg-[rgba(255,255,255,0.04)] border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#00FFB2]' : ''}`} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && sidebarOpen && (
                  <ChevronRight className="w-4 h-4 ml-auto text-[#00FFB2] shrink-0" />
                )}
                {/* Tooltip when collapsed on desktop */}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1f2e] text-[#E5E7EB] text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[rgba(255,255,255,0.1)] shadow-lg">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-2 border-t border-[rgba(255,255,255,0.06)] shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] text-sm font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-[#E5E7EB] truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-[#94A3B8] capitalize truncate">{user?.role || 'user'}</p>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setCurrentPage('dashboard');
                    }}
                    className="text-[#94A3B8] hover:text-[#EF4444] transition-colors p-1 rounded-lg hover:bg-[rgba(239,68,68,0.1)] shrink-0"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Logout icon when collapsed */}
            {!sidebarOpen && (
              <button
                onClick={() => {
                  logout();
                  setCurrentPage('dashboard');
                }}
                className="text-[#94A3B8] hover:text-[#EF4444] transition-colors p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] shrink-0 hidden lg:block"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function AppNavbar() {
  const { user } = useAuthStore();
  const { currentPage, setSidebarOpen } = useAppStore();
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;
  const currentLabel = navItems.find(n => n.id === currentPage)?.label || 'Dashboard';
  const CurrentIcon = navItems.find(n => n.id === currentPage)?.icon;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 lg:px-6 h-14 sm:h-16 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl hover:bg-[rgba(255,255,255,0.05)] text-[#94A3B8] hover:text-[#E5E7EB] transition-colors shrink-0 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {CurrentIcon && (
            <CurrentIcon className="w-4 h-4 text-[#00FFB2] shrink-0 hidden sm:block" />
          )}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-[#E5E7EB] truncate">
              {currentLabel}
            </h1>
            <p className="text-[10px] text-[#94A3B8] hidden md:block">
              {isAdmin ? 'Admin Portal' : 'Employee Portal'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="text-xs text-[#94A3B8] hidden sm:block">
          Hi, <span className="text-[#00FFB2] font-medium">{user?.name || 'User'}</span>
        </span>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(0,255,178,0.2)]">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}

// Mobile bottom navigation for employee portal
function EmployeeMobileNav() {
  const { currentPage, setCurrentPage } = useAppStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[#0D1117]/95 backdrop-blur-xl border-t border-[rgba(255,255,255,0.06)] safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {EMPLOYEE_MOBILE_NAV.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 sm:px-3 rounded-xl transition-all min-w-0 flex-1 max-w-[72px] ${
                isActive
                  ? 'text-[#00FFB2]'
                  : 'text-[#94A3B8] active:text-[#E5E7EB]'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isActive && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#00FFB2]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className="text-[10px] sm:text-xs font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AdminPortal() {
  const { currentPage } = useAppStore();

  switch (currentPage) {
    case 'dashboard': return <AdminDashboard />;
    case 'employees': return <EmployeeManagement />;
    case 'tasks': return <TaskManagement />;
    case 'analytics': return <Analytics />;
    case 'notifications': return <AdminNotifications />;
    case 'settings': return <AdminSettings />;
    case 'work-uploads': return <WorkUploads />;
    default: return <AdminDashboard />;
  }
}

function EmployeePortal() {
  const { currentPage } = useAppStore();

  switch (currentPage) {
    case 'dashboard': return <EmployeeDashboard />;
    case 'my-tasks': return <MyTasks />;
    case 'calendar': return <CalendarPage />;
    case 'notifications': return <EmployeeNotifications />;
    case 'profile': return <Profile />;
    case 'settings': return <EmployeeSettings />;
    case 'work-uploads': return <WorkUploads />;
    case 'chat': return <TeamChat />;
    default: return <EmployeeDashboard />;
  }
}

export default function Home() {
  const { isAuthenticated, token, user, logout } = useAuthStore();
  const { currentPage, sidebarOpen, setCurrentPage, setSidebarOpen } = useAppStore();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile and set initial sidebar state
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Close sidebar on mobile by default
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Validate token on mount
  useEffect(() => {
    if (isAuthenticated && token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) {
          logout();
          setCurrentPage('dashboard');
        }
      }).catch(() => {
        logout();
        setCurrentPage('dashboard');
      });
    }
  }, [isAuthenticated, token, logout, setCurrentPage]);

  // Set initial page based on role
  useEffect(() => {
    if (isAuthenticated && user) {
      const validAdminPages = ['dashboard', 'employees', 'tasks', 'analytics', 'notifications', 'settings', 'work-uploads'];
      const validEmployeePages = ['dashboard', 'my-tasks', 'calendar', 'notifications', 'profile', 'settings', 'work-uploads', 'chat'];
      const current = useAppStore.getState().currentPage;
      const validPages = user.role === 'admin' ? validAdminPages : validEmployeePages;
      if (!validPages.includes(current)) {
        setCurrentPage('dashboard');
      }
    }
  }, [isAuthenticated, user, setCurrentPage]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col">
      <AppSidebar />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-[72px]'
        }`}
      >
        <AppNavbar />
        <main className={`flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden ${!isAdmin ? 'pb-20 lg:pb-6' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {isAdmin ? <AdminPortal /> : <EmployeePortal />}
            </motion.div>
          </AnimatePresence>
        </main>
        {/* Footer - desktop only */}
        <footer className="hidden lg:block px-6 py-4 border-t border-[rgba(255,255,255,0.06)] text-center mt-auto">
          <p className="text-xs text-[#94A3B8]">
            © 2024 Sharvex TaskFlow — Employee Task Management Platform. Built with{' '}
            <span className="text-[#00FFB2]">♥</span> for productivity.
          </p>
        </footer>
      </div>
      {/* Mobile bottom nav for employees */}
      {!isAdmin && <EmployeeMobileNav />}
    </div>
  );
}
