'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, RefreshCw, ChevronRight, Clock, Zap, Users,
  Award, AlertCircle, Loader2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface InsightData {
  summary: {
    totalEmployees: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionRate: number;
    avgPerformance: number;
    highPriorityTasks: number;
  };
  insights: string[];
  recommendations: string[];
  aiSummary: string;
  topPerformers: Array<{
    name: string;
    department: string;
    performanceScore: number;
    completedTasks: number;
  }>;
  atRiskEmployees: Array<{
    name: string;
    department: string;
    performanceScore: number;
    taskCount: number;
  }>;
  departmentInsights: Array<{
    department: string;
    taskCount: number;
    completionRate: number;
    avgPerformance: number;
  }>;
  latePrediction: Array<{
    employee: string;
    taskProgress: number;
    deadline: string;
    priority: string;
  }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function getInsightIcon(insight: string) {
  const lower = insight.toLowerCase();
  if (lower.includes('overdue') || lower.includes('at-risk') || lower.includes('below') || lower.includes('low')) {
    return <TrendingDown className="w-4 h-4 text-[#EF4444]" />;
  }
  if (lower.includes('excellent') || lower.includes('strong') || lower.includes('well')) {
    return <TrendingUp className="w-4 h-4 text-[#00FFB2]" />;
  }
  if (lower.includes('stress') || lower.includes('attention') || lower.includes('immediate')) {
    return <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />;
  }
  return <CheckCircle2 className="w-4 h-4 text-[#00E5FF]" />;
}

function formatCountdown(deadline: string) {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  if (diff <= 0) return { text: 'Overdue', color: '#EF4444' };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return { text: `${days}d ${hours}h left`, color: '#F59E0B' };
  return { text: `${hours}h left`, color: '#EF4444' };
}

function parseBulletPoints(text: string) {
  return text.split('\n').filter((l) => l.trim().length > 0).map((line) => {
    const cleaned = line.replace(/^[•\-\*]\s*/, '').replace(/^\*\*(.*?)\*\*:?/, '$1:');
    return cleaned.trim();
  });
}

export default function AIInsightsPanel() {
  const { token } = useAuthStore();
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error('Failed to generate insights');
      }
      const json = await res.json();
      setData(json);
      toast.success('AI insights generated successfully');
    } catch (err) {
      console.error('AI insights error:', err);
      toast.error('Failed to generate AI insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00FFB2]/20 to-[#00E5FF]/20 flex items-center justify-center border border-[#00FFB2]/20">
              <Brain className="w-6 h-6 text-[#00FFB2]" />
            </div>
            <Sparkles className="w-4 h-4 text-[#00E5FF] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#E5E7EB] flex items-center gap-2">
              AI Productivity Insights
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00FFB2]/10 text-[#00FFB2] border border-[#00FFB2]/20 font-medium uppercase tracking-wider">
                AI Powered
              </span>
            </h2>
            <p className="text-sm text-[#94A3B8]">Intelligent analysis of team productivity and performance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={generateInsights}
              disabled={loading}
              className="h-10 px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-[#94A3B8] hover:bg-white/[0.08] hover:border-[#00FFB2]/30 hover:text-[#00FFB2] transition-all flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(0,255,178,0.3), 0 0 50px rgba(0,229,255,0.15)' }}
            whileTap={{ scale: 0.98 }}
            onClick={generateInsights}
            disabled={loading}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-[#00FFB2] to-[#00E5FF] text-[#0B0F19] font-semibold shadow-[0_0_15px_rgba(0,255,178,0.2)] transition-all flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generate Insights
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Loading State */}
      <AnimatePresence mode="wait">
        {loading && !data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="glass-card p-8 rounded-2xl neon-border">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00FFB2]/20 to-[#00E5FF]/20 flex items-center justify-center neon-pulse">
                    <Brain className="w-8 h-8 text-[#00FFB2] animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[#E5E7EB] font-medium">AI is analyzing...</p>
                  <p className="text-[#94A3B8] text-sm mt-1">Processing team data and generating insights</p>
                </div>
                <div className="w-full max-w-xs space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 rounded-full skeleton-shimmer" style={{ width: `${100 - i * 15}%` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="glass-card p-6 rounded-2xl h-48 skeleton-shimmer" />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insights Content */}
      {data && !loading && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Summary Stats Row */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Completion Rate', value: `${data.summary.completionRate}%`, color: data.summary.completionRate >= 80 ? '#00FFB2' : data.summary.completionRate >= 50 ? '#F59E0B' : '#EF4444' },
              { label: 'Avg Performance', value: `${data.summary.avgPerformance}/100`, color: data.summary.avgPerformance >= 80 ? '#00FFB2' : data.summary.avgPerformance >= 60 ? '#F59E0B' : '#EF4444' },
              { label: 'Overdue Tasks', value: data.summary.overdueTasks, color: data.summary.overdueTasks > 0 ? '#EF4444' : '#00FFB2' },
              { label: 'High Priority', value: data.summary.highPriorityTasks, color: '#A78BFA' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${stat.color}20` }}
                className="glass-card p-4 rounded-xl text-center"
              >
                <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-[#94A3B8] mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* AI Summary Card */}
          <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl neon-border relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#00FFB2]/5 via-transparent to-[#00E5FF]/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#00FFB2]" />
                <h3 className="text-[#E5E7EB] font-semibold">AI Summary</h3>
              </div>
              <div className="space-y-2">
                {parseBulletPoints(data.aiSummary).map((point, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00FFB2] mt-2 shrink-0" />
                    <p className="text-sm text-[#E5E7EB] leading-relaxed">{point}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Insights & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insights */}
            <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-[#00E5FF]" />
                <h3 className="text-[#E5E7EB] font-semibold">Key Insights</h3>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {data.insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(0,229,255,0.1)] shrink-0 mt-0.5">
                      {getInsightIcon(insight)}
                    </div>
                    <p className="text-sm text-[#E5E7EB] leading-relaxed">{insight}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Recommendations */}
            <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-[#00FFB2]" />
                <h3 className="text-[#E5E7EB] font-semibold">Recommendations</h3>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {data.recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-md border-2 border-[#00FFB2]/40 flex items-center justify-center shrink-0 mt-0.5">
                      <ChevronRight className="w-3 h-3 text-[#00FFB2]" />
                    </div>
                    <p className="text-sm text-[#E5E7EB] leading-relaxed">{rec}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Top Performers & At-Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="text-[#E5E7EB] font-semibold">Top Performers</h3>
              </div>
              <div className="space-y-3">
                {data.topPerformers.map((emp, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] text-[#0B0F19] text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#E5E7EB] font-medium truncate">{emp.name}</p>
                      <p className="text-xs text-[#94A3B8]">{emp.department} &middot; {emp.completedTasks} completed</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: emp.performanceScore >= 80 ? '#00FFB2' : '#F59E0B' }}>
                        {emp.performanceScore}%
                      </p>
                    </div>
                  </motion.div>
                ))}
                {data.topPerformers.length === 0 && (
                  <p className="text-sm text-[#94A3B8] text-center py-4">No data available</p>
                )}
              </div>
            </motion.div>

            {/* At-Risk Employees */}
            <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl border-red-500/20 relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                  <h3 className="text-[#E5E7EB] font-semibold">At-Risk Employees</h3>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {data.atRiskEmployees.map((emp, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(239,68,68,0.15)] shrink-0">
                        <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#E5E7EB] font-medium truncate">{emp.name}</p>
                        <p className="text-xs text-[#94A3B8]">{emp.department} &middot; {emp.taskCount} tasks</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#EF4444]">{emp.performanceScore}%</p>
                      </div>
                    </motion.div>
                  ))}
                  {data.atRiskEmployees.length === 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(0,255,178,0.05)] border border-[rgba(0,255,178,0.1)]">
                      <CheckCircle2 className="w-4 h-4 text-[#00FFB2]" />
                      <p className="text-sm text-[#00FFB2]">No at-risk employees detected</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Late Task Predictions */}
          {data.latePrediction.length > 0 && (
            <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl border-[#F59E0B]/20 relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F59E0B]/5 via-transparent to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-[#F59E0B]" />
                  <h3 className="text-[#E5E7EB] font-semibold">Late Task Predictions</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
                    {data.latePrediction.length} at risk
                  </span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {data.latePrediction.map((task, i) => {
                    const countdown = formatCountdown(task.deadline);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(245,158,11,0.1)] shrink-0">
                          <Clock className="w-4 h-4 text-[#F59E0B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#E5E7EB] font-medium truncate">{task.employee}</p>
                          <p className="text-xs text-[#94A3B8]">Progress: {task.taskProgress}% &middot; Priority: {task.priority}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold" style={{ color: countdown.color }}>
                            {countdown.text}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Department Insights */}
          {data.departmentInsights.length > 0 && (
            <motion.div variants={itemVariants} className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#A78BFA]" />
                <h3 className="text-[#E5E7EB] font-semibold">Department Breakdown</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.departmentInsights.map((dept, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:border-[#00FFB2]/20 transition-colors"
                  >
                    <p className="text-sm font-medium text-[#E5E7EB] mb-2">{dept.department}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#94A3B8]">Tasks</span>
                        <span className="text-[#E5E7EB]">{dept.taskCount}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#94A3B8]">Completion</span>
                        <span style={{ color: dept.completionRate >= 80 ? '#00FFB2' : dept.completionRate >= 50 ? '#F59E0B' : '#EF4444' }}>
                          {dept.completionRate}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.06)]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${dept.completionRate}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full rounded-full"
                          style={{
                            background: dept.completionRate >= 80
                              ? 'linear-gradient(90deg, #00FFB2, #00E5FF)'
                              : dept.completionRate >= 50
                              ? '#F59E0B'
                              : '#EF4444',
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#94A3B8]">Avg Perf.</span>
                        <span style={{ color: dept.avgPerformance >= 80 ? '#00FFB2' : dept.avgPerformance >= 60 ? '#F59E0B' : '#EF4444' }}>
                          {dept.avgPerformance}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!data && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 rounded-2xl text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00FFB2]/10 to-[#00E5FF]/10 flex items-center justify-center mx-auto mb-4 neon-pulse">
            <Brain className="w-10 h-10 text-[#00FFB2]" />
          </div>
          <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">Ready for AI Analysis</h3>
          <p className="text-sm text-[#94A3B8] max-w-md mx-auto mb-6">
            Click &ldquo;Generate Insights&rdquo; to analyze team productivity, identify trends, and get AI-powered recommendations.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
