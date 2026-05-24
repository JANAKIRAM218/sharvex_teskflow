'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
  Download,
  Plus,
  X,
  Loader2,
  FolderOpen,
  Paperclip,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface WorkUploadItem {
  id: string;
  employeeId: string;
  taskId: string | null;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
  createdAt: string;
  employee?: {
    fullName: string;
    employeeCode: string;
  };
}

interface Task {
  id: string;
  title: string;
  status: string;
}

const CATEGORIES = [
  { value: 'general', label: 'General', icon: FolderOpen },
  { value: 'screenshot', label: 'Screenshot', icon: ImageIcon },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'report', label: 'Report', icon: File },
  { value: 'assignment', label: 'Assignment', icon: Paperclip },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function WorkUploads() {
  const { user, token } = useAuthStore();
  const [uploads, setUploads] = useState<WorkUploadItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formTaskId, setFormTaskId] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUploads = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/work-uploads?employeeId=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUploads(data.uploads || []);
      }
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  const fetchTasks = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      const res = await fetch(`/api/tasks?assignedTo=${user.id}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchUploads();
    fetchTasks();
  }, [fetchUploads, fetchTasks]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle && !formFile) {
      toast.error('Please provide a title or file');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('employeeId', user?.id || '');
      formData.append('title', formTitle || formFile?.name || 'Upload');
      if (formDescription) formData.append('description', formDescription);
      formData.append('category', formCategory);
      if (formTaskId && formTaskId !== '__none__') formData.append('taskId', formTaskId);
      if (formFile) formData.append('file', formFile);

      const res = await fetch('/api/work-uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        toast.success('Work uploaded successfully!');
        setShowAddModal(false);
        resetForm();
        fetchUploads();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to upload');
      }
    } catch {
      toast.error('Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (uploadId: string) => {
    try {
      const res = await fetch(`/api/work-uploads/${uploadId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Upload deleted');
        fetchUploads();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('general');
    setFormTaskId('');
    setFormFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('doc')) return FileText;
    return File;
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }} />
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#E5E7EB] flex items-center gap-2">
            <Upload className="size-7 text-[#00FFB2]" />
            Work Uploads
          </h1>
          <p className="text-[#94A3B8] mt-1">Upload and manage your work files, screenshots, and documents</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Upload Work
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map((cat) => {
          const count = uploads.filter(u => u.category === cat.value).length;
          const Icon = cat.icon;
          return (
            <div key={cat.value} className="glass-card p-4 text-center">
              <Icon className="size-5 mx-auto mb-2 text-[#00E5FF]" />
              <p className="text-lg font-bold text-[#E5E7EB]">{count}</p>
              <p className="text-xs text-[#94A3B8]">{cat.label}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Uploads Grid */}
      {uploads.length === 0 ? (
        <motion.div variants={itemVariants} className="glass-card p-12 text-center">
          <Upload className="size-16 text-[#94A3B8] mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium text-[#E5E7EB] mb-2">No uploads yet</h3>
          <p className="text-[#94A3B8] mb-4">Start uploading your work files, screenshots, and documents</p>
          <Button onClick={() => setShowAddModal(true)} className="glow-button">
            <Plus className="size-4 mr-2" /> Upload Work
          </Button>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploads.map((upload) => {
            const FileIcon = getFileIcon(upload.fileType);
            const catInfo = getCategoryInfo(upload.category);
            const isImage = upload.fileType.startsWith('image/');
            const relatedTask = upload.taskId ? tasks.find(t => t.id === upload.taskId) : null;

            return (
              <motion.div
                key={upload.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                className="glass-card glass-card-hover p-5 cursor-default relative overflow-hidden group"
              >
                {/* Preview */}
                {isImage && upload.fileUrl ? (
                  <div className="mb-3 rounded-xl overflow-hidden h-32 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                    <img
                      src={upload.fileUrl}
                      alt={upload.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-3 rounded-xl h-32 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
                    <FileIcon className="size-10 text-[#94A3B8] opacity-30" />
                  </div>
                )}

                {/* Category badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(0,229,255,0.1)', color: '#00E5FF', border: '1px solid rgba(0,229,255,0.2)' }}>
                    {catInfo.label}
                  </span>
                  {relatedTask && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(0,255,178,0.1)', color: '#00FFB2', border: '1px solid rgba(0,255,178,0.2)' }}>
                      Task: {relatedTask.title.substring(0, 15)}{relatedTask.title.length > 15 ? '...' : ''}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-sm font-medium text-[#E5E7EB] line-clamp-1">{upload.title}</h3>
                {upload.description && (
                  <p className="text-xs text-[#94A3B8] line-clamp-2 mt-1">{upload.description}</p>
                )}

                {/* File info & actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                  <div className="text-xs text-[#94A3B8]">
                    {upload.fileName && (
                      <span>{upload.fileName.substring(0, 20)}{upload.fileName.length > 20 ? '...' : ''}</span>
                    )}
                    {upload.fileSize > 0 && <span> · {formatFileSize(upload.fileSize)}</span>}
                    <span> · {new Date(upload.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {upload.fileUrl && (
                      <a
                        href={upload.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-[rgba(0,229,255,0.1)] text-[#94A3B8] hover:text-[#00E5FF] transition-colors"
                      >
                        <Download className="size-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(upload.id)}
                      className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-[#94A3B8] hover:text-[#EF4444] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Add Upload Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowAddModal(false); resetForm(); }}
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
                  <Upload className="size-5 text-[#00FFB2]" />
                  Upload Work
                </h3>
                <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-[#94A3B8] hover:text-[#E5E7EB]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs">Title *</Label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Enter work title"
                    className="bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs">Description</Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="min-h-[80px] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs">Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="w-full bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)]">
                          <span className="flex items-center gap-2">
                            <cat.icon className="size-3.5 text-[#00E5FF]" />
                            {cat.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {tasks.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[#94A3B8] text-xs">Link to Task (optional)</Label>
                    <Select value={formTaskId || '__none__'} onValueChange={setFormTaskId}>
                      <SelectTrigger className="w-full bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] text-[#E5E7EB]">
                        <SelectValue placeholder="No task linked" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111827] border-[rgba(255,255,255,0.08)]">
                        <SelectItem value="__none__" className="text-[#94A3B8] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)]">
                          No task linked
                        </SelectItem>
                        {tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id} className="text-[#E5E7EB] focus:text-[#E5E7EB] focus:bg-[rgba(255,255,255,0.05)]">
                            {task.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[#94A3B8] text-xs">File</Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[rgba(255,255,255,0.1)] rounded-xl p-6 text-center cursor-pointer hover:border-[rgba(0,255,178,0.3)] hover:bg-[rgba(0,255,178,0.03)] transition-all"
                  >
                    {formFile ? (
                      <div className="space-y-2">
                        <FileText className="size-8 text-[#00FFB2] mx-auto" />
                        <p className="text-sm text-[#E5E7EB]">{formFile.name}</p>
                        <p className="text-xs text-[#94A3B8]">{formatFileSize(formFile.size)}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="size-8 text-[#94A3B8] mx-auto opacity-50" />
                        <p className="text-sm text-[#94A3B8]">Click to upload or drag a file</p>
                        <p className="text-xs text-[#94A3B8]/50">Images, documents, and other files</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="glow-button w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Work
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
