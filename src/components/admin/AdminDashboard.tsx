'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, CheckCircle2, Clock, TrendingUp,
  Activity, Trophy, BarChart3, PieChart as PieChartIcon,
  ArrowUpRight
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useAuthStore } from '@/store/authStore';
import AIInsightsPanel from '@/components/admin/AIInsightsPanel';
import TeamChat from '@/components/shared/TeamChat';

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

export default function AdminDashboard() {
  const { token } = useAuthStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
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

  const productivity = data
    ? data.totalTasks > 0
      ? Math.round((data.completedTasks / data.totalTasks) * 100)
      : 0
    : 0;

  const kpiCards = [
    { label: 'Total Employees', value: data?.totalEmployees ?? 0, icon: Users, color: '#00FFB2' },
    { label: 'Active Tasks', value: data?.activeTasks ?? 0, icon: Clock, color: '#00E5FF' },
    { label: 'Completed Tasks', value: data?.completedTasks ?? 0, icon: CheckCircle2, color: '#A78BFA' },
    { label: 'Productivity', value: `${productivity}%`, icon: TrendingUp, color: '#F59E0B' },
  ];

  const pieData = data?.tasksByStatus
    ? Object.entries(data.tasksByStatus).map(([name, value]) => ({ name, value }))
    : [];

  const weeklyChartData = data?.weeklyData?.map((d) => ({
    name: d.day,
    Created: d.created,
    Completed: d.completed,
  })) ?? [];

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-6 h-32 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 h-80 skeleton-shimmer rounded-2xl" />
          <div className="glass-card p-6 h-80 skeleton-shimmer rounded-2xl" />
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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${card.color}30` }}
            className="glass-card glass-card-hover p-5 rounded-2xl transition-all cursor-default"
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
            <div className="flex items-center mt-3 text-xs text-[#94A3B8]">
              <ArrowUpRight className="w-3 h-3 mr-1" style={{ color: card.color }} />
              <span>Updated now</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Pie Chart */}
        <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-[#00FFB2]" />
            <h3 className="text-[#E5E7EB] font-semibold">Tasks by Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, i) => (
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

        {/* Weekly Tasks Bar Chart */}
        <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[#00E5FF]" />
            <h3 className="text-[#E5E7EB] font-semibold">Weekly Tasks</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weeklyChartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Created" fill="#00E5FF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Completed" fill="#00FFB2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* AI Insights Section */}
      <motion.div variants={itemVariants}>
        <AIInsightsPanel />
      </motion.div>

      {/* Bottom Row: Activity + Top Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#A78BFA]" />
            <h3 className="text-[#E5E7EB] font-semibold">Recent Activity</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data?.weeklyData?.slice().reverse().map((day, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(0,255,178,0.1)]">
                  <CheckCircle2 className="w-4 h-4 text-[#00FFB2]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#E5E7EB]">{day.completed} tasks completed</p>
                  <p className="text-xs text-[#94A3B8]">{day.date}</p>
                </div>
                <span className="text-xs text-[#94A3B8]">{day.created} new</span>
              </div>
            ))}
            {(!data?.weeklyData || data.weeklyData.length === 0) && (
              <p className="text-sm text-[#94A3B8] text-center py-8">No recent activity</p>
            )}
          </div>
        </motion.div>

        {/* Top Performing Employees */}
        <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-[#F59E0B]" />
            <h3 className="text-[#E5E7EB] font-semibold">Top Performers</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data?.employeePerformance?.map((emp, i) => (
              <div key={emp.id} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] text-[#0B0F19] text-sm font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#E5E7EB] truncate">{emp.fullName}</p>
                  <p className="text-xs text-[#94A3B8]">{emp.department} &middot; {emp._count.assignedTasks} tasks</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: emp.performanceScore >= 80 ? '#00FFB2' : emp.performanceScore >= 60 ? '#F59E0B' : '#EF4444' }}>
                    {emp.performanceScore}%
                  </p>
                </div>
              </div>
            ))}
            {(!data?.employeePerformance || data.employeePerformance.length === 0) && (
              <p className="text-sm text-[#94A3B8] text-center py-8">No employee data</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Team Chat Section */}
      <motion.div variants={itemVariants}>
        <TeamChat />
      </motion.div>
    </motion.div>
  );
}
