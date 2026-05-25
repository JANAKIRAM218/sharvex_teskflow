'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  ListTodo,
  BarChart3,
  Bell,
  Settings,
  Calendar,
  UserCircle,
  LogOut,
  ChevronLeft,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const adminNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'attendance', label: 'Attendance', icon: Calendar },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const employeeNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'my-tasks', label: 'My Tasks', icon: ListTodo },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { currentPage, setCurrentPage, sidebarOpen, setSidebarOpen } = useAppStore();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  const handleNavClick = (pageId: string) => {
    setCurrentPage(pageId as typeof currentPage);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'flex h-screen flex-col border-r border-white/[0.06] bg-[#0D1117]',
          // Mobile: fixed overlay
          'fixed top-0 left-0 z-50 lg:relative lg:z-auto',
          // Hide on mobile when closed
          !sidebarOpen && isMobile && 'hidden lg:flex'
        )}
        animate={{
          width: sidebarOpen ? 260 : 72,
        }}
        initial={false}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo section */}
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#00FFB2] to-[#00E5FF]">
            <Zap className="h-5 w-5 text-[#0B0F19]" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <span className="whitespace-nowrap text-lg font-bold text-white">
                  TaskFlow
                </span>
                <span className="whitespace-nowrap text-xs font-medium text-[#00FFB2]">
                  PRO
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse button (desktop) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto hidden rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-white lg:block"
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform duration-300',
                !sidebarOpen && 'rotate-180'
              )}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#00FFB2]/10 text-[#00FFB2]'
                      : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-white'
                  )}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#00FFB2] shadow-[0_0_10px_rgba(0,255,178,0.5)]"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}

                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors',
                      isActive ? 'text-[#00FFB2]' : 'text-[#94A3B8] group-hover:text-white'
                    )}
                  />

                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Active background glow */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-[#00FFB2]/5"
                      layoutId="activeNavGlow"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.04]">
            <Avatar className="h-9 w-9 shrink-0 border border-white/[0.1]">
              <AvatarImage src={user?.profileImage} alt={user?.name} />
              <AvatarFallback className="bg-gradient-to-br from-[#00FFB2]/20 to-[#00E5FF]/20 text-xs font-semibold text-[#00FFB2]">
                {initials}
              </AvatarFallback>
            </Avatar>

            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-hidden"
                >
                  <p className="truncate text-sm font-medium text-white">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-[#94A3B8]">
                    {isAdmin ? 'Administrator' : user?.designation || 'Employee'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {sidebarOpen && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleLogout}
                  className="shrink-0 rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-red-500/10 hover:text-red-400"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
