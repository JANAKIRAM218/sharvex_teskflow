'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  LogIn,
  LogOut,
  ArrowRight,
  Activity,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  progress: number;
  deadline?: string;
  createdAt: string;
  employee?: {
    fullName: string;
    department: string;
  };
}

interface Analytics {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  pendingTasks: number;
  tasksByStatus: Record<string, number>;
  weeklyData: { date: string; day: string; completed: number; created: number }[];
}

interface AttendanceRecord {
  id: string;
  clockIn: string | null;
  clockOut: string | null;
  date: string;
  status: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function EmployeeDashboard() {
  const { user, token } = useAuthStore();
  const { setCurrentPage } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      setLoading(true);
      const [tasksRes, analyticsRes, attendanceRes] = await Promise.all([
        fetch(`/api/tasks?assignedTo=${user.id}&limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/attendance?date=${new Date().toISOString().split('T')[0]}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        const todayRecord = attendanceData.records?.[0] || null;
        setAttendance(todayRecord);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClockIn = async () => {
    if (!token || !user?.id) return;
    setClockingIn(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Clocked in successfully!');
        setAttendance(data.attendance);
      } else {
        toast.error(data.error || 'Failed to clock in');
      }
    } catch {
      toast.error('Failed to clock in');
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!token || !user?.id) return;
    setClockingIn(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Clocked out successfully!');
        setAttendance(data.attendance);
      } else {
        toast.error(data.error || 'Failed to clock out');
      }
    } catch {
      toast.error('Failed to clock out');
    } finally {
      setClockingIn(false);
    }
  };

  const isClockedIn = attendance && attendance.clockIn && !attendance.clockOut;
  const performanceScore = user?.performanceScore || 0;

  const statCards = [
    {
      label: 'Total Tasks',
      value: analytics?.totalTasks ?? 0,
      icon: ListTodo,
      color: '#00E5FF',
      glow: 'rgba(0, 229, 255, 0.3)',
    },
    {
      label: 'Completed',
      value: analytics?.completedTasks ?? 0,
      icon: CheckCircle2,
      color: '#00FFB2',
      glow: 'rgba(0, 255, 178, 0.3)',
    },
    {
      label: 'Pending',
      value: analytics?.pendingTasks ?? 0,
      icon: Clock,
      color: '#F59E0B',
      glow: 'rgba(245, 158, 11, 0.3)',
    },
    {
      label: 'Performance',
      value: `${performanceScore}%`,
      icon: TrendingUp,
      color: '#A78BFA',
      glow: 'rgba(167, 139, 250, 0.3)',
    },
  ];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-pending';
      case 'in-progress': return 'badge-in-progress';
      case 'completed': return 'badge-completed';
      default: return 'badge-pending';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      case 'low': return 'badge-low';
      default: return 'badge-medium';
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <Skeleton className="h-80 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#E5E7EB]">
            Welcome back, <span className="text-[#00FFB2]">{user?.name || 'Employee'}</span>
          </h1>
          <p className="text-[#94A3B8] mt-1">Here&apos;s your work overview for today</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#94A3B8]">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            variants={itemVariants}
            custom={index}
            whileHover={{ scale: 1.02, y: -2 }}
            className="glass-card p-5 relative overflow-hidden group cursor-default"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
              style={{ boxShadow: `0 0 30px ${card.glow}, inset 0 0 30px ${card.glow}` }}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <card.icon
                  className="size-8"
                  style={{ color: card.color }}
                />
                <div
                  className="size-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${card.color}15` }}
                >
                  <card.icon
                    className="size-5"
                    style={{ color: card.color }}
                  />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#E5E7EB]">{card.value}</p>
              <p className="text-sm text-[#94A3B8] mt-1">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <motion.div variants={itemVariants} className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[#E5E7EB] flex items-center gap-2">
                <Activity className="size-5 text-[#00E5FF]" />
                Weekly Progress
              </h2>
              <p className="text-sm text-[#94A3B8] mt-1">Task completion trend</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.weeklyData || []}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FFB2" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00FFB2" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="day"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(0, 255, 178, 0.2)',
                    borderRadius: '12px',
                    color: '#E5E7EB',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#00FFB2"
                  strokeWidth={2}
                  fill="url(#colorCompleted)"
                  name="Completed"
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="#00E5FF"
                  strokeWidth={2}
                  fill="url(#colorCreated)"
                  name="Created"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Attendance Card */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-lg font-semibold text-[#E5E7EB] flex items-center gap-2 mb-6">
            <Zap className="size-5 text-[#00FFB2]" />
            Attendance
          </h2>
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 rounded-xl" style={{ background: isClockedIn ? 'rgba(0, 255, 178, 0.08)' : 'rgba(255, 255, 255, 0.03)', border: `1px solid ${isClockedIn ? 'rgba(0, 255, 178, 0.2)' : 'rgba(255, 255, 255, 0.06)'}` }}>
              <div className={`size-16 rounded-full flex items-center justify-center mb-3 ${isClockedIn ? 'neon-pulse' : ''}`} style={{ background: isClockedIn ? 'rgba(0, 255, 178, 0.15)' : 'rgba(255, 255, 255, 0.05)' }}>
                {isClockedIn ? (
                  <LogOut className="size-7 text-[#00FFB2]" />
                ) : (
                  <LogIn className="size-7 text-[#94A3B8]" />
                )}
              </div>
              <p className="text-lg font-semibold text-[#E5E7EB]">
                {isClockedIn ? 'Clocked In' : attendance?.clockOut ? 'Clocked Out' : 'Not Clocked In'}
              </p>
              <p className="text-sm text-[#94A3B8] mt-1">
                {isClockedIn ? `Since ${formatTime(attendance.clockIn)}` : attendance?.clockOut ? `${formatTime(attendance.clockIn)} - ${formatTime(attendance.clockOut)}` : 'Click below to clock in'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                <p className="text-xs text-[#94A3B8] mb-1">Clock In</p>
                <p className="text-sm font-semibold text-[#E5E7EB]">
                  {formatTime(attendance?.clockIn || null)}
                </p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                <p className="text-xs text-[#94A3B8] mb-1">Clock Out</p>
                <p className="text-sm font-semibold text-[#E5E7EB]">
                  {formatTime(attendance?.clockOut || null)}
                </p>
              </div>
            </div>

            <Button
              onClick={isClockedIn ? handleClockOut : handleClockIn}
              disabled={clockingIn || (!!attendance?.clockOut)}
              className={`w-full ${isClockedIn ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' : 'glow-button'}`}
            >
              {clockingIn ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : isClockedIn ? (
                <span className="flex items-center gap-2">
                  <LogOut className="size-4" /> Clock Out
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="size-4" /> Clock In
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Recent Tasks */}
      <motion.div variants={itemVariants} className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[#E5E7EB] flex items-center gap-2">
              <ListTodo className="size-5 text-[#00FFB2]" />
              My Recent Tasks
            </h2>
            <p className="text-sm text-[#94A3B8] mt-1">Your latest assigned tasks</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => setCurrentPage('my-tasks')}
            className="text-[#00E5FF] hover:text-[#00E5FF]/80 flex items-center gap-1"
          >
            View All <ArrowRight className="size-4" />
          </Button>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="size-12 text-[#94A3B8] mx-auto mb-3 opacity-50" />
              <p className="text-[#94A3B8]">No tasks assigned yet</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="task-card glass-card glass-card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer"
                onClick={() => setCurrentPage('my-tasks')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-[#E5E7EB] truncate">{task.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(task.status)}`}>
                      {task.status.replace('-', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-[#94A3B8] truncate">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-32">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#94A3B8]">Progress</span>
                      <span className="text-[#E5E7EB] font-medium">{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-1.5" />
                  </div>
                  {task.deadline && (
                    <div className="text-right">
                      <p className="text-xs text-[#94A3B8]">Deadline</p>
                      <p className="text-xs text-[#E5E7EB]">
                        {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
