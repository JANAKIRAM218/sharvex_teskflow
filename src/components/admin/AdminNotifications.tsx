'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCheck, Clock, AlertTriangle, Info,
  CheckCircle2, BellOff, Loader2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  userId: string;
  userRole: string;
  relatedId: string | null;
  isRead: boolean;
  createdAt: string;
}

const notifIcon = (type: string) => {
  if (type === 'task') return <CheckCircle2 className="w-4 h-4" />;
  if (type === 'deadline') return <Clock className="w-4 h-4" />;
  if (type === 'system') return <AlertTriangle className="w-4 h-4" />;
  return <Info className="w-4 h-4" />;
};

const notifColor = (type: string) => {
  if (type === 'task') return { bg: 'rgba(0,255,178,0.1)', text: '#00FFB2', border: 'rgba(0,255,178,0.2)' };
  if (type === 'deadline') return { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', border: 'rgba(245,158,11,0.2)' };
  if (type === 'system') return { bg: 'rgba(239,68,68,0.1)', text: '#EF4444', border: 'rgba(239,68,68,0.2)' };
  return { bg: 'rgba(0,229,255,0.1)', text: '#00E5FF', border: 'rgba(0,229,255,0.2)' };
};

export default function AdminNotifications() {
  const { token, user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams({
        userId: user?.id || '',
        userRole: 'admin',
      });
      const res = await fetch(`/api/notifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token, user?.id]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch {
      toast.error('Failed to mark notification');
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true, userId: user?.id }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read');
      }
    } catch {
      toast.error('Failed to mark all notifications');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-[#00FFB2]" />
          <h2 className="text-xl font-bold text-[#E5E7EB]">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(0,255,178,0.15)] text-[#00FFB2] border border-[rgba(0,255,178,0.3)]">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[rgba(0,255,178,0.3)] text-[#00FFB2] text-sm hover:bg-[rgba(0,255,178,0.1)] transition-colors disabled:opacity-50 self-start"
          >
            {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Mark All Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-4 h-20 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center">
          <BellOff className="w-12 h-12 text-[#94A3B8] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#E5E7EB] mb-1">No Notifications</h3>
          <p className="text-sm text-[#94A3B8]">You&apos;re all caught up! Notifications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
          <AnimatePresence>
            {notifications.map((notif, i) => {
              const colors = notifColor(notif.type);
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                  className={`glass-card p-4 rounded-2xl cursor-pointer transition-all ${
                    notif.isRead
                      ? 'opacity-60'
                      : 'glass-card-hover border-l-2'
                  }`}
                  style={{
                    borderLeftColor: notif.isRead ? undefined : colors.text,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                    >
                      {notifIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium text-[#E5E7EB]">{notif.title}</h4>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#00FFB2] shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-[#94A3B8]/60 mt-2">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
