'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Filter, Clock, AlertTriangle, CheckCircle2,
  X, Loader2, CalendarIcon, User, MessageSquare, Paperclip,
  GripVertical
} from 'lucide-react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
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

interface TaskEmployee {
  id: string;
  fullName: string;
  department: string;
  designation: string;
  profileImage: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignedTo: string;
  assignedBy: string;
  priority: string;
  status: string;
  progress: number;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  employee: TaskEmployee;
  comments?: Array<{ id: string; content: string; createdAt: string; authorName: string }>;
  attachments?: Array<{ id: string; fileName: string; fileUrl: string; fileType: string; createdAt: string }>;
}

interface Employee {
  id: string;
  fullName: string;
  department: string;
}

const COLUMNS = [
  { id: 'pending', label: 'Pending', color: '#F59E0B', icon: Clock },
  { id: 'in-progress', label: 'In Progress', color: '#00E5FF', icon: AlertTriangle },
  { id: 'completed', label: 'Completed', color: '#00FFB2', icon: CheckCircle2 },
];

const priorityColor = (p: string) => {
  if (p === 'high') return 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[rgba(239,68,68,0.3)]';
  if (p === 'medium') return 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]';
  return 'bg-[rgba(0,255,178,0.15)] text-[#00FFB2] border-[rgba(0,255,178,0.3)]';
};

function SortableTaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: (t: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const deadlineDate = task.deadline ? new Date(task.deadline) : null;
  const isOverdue = deadlineDate && deadlineDate < new Date() && task.status !== 'completed';

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className="task-card glass-card p-4 rounded-xl cursor-pointer"
        onClick={() => onClick(task)}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-medium text-[#E5E7EB] line-clamp-2 flex-1 mr-2">{task.title}</h4>
          <div {...listeners} className="cursor-grab text-[#94A3B8] hover:text-[#E5E7EB]">
            <GripVertical className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${priorityColor(task.priority)}`}>
            {task.priority}
          </span>
          {isOverdue && (
            <span className="text-[10px] text-[#EF4444]">Overdue</span>
          )}
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] mb-3">
          <div
            className="h-full rounded-full progress-animate"
            style={{
              width: `${task.progress}%`,
              background: task.progress === 100
                ? '#00FFB2'
                : task.progress > 50
                  ? '#00E5FF'
                  : '#F59E0B',
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#00FFB2] to-[#00E5FF] flex items-center justify-center text-[#0B0F19] text-[8px] font-bold">
              {task.employee.fullName.charAt(0)}
            </div>
            <span className="text-[10px] text-[#94A3B8]">{task.employee.fullName}</span>
          </div>
          {task.deadline && (
            <span className="text-[10px] text-[#94A3B8] flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TaskManagement() {
  const { token } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    deadline: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createDeadline, setCreateDeadline] = useState<Date | undefined>(undefined);

  // Detail modal state
  const [detailProgress, setDetailProgress] = useState(0);
  const [detailStatus, setDetailStatus] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const formatJoinDate = (date: Date | undefined) => {
    if (!date) return 'Pick a date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterAssignee) params.set('assignedTo', filterAssignee);

      const res = await fetch(`/api/tasks?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus, filterPriority, filterAssignee]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees);
      }
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, [fetchTasks, fetchEmployees]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Find the target column
    let targetStatus = '';
    for (const col of COLUMNS) {
      // Check if dropped on a column header area or within the same column
      const colEl = document.getElementById(`column-${col.id}`);
      if (colEl) {
        const rect = colEl.getBoundingClientRect();
        const overRect = (over as unknown as { rect: DOMRect }).rect;
        if (overRect && rect.left <= overRect.right && rect.right >= overRect.left &&
            rect.top <= overRect.bottom && rect.bottom >= overRect.top) {
          targetStatus = col.id;
          break;
        }
      }
    }

    // Try to get status from the droppable id
    if (!targetStatus) {
      const overId = over.id as string;
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    // Check column drop zones
    if (!targetStatus) {
      for (const col of COLUMNS) {
        if (over.id === col.id || String(over.id).startsWith(col.id)) {
          targetStatus = col.id;
          break;
        }
      }
    }

    if (!targetStatus || targetStatus === task.status) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
        );
        toast.error('Failed to update task status');
      } else {
        toast.success(`Task moved to ${COLUMNS.find((c) => c.id === targetStatus)?.label}`);
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
      toast.error('Failed to update task status');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.assignedTo) {
      toast.error('Title and assignee are required');
      return;
    }
    setCreateLoading(true);
    try {
      const deadline = createDeadline ? createDeadline.toISOString().split('T')[0] : '';
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, deadline }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create task');
        return;
      }
      toast.success('Task created successfully!');
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '', assignedTo: '', priority: 'medium', deadline: '' });
      setCreateDeadline(undefined);
      fetchTasks();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setCreateLoading(false);
    }
  };

  const openDetail = async (task: Task) => {
    setSelectedTask(task);
    setDetailProgress(task.progress);
    setDetailStatus(task.status);
    setShowDetailModal(true);

    // Fetch full task details
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data.task);
        setDetailProgress(data.task.progress);
        setDetailStatus(data.task.status);
      }
    } catch {
      // use the list data
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: detailProgress, status: detailStatus }),
      });
      if (res.ok) {
        toast.success('Task updated!');
        fetchTasks();
        setShowDetailModal(false);
      } else {
        toast.error('Failed to update task');
      }
    } catch {
      toast.error('Failed to update task');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Task deleted!');
        fetchTasks();
        setShowDetailModal(false);
      } else {
        toast.error('Failed to delete task');
      }
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setUpdateLoading(false);
    }
  };

  const getColumnTasks = (status: string) => tasks.filter((t) => t.status === status);

  const activeTask = activeDragId ? tasks.find((t) => t.id === activeDragId) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-[#00FFB2]" />
          <h2 className="text-xl font-bold text-[#E5E7EB]">Task Management</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 text-[#94A3B8]">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filters:</span>
        </div>
        <Select
          value={filterPriority || '__all__'}
          onValueChange={(val) => setFilterPriority(val === '__all__' ? '' : val)}
        >
          <SelectTrigger className="w-full bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
            <SelectItem value="__all__" className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">All Priorities</SelectItem>
            <SelectItem value="high" className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">High</SelectItem>
            <SelectItem value="medium" className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">Medium</SelectItem>
            <SelectItem value="low" className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterAssignee || '__all__'}
          onValueChange={(val) => setFilterAssignee(val === '__all__' ? '' : val)}
        >
          <SelectTrigger className="w-full bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
            <SelectValue placeholder="All Assignees" />
          </SelectTrigger>
          <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
            <SelectItem value="__all__" className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">All Assignees</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id} className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">{emp.fullName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 rounded-2xl h-64 skeleton-shimmer" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((col) => {
              const colTasks = getColumnTasks(col.id);
              return (
                <div
                  key={col.id}
                  id={`column-${col.id}`}
                  className="rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] p-3"
                >
                  {/* Column Header */}
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: col.color, boxShadow: `0 0 8px ${col.color}60` }}
                    />
                    <span className="text-sm font-semibold text-[#E5E7EB]">{col.label}</span>
                    <span className="ml-auto text-xs text-[#94A3B8] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task Cards */}
                  <SortableContext
                    items={colTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3 min-h-[100px]">
                      {colTasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onClick={openDetail}
                        />
                      ))}
                      {colTasks.length === 0 && (
                        <div className="py-8 text-center text-xs text-[#94A3B8]">
                          No tasks
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="glass-card p-4 rounded-xl neon-border opacity-90">
                <h4 className="text-sm font-medium text-[#E5E7EB]">{activeTask.title}</h4>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 rounded-2xl w-full max-w-md neon-border max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#E5E7EB]">Create Task</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-[#94A3B8] hover:text-[#E5E7EB]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-[#94A3B8]">Title *</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="Task title"
                    className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#94A3B8]">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Task description..."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#E5E7EB] text-sm focus:outline-none resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#94A3B8]">Assign To *</label>
                  <Select
                    value={createForm.assignedTo || '__none__'}
                    onValueChange={(val) => setCreateForm({ ...createForm, assignedTo: val === '__none__' ? '' : val })}
                  >
                    <SelectTrigger className="w-full bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
                      <SelectItem value="__none__" className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">Select employee</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">{emp.fullName} - {emp.department}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm text-[#94A3B8]">Priority</label>
                    <Select
                      value={createForm.priority}
                      onValueChange={(val) => setCreateForm({ ...createForm, priority: val })}
                    >
                      <SelectTrigger className="w-full bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
                        <SelectItem value="low" className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">Low</SelectItem>
                        <SelectItem value="medium" className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">Medium</SelectItem>
                        <SelectItem value="high" className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-[#94A3B8]">Deadline</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal rounded-xl bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] ${!createDeadline ? 'text-[#94A3B8]' : 'text-[#E5E7EB]'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formatJoinDate(createDeadline)}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#111827] border-[rgba(255,255,255,0.08)]">
                        <Calendar
                          mode="single"
                          selected={createDeadline}
                          onSelect={setCreateDeadline}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="glow-button w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Task
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 rounded-2xl w-full max-w-lg neon-border max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#E5E7EB] pr-4">{selectedTask.title}</h3>
                <button onClick={() => setShowDetailModal(false)} className="text-[#94A3B8] hover:text-[#E5E7EB] shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedTask.description && (
                <p className="text-sm text-[#94A3B8] mb-4">{selectedTask.description}</p>
              )}

              {/* Task Meta */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-[#00FFB2]" />
                  <span className="text-[#94A3B8]">Assignee:</span>
                  <span className="text-[#E5E7EB]">{selectedTask.employee.fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${priorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                </div>
                {selectedTask.deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="w-4 h-4 text-[#00E5FF]" />
                    <span className="text-[#94A3B8]">Deadline:</span>
                    <span className="text-[#E5E7EB]">{new Date(selectedTask.deadline).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Status & Progress Controls */}
              <div className="space-y-4 mb-6 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <div className="space-y-2">
                  <label className="text-sm text-[#94A3B8]">Status</label>
                  <Select
                    value={detailStatus}
                    onValueChange={setDetailStatus}
                  >
                    <SelectTrigger className="w-full bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
                      {COLUMNS.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)] cursor-pointer">{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-[#94A3B8]">Progress</label>
                    <span className="text-sm text-[#00FFB2] font-mono">{detailProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={detailProgress}
                    onChange={(e) => setDetailProgress(parseInt(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #00FFB2 ${detailProgress}%, rgba(255,255,255,0.06) ${detailProgress}%)`,
                    }}
                  />
                </div>
              </div>

              {/* Comments */}
              {selectedTask.comments && selectedTask.comments.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-[#A78BFA]" />
                    <span className="text-sm font-medium text-[#E5E7EB]">Comments ({selectedTask.comments.length})</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedTask.comments.map((c) => (
                      <div key={c.id} className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] text-sm">
                        <p className="text-[#E5E7EB]">{c.content}</p>
                        <p className="text-[10px] text-[#94A3B8] mt-1">{c.authorName} &middot; {new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="w-4 h-4 text-[#F59E0B]" />
                    <span className="text-sm font-medium text-[#E5E7EB]">Attachments ({selectedTask.attachments.length})</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedTask.attachments.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.03)] text-sm">
                        <Paperclip className="w-3 h-3 text-[#94A3B8]" />
                        <span className="text-[#E5E7EB] text-xs">{a.fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateTask}
                  disabled={updateLoading}
                  className="flex-1 glow-button py-2 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Changes
                </button>
                <button
                  onClick={handleDeleteTask}
                  disabled={updateLoading}
                  className="px-4 py-2 rounded-xl bg-[rgba(239,68,68,0.15)] text-[#EF4444] text-sm border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.25)] transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
