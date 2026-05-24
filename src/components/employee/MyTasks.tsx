'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListTodo,
  Clock,
  CheckCircle2,
  Loader2,
  Calendar,
  MessageSquare,
  Paperclip,
  Upload,
  Send,
  X,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  updatedAt: string;
  assignedTo: string;
  assignedBy: string;
  employee?: {
    fullName: string;
    department: string;
    designation: string;
  };
  comments?: Comment[];
  attachments?: Attachment[];
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
}

interface Attachment {
  id: string;
  filename: string;
  url: string;
  fileType: string;
  uploadedBy: string;
  createdAt: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function MyTasks() {
  const { user, token } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [statusValue, setStatusValue] = useState('');
  const [commentText, setCommentText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

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

  const fetchTaskDetail = async (taskId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.task;
      }
    } catch (error) {
      console.error('Failed to fetch task detail:', error);
    }
    return null;
  };

  const handleOpenTask = async (task: Task) => {
    setSelectedTask(task);
    setProgressValue(task.progress);
    setStatusValue(task.status);
    setCommentText('');
    setModalOpen(true);
    const detail = await fetchTaskDetail(task.id);
    if (detail) {
      setSelectedTask(detail);
    }
  };

  const handleSaveProgress = async () => {
    if (!token || !selectedTask) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          progress: progressValue,
          status: statusValue,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Progress updated successfully!');
        setSelectedTask(data.task);
        fetchTasks();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update progress');
      }
    } catch {
      toast.error('Failed to update progress');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!token || !selectedTask || !commentText.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: commentText.trim() }),
      });
      if (res.ok) {
        toast.success('Comment added!');
        setCommentText('');
        const detail = await fetchTaskDetail(selectedTask.id);
        if (detail) setSelectedTask(detail);
      } else {
        toast.error('Failed to add comment');
      }
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSendingComment(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!token || !selectedTask || !e.target.files?.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      formData.append('taskId', selectedTask.id);
      formData.append('uploadedBy', user?.id || '');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (uploadRes.ok) {
        toast.success('File uploaded successfully!');
        const detail = await fetchTaskDetail(selectedTask.id);
        if (detail) setSelectedTask(detail);
      } else {
        toast.error('Failed to upload file');
      }
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
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

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'in-progress') return task.status === 'in-progress';
    return task.status === activeTab;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <Skeleton className="h-10 w-80" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#E5E7EB] flex items-center gap-2">
          <ListTodo className="size-7 text-[#00FFB2]" />
          My Tasks
        </h1>
        <p className="text-[#94A3B8] mt-1">Manage and track your assigned tasks</p>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]">
          <TabsTrigger value="all" className="data-[state=active]:text-[#00FFB2]">All ({tasks.length})</TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:text-yellow-400">
            Pending ({tasks.filter((t) => t.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="data-[state=active]:text-[#00E5FF]">
            In Progress ({tasks.filter((t) => t.status === 'in-progress').length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:text-[#00FFB2]">
            Completed ({tasks.filter((t) => t.status === 'completed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 text-center"
            >
              <ListTodo className="size-16 text-[#94A3B8] mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-[#E5E7EB] mb-2">No tasks found</h3>
              <p className="text-[#94A3B8]">
                {activeTab === 'all'
                  ? 'You have no tasks assigned yet.'
                  : `No ${activeTab.replace('-', ' ')} tasks at the moment.`}
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {filteredTasks.map((task) => {
                const daysLeft = getDaysLeft(task.deadline);
                const isOverdue = daysLeft !== null && daysLeft < 0;
                const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;

                return (
                  <motion.div
                    key={task.id}
                    variants={cardVariants}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleOpenTask(task)}
                    className="task-card glass-card glass-card-hover p-5 cursor-pointer relative overflow-hidden"
                  >
                    {/* Priority indicator */}
                    <div
                      className="absolute top-0 left-0 w-1 h-full"
                      style={{
                        background: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#00FFB2',
                      }}
                    />

                    <div className="pl-2">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-[#E5E7EB] line-clamp-2 flex-1">
                          {task.title}
                        </h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(task.status)}`}>
                          {task.status.replace('-', ' ')}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-[#94A3B8] mb-3 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.deadline && (
                          <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : isUrgent ? 'text-yellow-400' : 'text-[#94A3B8]'}`}>
                            {isOverdue ? <AlertTriangle className="size-3" /> : <Calendar className="size-3" />}
                            {isOverdue ? `${Math.abs(daysLeft!)}d overdue` : isUrgent ? `${daysLeft}d left` : new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-[#94A3B8]">Progress</span>
                          <span className="text-[#E5E7EB] font-medium">{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-1.5" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0B0F19] border-[rgba(255,255,255,0.08)]">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl text-[#E5E7EB] flex items-center gap-3">
                  {selectedTask.title}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(selectedTask.status)}`}>
                    {selectedTask.status.replace('-', ' ')}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-[#94A3B8]">
                  {selectedTask.description || 'No description provided'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-2">
                {/* Task Meta */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-xs text-[#94A3B8] mb-1">Priority</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(selectedTask.priority)}`}>
                      {selectedTask.priority}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-xs text-[#94A3B8] mb-1">Deadline</p>
                    <p className="text-sm text-[#E5E7EB]">
                      {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-xs text-[#94A3B8] mb-1">Created</p>
                    <p className="text-sm text-[#E5E7EB]">
                      {new Date(selectedTask.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-xs text-[#94A3B8] mb-1">Department</p>
                    <p className="text-sm text-[#E5E7EB]">{selectedTask.employee?.department || '-'}</p>
                  </div>
                </div>

                {/* Progress Slider */}
                <div className="p-4 rounded-xl" style={{ background: 'rgba(0, 255, 178, 0.03)', border: '1px solid rgba(0, 255, 178, 0.1)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-[#E5E7EB]">Progress</p>
                    <span className="text-lg font-bold text-[#00FFB2]">{progressValue}%</span>
                  </div>
                  <Slider
                    value={[progressValue]}
                    onValueChange={(v) => setProgressValue(v[0])}
                    min={0}
                    max={100}
                    step={5}
                    className="mb-2"
                  />
                  <Progress value={progressValue} className="h-2" />
                </div>

                {/* Status Change */}
                <div className="flex items-center gap-4">
                  <p className="text-sm font-medium text-[#E5E7EB]">Status:</p>
                  <Select value={statusValue} onValueChange={setStatusValue}>
                    <SelectTrigger className="w-44 bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSaveProgress}
                  disabled={saving}
                  className="glow-button w-full"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    'Update Progress'
                  )}
                </Button>

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-[#E5E7EB] flex items-center gap-2">
                      <Paperclip className="size-4 text-[#00E5FF]" />
                      Attachments ({selectedTask.attachments?.length || 0})
                    </h4>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      <span className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg ${uploading ? 'opacity-50' : 'hover:bg-white/5'} transition-colors`} style={{ background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                        <Upload className="size-3" />
                        {uploading ? 'Uploading...' : 'Upload'}
                      </span>
                    </label>
                  </div>
                  {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTask.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <Paperclip className="size-3 text-[#94A3B8]" />
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#00E5FF] hover:underline flex-1 truncate"
                          >
                            {att.filename}
                          </a>
                          <span className="text-xs text-[#94A3B8]">{att.fileType}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#94A3B8]">No attachments yet</p>
                  )}
                </div>

                {/* Comments */}
                <div>
                  <h4 className="text-sm font-medium text-[#E5E7EB] flex items-center gap-2 mb-3">
                    <MessageSquare className="size-4 text-[#00E5FF]" />
                    Comments ({selectedTask.comments?.length || 0})
                  </h4>

                  {/* Add Comment */}
                  <div className="flex items-end gap-2 mb-4">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="min-h-[60px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] resize-none text-sm"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || sendingComment}
                      size="icon"
                      className="shrink-0 bg-[rgba(0,229,255,0.2)] text-[#00E5FF] hover:bg-[rgba(0,229,255,0.3)] border border-[rgba(0,229,255,0.3)] h-10 w-10"
                    >
                      {sendingComment ? (
                        <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </div>

                  {/* Comments List */}
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedTask.comments.map((comment) => (
                        <div key={comment.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-[#00FFB2]">{comment.authorName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${comment.authorRole === 'admin' ? 'bg-purple-500/15 text-purple-400' : 'bg-[rgba(0,229,255,0.15)] text-[#00E5FF]'}`}>
                              {comment.authorRole}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] ml-auto">
                              {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-[#E5E7EB]">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#94A3B8]">No comments yet</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
