'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit2, Trash2, Users, X,
  Loader2, ChevronLeft, ChevronRight, Copy, Check,
  CalendarIcon, Building2, UserCircle
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/lib/socket';
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

interface Employee {
  id: string;
  fullName: string;
  username: string;
  employeeCode: string;
  department: string;
  designation: string;
  profileImage: string | null;
  joiningDate: string;
  status: string;
  performanceScore: number;
  createdAt: string;
  _count: { assignedTasks: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];

export default function EmployeeManagement() {
  const { token, user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newCredentials, setNewCredentials] = useState<{ username: string; employeeCode: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Add form
  const [addForm, setAddForm] = useState({ fullName: '', department: 'Engineering', designation: '', joiningDate: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addJoinDate, setAddJoinDate] = useState<Date | undefined>(undefined);

  // Edit form
  const [editForm, setEditForm] = useState({ fullName: '', department: '', designation: '', status: 'active', performanceScore: 0 });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set('search', search);
      if (filterDept) params.set('department', filterDept);
      if (filterStatus) params.set('status', filterStatus);

      const res = await fetch(`/api/employees?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees);
        setPagination(data.pagination);
      }
    } catch {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [token, pagination.page, pagination.limit, search, filterDept, filterStatus]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const socket = getSocket();

    const handleRoomMembers = (data: { roomId: string; members: { userId: string }[] }) => {
      if (data.roomId === 'general') {
        setOnlineUserIds(new Set(data.members.map(m => m.userId)));
      }
    };

    const handleUserJoined = (data: { user: { userId: string } }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.add(data.user.userId);
        return next;
      });
    };

    const handleUserLeft = (data: { user: { userId: string } }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.delete(data.user.userId);
        return next;
      });
    };

    socket.on('room-members', handleRoomMembers);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    const joinRoom = () => {
      socket.emit('join-room', {
        roomId: 'general',
        userId: user?.id || 'admin',
        userName: user?.name || 'Admin',
        role: 'admin',
      });
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.on('connect', joinRoom);
    }

    return () => {
      socket.off('room-members', handleRoomMembers);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('connect', joinRoom);
      socket.emit('leave-room', { roomId: 'general' });
    };
  }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.fullName || !addForm.department || !addForm.designation) {
      toast.error('Please fill in all required fields');
      return;
    }
    setAddLoading(true);
    try {
      let joiningDate = '';
      if (addJoinDate) {
        const year = addJoinDate.getFullYear();
        const month = String(addJoinDate.getMonth() + 1).padStart(2, '0');
        const day = String(addJoinDate.getDate()).padStart(2, '0');
        joiningDate = `${year}-${month}-${day}`;
      }
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, joiningDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to add employee');
        return;
      }
      setNewCredentials(data.credentials);
      setShowCredentials(true);
      toast.success('Employee added successfully!');
      fetchEmployees();
    } catch {
      toast.error('Failed to add employee');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update employee');
        return;
      }
      toast.success('Employee updated successfully!');
      setShowEditModal(false);
      fetchEmployees();
    } catch {
      toast.error('Failed to update employee');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete employee');
        return;
      }
      toast.success('Employee deleted successfully!');
      setShowDeleteDialog(false);
      fetchEmployees();
    } catch {
      toast.error('Failed to delete employee');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEditForm({
      fullName: emp.fullName,
      department: emp.department,
      designation: emp.designation,
      status: emp.status,
      performanceScore: emp.performanceScore,
    });
    setShowEditModal(true);
  };

  const openDeleteDialog = (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowDeleteDialog(true);
  };

  const copyCredentials = () => {
    if (!newCredentials) return;
    const text = `Username: ${newCredentials.username}\nEmployee Code: ${newCredentials.employeeCode}\nPassword: ${newCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = (status: string) => {
    if (status === 'active') return 'bg-[rgba(0,255,178,0.15)] text-[#00FFB2] border-[rgba(0,255,178,0.3)]';
    return 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[rgba(239,68,68,0.3)]';
  };

  const isEmpOnline = (empId: string) => onlineUserIds.has(empId);

  const formatJoinDate = (date: Date | undefined) => {
    if (!date) return 'Pick a date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-[#00FFB2]" />
          <h2 className="text-xl font-bold text-[#E5E7EB]">Employee Management</h2>
        </div>
        <button
          onClick={() => {
            setAddForm({ fullName: '', department: 'Engineering', designation: '', joiningDate: '' });
            setAddJoinDate(undefined);
            setShowAddModal(true);
          }}
          className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] placeholder-[#94A3B8]/50 text-sm focus:outline-none"
          />
        </div>
        <Select
          value={filterDept || '__all__'}
          onValueChange={(v) => { setFilterDept(v === '__all__' ? '' : v); setPagination((p) => ({ ...p, page: 1 })); }}
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
        <Select
          value={filterStatus || '__all__'}
          onValueChange={(v) => { setFilterStatus(v === '__all__' ? '' : v); setPagination((p) => ({ ...p, page: 1 })); }}
        >
          <SelectTrigger className="w-full sm:w-[150px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
            <SelectItem value="__all__" className="text-[#94A3B8] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)]">All Status</SelectItem>
            <SelectItem value="active" className="text-[#00FFB2] focus:text-[#00FFB2] focus:bg-[rgba(0,255,178,0.05)]">Active</SelectItem>
            <SelectItem value="inactive" className="text-[#EF4444] focus:text-[#EF4444] focus:bg-[rgba(239,68,68,0.05)]">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Code</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Department</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Designation</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Tasks</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[rgba(255,255,255,0.04)]">
                    <td colSpan={7} className="py-4 px-4"><div className="h-4 skeleton-shimmer rounded" /></td>
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8] text-sm">No employees found</td>
                </tr>
              ) : (
                employees.map((emp, i) => (
                  <motion.tr
                    key={emp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] text-xs font-bold">
                          {emp.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#E5E7EB]">{emp.fullName}</p>
                          <p className="text-xs text-[#94A3B8]">@{emp.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#94A3B8] font-mono">{emp.employeeCode}</td>
                    <td className="py-3 px-4 text-sm text-[#E5E7EB]">{emp.department}</td>
                    <td className="py-3 px-4 text-sm text-[#E5E7EB]">{emp.designation}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(isEmpOnline(emp.id) ? 'active' : 'inactive')}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isEmpOnline(emp.id) ? 'bg-[#00FFB2] animate-pulse shadow-[0_0_8px_rgba(0,255,178,0.6)]' : 'bg-[#EF4444]'}`} />
                        {isEmpOnline(emp.id) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#94A3B8]">{emp._count.assignedTasks}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 rounded-lg hover:bg-[rgba(0,229,255,0.1)] text-[#94A3B8] hover:text-[#00E5FF] transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(emp)}
                          className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-28 skeleton-shimmer rounded-2xl" />
          ))
        ) : employees.length === 0 ? (
          <div className="glass-card p-8 text-center text-[#94A3B8] text-sm">No employees found</div>
        ) : (
          employees.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card glass-card-hover p-4 rounded-2xl"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] text-sm font-bold">
                    {emp.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#E5E7EB]">{emp.fullName}</p>
                    <p className="text-xs text-[#94A3B8]">@{emp.username} &middot; {emp.employeeCode}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(isEmpOnline(emp.id) ? 'active' : 'inactive')}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isEmpOnline(emp.id) ? 'bg-[#00FFB2] animate-pulse shadow-[0_0_8px_rgba(0,255,178,0.6)]' : 'bg-[#EF4444]'}`} />
                  {isEmpOnline(emp.id) ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#94A3B8]">
                <span>{emp.department} &middot; {emp.designation}</span>
                <span>{emp._count.assignedTasks} tasks</span>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => openEditModal(emp)} className="p-1.5 rounded-lg hover:bg-[rgba(0,229,255,0.1)] text-[#94A3B8] hover:text-[#00E5FF] transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => openDeleteDialog(emp)} className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-[#94A3B8] hover:text-[#EF4444] transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            disabled={pagination.page === 1}
            className="p-2 rounded-xl glass-card glass-card-hover disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-[#94A3B8]" />
          </button>
          <span className="text-sm text-[#94A3B8]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 rounded-xl glass-card glass-card-hover disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
          </button>
        </div>
      )}

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !showCredentials && setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 rounded-2xl w-full max-w-md neon-border max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {showCredentials && newCredentials ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#E5E7EB]">Employee Created!</h3>
                  <p className="text-sm text-[#94A3B8]">Share these credentials with the employee:</p>
                  <div className="bg-[rgba(0,255,178,0.05)] border border-[rgba(0,255,178,0.2)] rounded-xl p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[#94A3B8]">Username:</span>
                      <span className="text-sm text-[#00FFB2] font-mono">{newCredentials.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#94A3B8]">Employee Code:</span>
                      <span className="text-sm text-[#00FFB2] font-mono">{newCredentials.employeeCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[#94A3B8]">Password:</span>
                      <span className="text-sm text-[#00FFB2] font-mono">{newCredentials.password}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={copyCredentials}
                      className="flex-1 py-2 rounded-xl border border-[rgba(0,255,178,0.3)] text-[#00FFB2] text-sm flex items-center justify-center gap-2 hover:bg-[rgba(0,255,178,0.1)] transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy Credentials'}
                    </button>
                    <button
                      onClick={() => { setShowCredentials(false); setShowAddModal(false); }}
                      className="flex-1 glow-button py-2 rounded-xl text-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-[#E5E7EB] flex items-center gap-2">
                      <UserCircle className="size-5 text-[#00FFB2]" />
                      Add Employee
                    </h3>
                    <button onClick={() => setShowAddModal(false)} className="text-[#94A3B8] hover:text-[#E5E7EB]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleAdd} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[#94A3B8]">
                        Full Name <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={addForm.fullName}
                        onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[#94A3B8]">
                        Department <span className="text-[#EF4444]">*</span>
                      </label>
                      <Select
                        value={addForm.department}
                        onValueChange={(v) => setAddForm({ ...addForm, department: v })}
                      >
                        <SelectTrigger className="w-full bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d} value={d} className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">
                              <span className="flex items-center gap-2">
                                <Building2 className="size-3.5 text-[#00E5FF]" />
                                {d}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[#94A3B8]">
                        Designation <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={addForm.designation}
                        onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
                        placeholder="Software Engineer"
                        className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[#94A3B8]">Joining Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal rounded-xl bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] ${
                              !addJoinDate ? 'text-[#94A3B8]' : 'text-[#E5E7EB]'
                            }`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-[#00E5FF]" />
                            {formatJoinDate(addJoinDate)}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[#111827] border-[rgba(255,255,255,0.08)]" align="start">
                          <Calendar
                            mode="single"
                            selected={addJoinDate}
                            onSelect={(date: DateValue) => {
                              if (date instanceof Date || date === undefined) {
                                setAddJoinDate(date);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <button
                      type="submit"
                      disabled={addLoading}
                      className="glow-button w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Add Employee
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Employee Modal */}
      <AnimatePresence>
        {showEditModal && selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 rounded-2xl w-full max-w-md neon-border max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#E5E7EB] flex items-center gap-2">
                  <Edit2 className="size-5 text-[#00E5FF]" />
                  Edit Employee
                </h3>
                <button onClick={() => setShowEditModal(false)} className="text-[#94A3B8] hover:text-[#E5E7EB]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-[#94A3B8]">Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#94A3B8]">Department</label>
                  <Select
                    value={editForm.department}
                    onValueChange={(v) => setEditForm({ ...editForm, department: v })}
                  >
                    <SelectTrigger className="w-full bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d} className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">
                          <span className="flex items-center gap-2">
                            <Building2 className="size-3.5 text-[#00E5FF]" />
                            {d}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#94A3B8]">Designation</label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#94A3B8]">Status</label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                  >
                    <SelectTrigger className="w-full bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
                      <SelectItem value="active" className="text-[#00FFB2] focus:text-[#00FFB2] focus:bg-[rgba(0,255,178,0.05)]">Active</SelectItem>
                      <SelectItem value="inactive" className="text-[#EF4444] focus:text-[#EF4444] focus:bg-[rgba(239,68,68,0.05)]">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#94A3B8]">Performance Score</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.performanceScore}
                    onChange={(e) => setEditForm({ ...editForm, performanceScore: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="glow-button w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                  Save Changes
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteDialog && selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 rounded-2xl w-full max-w-sm neon-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[rgba(239,68,68,0.15)] flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-[#EF4444]" />
                </div>
                <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">Delete Employee?</h3>
                <p className="text-sm text-[#94A3B8] mb-6">
                  Are you sure you want to delete <span className="text-[#E5E7EB] font-medium">{selectedEmployee.fullName}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteDialog(false)}
                    className="flex-1 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] text-[#94A3B8] text-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 py-2 rounded-xl bg-[rgba(239,68,68,0.2)] text-[#EF4444] text-sm font-medium hover:bg-[rgba(239,68,68,0.3)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
