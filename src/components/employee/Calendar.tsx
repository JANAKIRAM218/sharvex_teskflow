'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ListTodo, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { type DateValue } from 'react-day-picker';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  progress: number;
  deadline?: string;
  createdAt: string;
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

export default function EmployeeCalendar() {
  const { user, token } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchTasks = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks?assignedTo=${user.id}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Group tasks by deadline date
  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (task.deadline) {
      const dateKey = new Date(task.deadline).toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(task);
    }
    return acc;
  }, {});

  // Get tasks for selected date
  const selectedDateKey = selectedDate
    ? selectedDate.toISOString().split('T')[0]
    : '';
  const selectedDateTasks = selectedDateKey ? (tasksByDate[selectedDateKey] || []) : [];

  // Check if a date has tasks
  const hasTasks = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return !!tasksByDate[dateKey]?.length;
  };

  // Get task count for a date
  const getTaskCount = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return tasksByDate[dateKey]?.length || 0;
  };

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

  const getDaysLeft = (deadline?: string) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <Skeleton className="h-96 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
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
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl md:text-3xl font-bold text-[#E5E7EB] flex items-center gap-2">
          <CalendarDays className="size-7 text-[#00FFB2]" />
          Calendar
        </h1>
        <p className="text-[#94A3B8] mt-1">View your task deadlines on a calendar</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <motion.div variants={itemVariants} className="glass-card p-6 lg:col-span-2">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#E5E7EB]">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMonthChange('prev')}
                className="text-[#94A3B8] hover:text-[#E5E7EB]"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentMonth(new Date());
                  setSelectedDate(new Date());
                }}
                className="text-[#00FFB2] hover:text-[#00FFB2]/80 text-xs"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMonthChange('next')}
                className="text-[#94A3B8] hover:text-[#E5E7EB]"
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>

          {/* Calendar Component with custom day rendering */}
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={(date: DateValue) => {
              if (date instanceof Date || date === undefined) {
                setSelectedDate(date);
              }
            }}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="rounded-xl"
            modifiers={{
              hasTasks: (date: Date) => hasTasks(date),
            }}
            modifiersClassNames={{
              hasTasks: 'has-tasks',
            }}
            components={{
              DayButton: ({ day, modifiers, ...props }) => {
                const dateObj = day.date;
                const taskCount = getTaskCount(dateObj);
                const isToday = modifiers.today;
                const isSelected = modifiers.selected;

                return (
                  <button
                    {...props}
                    className={`
                      relative flex flex-col items-center justify-center
                      size-10 rounded-lg text-sm transition-all duration-200
                      ${isSelected ? 'bg-[#00FFB2] text-[#0B0F19] font-bold neon-glow' : ''}
                      ${isToday && !isSelected ? 'bg-[#00E5FF]/15 text-[#00E5FF] font-semibold border border-[rgba(0,229,255,0.3)]' : ''}
                      ${!isSelected && !isToday ? 'hover:bg-white/5 text-[#E5E7EB]' : ''}
                    `}
                  >
                    <span>{dateObj.getDate()}</span>
                    {taskCount > 0 && (
                      <div className="absolute bottom-0.5 flex gap-0.5">
                        {Array.from({ length: Math.min(taskCount, 3) }).map((_, i) => (
                          <span
                            key={i}
                            className={`size-1 rounded-full ${isSelected ? 'bg-[#0B0F19]' : 'bg-[#00FFB2]'}`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              },
            }}
          />

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#00FFB2]" />
              <span className="text-xs text-[#94A3B8]">Task deadline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#00E5FF]" />
              <span className="text-xs text-[#94A3B8]">Today</span>
            </div>
          </div>
        </motion.div>

        {/* Selected Date Tasks Panel */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#E5E7EB]">
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Select a date'}
            </h2>
            <p className="text-sm text-[#94A3B8]">
              {selectedDateTasks.length > 0
                ? `${selectedDateTasks.length} task${selectedDateTasks.length > 1 ? 's' : ''} due`
                : 'No tasks due on this date'}
            </p>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {selectedDateTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <CalendarDays className="size-12 text-[#94A3B8] mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-[#94A3B8]">No tasks on this date</p>
                </motion.div>
              ) : (
                selectedDateTasks.map((task, index) => {
                  const daysLeft = getDaysLeft(task.deadline);
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="task-card glass-card glass-card-hover p-4"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-medium text-[#E5E7EB] line-clamp-1">{task.title}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(task.status)}`}>
                          {task.status.replace('-', ' ')}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-[#94A3B8] mb-2 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                        {isOverdue && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <AlertTriangle className="size-3" />
                            Overdue
                          </span>
                        )}
                        {isUrgent && !isOverdue && (
                          <span className="flex items-center gap-1 text-xs text-yellow-400">
                            <Clock className="size-3" />
                            {daysLeft}d left
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#94A3B8]">Progress</span>
                          <span className="text-[#E5E7EB] font-medium">{task.progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div
                            className="h-full rounded-full progress-animate"
                            style={{
                              width: `${task.progress}%`,
                              background: task.progress === 100
                                ? '#00FFB2'
                                : task.progress >= 50
                                  ? '#00E5FF'
                                  : '#F59E0B',
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Upcoming Deadlines Summary */}
      <motion.div variants={itemVariants} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-[#E5E7EB] flex items-center gap-2 mb-4">
          <Clock className="size-5 text-[#00E5FF]" />
          Upcoming Deadlines
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tasks
            .filter((t) => t.deadline && t.status !== 'completed')
            .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
            .slice(0, 8)
            .map((task) => {
              const daysLeft = getDaysLeft(task.deadline);
              const isOverdue = daysLeft !== null && daysLeft < 0;

              return (
                <div
                  key={task.id}
                  className="p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}` }}
                  onClick={() => setSelectedDate(task.deadline ? new Date(task.deadline) : undefined)}
                >
                  <div
                    className="size-10 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(0,255,178,0.1)',
                      color: isOverdue ? '#EF4444' : '#00FFB2',
                    }}
                  >
                    {task.deadline ? new Date(task.deadline).getDate() : '-'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#E5E7EB] truncate">{task.title}</p>
                    <p className={`text-[10px] ${isOverdue ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                      {isOverdue ? `${Math.abs(daysLeft!)}d overdue` : `${daysLeft}d left`}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
        {tasks.filter((t) => t.deadline && t.status !== 'completed').length === 0 && (
          <div className="text-center py-8">
            <ListTodo className="size-10 text-[#94A3B8] mx-auto mb-2 opacity-30" />
            <p className="text-sm text-[#94A3B8]">No upcoming deadlines</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
