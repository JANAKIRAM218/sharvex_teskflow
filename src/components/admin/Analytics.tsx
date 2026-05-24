'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, PieChart as PieChartIcon, TrendingUp,
  Users, Calendar, Award
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line
} from 'recharts';
import { useAuthStore } from '@/store/authStore';

interface AnalyticsData {
  totalEmployees: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  pendingTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority?: Record<string, number>;
  employeePerformance?: Array<{
    id: string;
    fullName: string;
    department: string;
    performanceScore: number;
    _count: { assignedTasks: number };
  }>;
  weeklyData: Array<{
    date: string;
    day: string;
    completed: number;
    created: number;
  }>;
  departments?: Array<{ department: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  'in-progress': '#00E5FF',
  completed: '#00FFB2',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#00FFB2',
};

const DEPT_COLORS = ['#00FFB2', '#00E5FF', '#A78BFA', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-[#E5E7EB] text-sm font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

type TimePeriod = 'week' | 'month' | 'quarter';

export default function Analytics() {
  const { token } = useAuthStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('week');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  // Derive chart data from API response
  const statusPieData = data?.tasksByStatus
    ? Object.entries(data.tasksByStatus).map(([name, value]) => ({ name, value }))
    : [];

  const priorityBarData = data?.tasksByPriority
    ? Object.entries(data.tasksByPriority).map(([name, value]) => ({ name, value }))
    : [];

  const departmentData = data?.departments
    ? data.departments.map((d) => ({ name: d.department, value: d.count }))
    : [];

  const trendData = data?.weeklyData?.map((d) => ({
    name: d.day,
    completed: d.completed,
    created: d.created,
    date: d.date,
  })) ?? [];

  // Filter trend data based on period
  const filteredTrend = (() => {
    if (period === 'week') return trendData.slice(-7);
    if (period === 'month') return trendData.slice(-30);
    return trendData;
  })();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-24 h-9 skeleton-shimmer rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-6 h-80 skeleton-shimmer rounded-2xl" />
          ))}
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
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#00FFB2]" />
          <h2 className="text-xl font-bold text-[#E5E7EB]">Analytics</h2>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.05)]">
          {(['week', 'month', 'quarter'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? 'bg-gradient-to-r from-[#00FFB2] to-[#00E5FF] text-[#0B0F19]'
                  : 'text-[#94A3B8] hover:text-[#E5E7EB]'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completion Trend */}
        <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#00FFB2]" />
            <h3 className="text-[#E5E7EB] font-semibold">Task Completion Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={filteredTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="created"
                stroke="#00E5FF"
                strokeWidth={2}
                dot={{ r: 3, fill: '#00E5FF' }}
                activeDot={{ r: 5, fill: '#00E5FF' }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="#00FFB2"
                strokeWidth={2}
                dot={{ r: 3, fill: '#00FFB2' }}
                activeDot={{ r: 5, fill: '#00FFB2' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Tasks by Status Pie */}
        <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-[#00E5FF]" />
            <h3 className="text-[#E5E7EB] font-semibold">Tasks by Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusPieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {statusPieData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={STATUS_COLORS[entry.name] || '#94A3B8'}
                    style={{ filter: `drop-shadow(0 0 6px ${STATUS_COLORS[entry.name] || '#94A3B8'}40)` }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: '#94A3B8', fontSize: 12 }}
                formatter={(value: string) => (
                  <span style={{ color: STATUS_COLORS[value] || '#94A3B8' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Tasks by Priority Bar */}
        <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#A78BFA]" />
            <h3 className="text-[#E5E7EB] font-semibold">Tasks by Priority</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={priorityBarData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" stroke="#94A3B8" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={12} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {priorityBarData.map((entry, i) => (
                  <Cell key={i} fill={PRIORITY_COLORS[entry.name] || '#94A3B8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Department Performance */}
        <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#F59E0B]" />
            <h3 className="text-[#E5E7EB] font-semibold">Department Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={departmentData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" stroke="#94A3B8" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={12} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {departmentData.map((_, i) => (
                  <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Employee Performance Ranking */}
      <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-[#00FFB2]" />
          <h3 className="text-[#E5E7EB] font-semibold">Employee Performance Ranking</h3>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {data?.employeePerformance?.map((emp, i) => {
            const scoreColor = emp.performanceScore >= 80 ? '#00FFB2' : emp.performanceScore >= 60 ? '#F59E0B' : '#EF4444';
            return (
              <div key={emp.id} className="flex items-center gap-4 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#E5E7EB] truncate">{emp.fullName}</p>
                  <p className="text-xs text-[#94A3B8]">{emp.department} &middot; {emp._count.assignedTasks} tasks</p>
                </div>
                <div className="w-32 hidden sm:block">
                  <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.06)]">
                    <div
                      className="h-full rounded-full progress-animate"
                      style={{ width: `${emp.performanceScore}%`, background: scoreColor }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold min-w-[40px] text-right" style={{ color: scoreColor }}>
                  {emp.performanceScore}%
                </span>
              </div>
            );
          })}
          {(!data?.employeePerformance || data.employeePerformance.length === 0) && (
            <p className="text-sm text-[#94A3B8] text-center py-8">No employee performance data</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
