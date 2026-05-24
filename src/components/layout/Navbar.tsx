'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  UserCircle,
  Settings,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Employees',
  tasks: 'Tasks',
  'my-tasks': 'My Tasks',
  analytics: 'Analytics',
  notifications: 'Notifications',
  settings: 'Settings',
  calendar: 'Calendar',
  profile: 'Profile',
};

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { currentPage, toggleSidebar } = useAppStore();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [unreadCount] = useState(3); // Placeholder
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const title = pageTitles[currentPage] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.06] bg-[#0B0F19]/80 px-4 backdrop-blur-xl md:px-6">
      {/* Hamburger menu (mobile) */}
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <motion.h1
        key={currentPage}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-lg font-semibold text-white md:text-xl"
      >
        {title}
      </motion.h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search bar */}
      <div
        className={cn(
          'relative hidden items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-300 md:flex',
          searchFocused
            ? 'w-80 border-[#00FFB2]/30 bg-white/[0.06] shadow-[0_0_15px_rgba(0,255,178,0.1)]'
            : 'w-64 border-white/[0.08] bg-white/[0.03]'
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="flex-1 border-none bg-transparent text-sm text-white placeholder-[#94A3B8] outline-none"
        />
        <AnimatePresence>
          {searchValue && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setSearchValue('')}
              className="text-[#94A3B8] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Notification bell */}
      <button
        onClick={() => useAppStore.getState().setCurrentPage('notifications')}
        className="relative rounded-xl p-2 text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white"
          >
            {unreadCount}
          </motion.span>
        )}
      </button>

      {/* User dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-white/[0.06]"
        >
          <Avatar className="h-8 w-8 border border-white/[0.1]">
            <AvatarImage src={user?.profileImage} alt={user?.name} />
            <AvatarFallback className="bg-gradient-to-br from-[#00FFB2]/20 to-[#00E5FF]/20 text-xs font-semibold text-[#00FFB2]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-[10px] text-[#94A3B8]">
              {user?.role === 'admin' ? 'Administrator' : user?.designation || 'Employee'}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'hidden h-4 w-4 text-[#94A3B8] transition-transform md:block',
              showDropdown && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown menu */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111827]/95 backdrop-blur-xl"
            >
              <div className="border-b border-white/[0.06] p-3">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-[#94A3B8]">{user?.email || user?.username}</p>
              </div>
              <div className="p-1.5">
                {user?.role === 'employee' && (
                  <button
                    onClick={() => {
                      useAppStore.getState().setCurrentPage('profile');
                      setShowDropdown(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </button>
                )}
                <button
                  onClick={() => {
                    useAppStore.getState().setCurrentPage('settings');
                    setShowDropdown(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
              </div>
              <div className="border-t border-white/[0.06] p-1.5">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
