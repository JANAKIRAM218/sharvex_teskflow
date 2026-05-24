'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, CheckSquare, BarChart3,
  Bell, Settings, LogOut, Zap, Menu, X, ChevronRight,
  ListTodo, Calendar, UserCircle
} from 'lucide-react';
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

type AdminPage = 'dashboard' | 'employees' | 'tasks' | 'analytics' | 'notifications' | 'settings';
type EmployeePage = 'dashboard' | 'my-tasks' | 'calendar' | 'notifications' | 'profile' | 'settings';

const ADMIN_NAV: { id: AdminPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const EMPLOYEE_NAV: { id: EmployeePage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'my-tasks', label: 'My Tasks', icon: ListTodo },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function AppSidebar() {
  const { user, logout } = useAuthStore();
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useAppStore();
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 bg-[#0D1117] border-r border-[rgba(255,255,255,0.06)] flex flex-col ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-16 lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-[rgba(255,255,255,0.06)] min-h-[64px]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-[#0B0F19]" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <span className="text-lg font-bold bg-gradient-to-r from-[#00FFB2] to-[#00E5FF] bg-clip-text text-transparent whitespace-nowrap">
                  TaskFlow
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[rgba(0,255,178,0.15)] text-[#00FFB2] font-medium">
                  PRO
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-[#94A3B8] hover:text-[#E5E7EB] lg:hidden shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden mt-2">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[rgba(0,255,178,0.1)] text-[#00FFB2] border border-[rgba(0,255,178,0.15)] shadow-[0_0_15px_rgba(0,255,178,0.08)]'
                    : 'text-[#94A3B8] hover:text-[#E5E7EB] hover:bg-[rgba(255,255,255,0.04)] border border-transparent'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#00FFB2]' : ''}`} />
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
                {isActive && sidebarOpen && (
                  <ChevronRight className="w-4 h-4 ml-auto text-[#00FFB2] shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] text-sm font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm text-[#E5E7EB] truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-[#94A3B8] capitalize truncate">{user?.role || 'user'}</p>
              </motion.div>
            )}
            {sidebarOpen && (
              <button
                onClick={() => {
                  logout();
                  setCurrentPage('dashboard');
                }}
                className="text-[#94A3B8] hover:text-[#EF4444] transition-colors p-1 rounded-lg hover:bg-[rgba(239,68,68,0.1)]"
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
  const { currentPage, sidebarOpen, setSidebarOpen } = useAppStore();
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;
  const currentLabel = navItems.find(n => n.id === currentPage)?.label || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-16 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl hover:bg-[rgba(255,255,255,0.05)] text-[#94A3B8] hover:text-[#E5E7EB] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-[#E5E7EB]">
            {currentLabel}
          </h1>
          <p className="text-[10px] sm:text-xs text-[#94A3B8] hidden sm:block">
            {isAdmin ? 'Admin Portal' : 'Employee Portal'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs sm:text-sm text-[#94A3B8] hidden sm:block">
          Welcome, <span className="text-[#00FFB2] font-medium">{user?.name || 'User'}</span>
        </span>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] text-sm font-bold">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
}

function AdminPortal() {
  const { currentPage } = useAppStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <AdminDashboard />;
      case 'employees': return <EmployeeManagement />;
      case 'tasks': return <TaskManagement />;
      case 'analytics': return <Analytics />;
      case 'notifications': return <AdminNotifications />;
      case 'settings': return <AdminSettings />;
      default: return <AdminDashboard />;
    }
  };

  return renderPage();
}

function EmployeePortal() {
  const { currentPage } = useAppStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <EmployeeDashboard />;
      case 'my-tasks': return <MyTasks />;
      case 'calendar': return <CalendarPage />;
      case 'notifications': return <EmployeeNotifications />;
      case 'profile': return <Profile />;
      case 'settings': return <EmployeeSettings />;
      default: return <EmployeeDashboard />;
    }
  };

  return renderPage();
}

export default function Home() {
  const { isAuthenticated, token, user, logout } = useAuthStore();
  const { currentPage, sidebarOpen, setCurrentPage } = useAppStore();

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
      const validAdminPages = ['dashboard', 'employees', 'tasks', 'analytics', 'notifications', 'settings'];
      const validEmployeePages = ['dashboard', 'my-tasks', 'calendar', 'notifications', 'profile', 'settings'];
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
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        }`}
      >
        <AppNavbar />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {isAdmin ? <AdminPortal /> : <EmployeePortal />}
            </motion.div>
          </AnimatePresence>
        </main>
        {/* Footer */}
        <footer className="px-4 sm:px-6 py-4 border-t border-[rgba(255,255,255,0.06)] text-center">
          <p className="text-xs text-[#94A3B8]">
            © 2024 TaskFlow PRO — Employee Task Management Platform. Built with{' '}
            <span className="text-[#00FFB2]">♥</span> for productivity.
          </p>
        </footer>
      </div>
    </div>
  );
}
