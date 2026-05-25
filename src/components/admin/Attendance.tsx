'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon, Search, Users, CheckCircle2,
  Clock, Building2, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { type DateValue } from 'react-day-picker';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut: string | null;
  date: string;
  status: string;
  employee: {
    id: string;
    fullName: string;
    department: string;
    profileImage: string | null;
  } | null;
}

interface Employee {
  id: string;
  fullName: string;
  department: string;
  status: string;
}

const DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];

export default function AttendancePage() {
  const { token } = useAuthStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date()); // defaults to today

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch {
      // silent fail
    }
  }, [token]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        params.set('date', `${year}-${month}-${day}`);
      }
      const res = await fetch(`/api/attendance?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch {
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const formatJoinDate = (date: Date | undefined) => {
    if (!date) return 'All-Time Logs';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatWorkingHours = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return '--';
    const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    return `${diffHrs.toFixed(1)} hrs`;
  };

  // Filter local records based on search and department
  const filteredRecords = records.filter((rec) => {
    const nameMatch = rec.employee?.fullName.toLowerCase().includes(search.toLowerCase()) ?? false;
    const deptMatch = filterDept ? rec.employee?.department === filterDept : true;
    return (search ? nameMatch : true) && deptMatch;
  });

  // Calculate Paginated Records
  const totalPages = Math.ceil(filteredRecords.length / limit);
  const paginatedRecords = filteredRecords.slice((page - 1) * limit, page * limit);

  // Calculate Stats (based on today or filtered date)
  const activeEmployeesCount = employees.filter(e => e.status === 'active').length;
  const presentCount = records.length; // present on the selected date
  const clockedInCount = records.filter(r => r.clockIn && !r.clockOut).length;
  const absentCount = Math.max(0, activeEmployeesCount - presentCount);

  const kpiCards = [
    { label: 'Total Active Staff', value: activeEmployeesCount, icon: Users, color: '#00E5FF' },
    { label: 'Present Today', value: presentCount, icon: CheckCircle2, color: '#00FFB2' },
    { label: 'Active Sessions', value: clockedInCount, icon: Clock, color: '#A78BFA' },
    { label: 'Absent / Out', value: absentCount, icon: X, color: '#EF4444' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-6 h-6 text-[#00FFB2]" />
        <h2 className="text-xl font-bold text-[#E5E7EB]">Employee Attendance</h2>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            className="glass-card p-5 rounded-2xl border border-white/[0.04]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#94A3B8] text-sm">{card.label}</p>
                <p className="text-3xl font-bold mt-1 text-[#E5E7EB]">{card.value}</p>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${card.color}15` }}
              >
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by employee name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] placeholder-[#94A3B8]/50 text-sm focus:outline-none"
          />
        </div>

        {/* Date Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[200px] justify-start text-left font-normal rounded-xl bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] text-[#E5E7EB]"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-[#00E5FF]" />
              {formatJoinDate(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-[#111827] border-[rgba(255,255,255,0.08)]" align="start">
            <div className="p-2 border-b border-white/5 flex justify-between items-center bg-[#0D1117]">
              <span className="text-xs text-[#94A3B8]">Filter by Date</span>
              <button
                onClick={() => { setSelectedDate(undefined); setPage(1); }}
                className="text-xs text-[#00FFB2] hover:underline"
              >
                Clear (All Logs)
              </button>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date: DateValue) => {
                if (date instanceof Date || date === undefined) {
                  setSelectedDate(date);
                  setPage(1);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Department Filter */}
        <Select
          value={filterDept || '__all__'}
          onValueChange={(v) => { setFilterDept(v === '__all__' ? '' : v); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-[180px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
            <SelectItem value="__all__" className="text-[#94A3B8] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)]">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d} className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)]">
                <span className="flex items-center gap-2">
                  <Building2 className="size-3.5 text-[#00E5FF]" />
                  {d}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] bg-white/[0.01]">
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Employee</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Date</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Clock In</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Clock Out</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Working Hours</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[rgba(255,255,255,0.04)]">
                    <td colSpan={6} className="py-4 px-4"><div className="h-4 skeleton-shimmer rounded" /></td>
                  </tr>
                ))
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#94A3B8] text-sm">
                    No attendance records found for this criteria.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec, i) => (
                  <tr
                    key={rec.id}
                    className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] text-xs font-bold shrink-0">
                          {rec.employee?.fullName.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#E5E7EB]">{rec.employee?.fullName || 'Deleted Employee'}</p>
                          <p className="text-xs text-[#94A3B8]">{rec.employee?.department || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#E5E7EB]">
                      {new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#00FFB2] font-medium font-mono">
                      {formatTime(rec.clockIn)}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono">
                      {rec.clockOut ? (
                        <span className="text-[#94A3B8]">{formatTime(rec.clockOut)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(167,139,250,0.15)] text-[#A78BFA] border border-[rgba(167,139,250,0.3)]">
                          Active Session
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-[#E5E7EB] font-mono">
                      {formatWorkingHours(rec.clockIn, rec.clockOut)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-[rgba(0,255,178,0.1)] text-[#00FFB2] border-[rgba(0,255,178,0.2)]">
                        Present
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl glass-card glass-card-hover disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-[#94A3B8]" />
          </button>
          <span className="text-sm text-[#94A3B8]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl glass-card glass-card-hover disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
