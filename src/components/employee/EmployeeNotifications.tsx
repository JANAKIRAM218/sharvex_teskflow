'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  CheckCheck,
  Clock,
  ListTodo,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  userId: string;
  userRole: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

export default function EmployeeNotifications() {
  const { user, token } = useAuthStore();
  const { setCurrentPage } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/notifications?userId=${user.id}&userRole=employee`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token || !user?.id) return;
    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ markAll: true, userId: user.id }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success('All notifications marked as read');
      } else {
        toast.error('Failed to mark all as read');
      }
    } catch {
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    // Navigate to my-tasks if it's a task-related notification
    if (notification.relatedId || notification.type === 'task') {
      setCurrentPage('my-tasks');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <ListTodo className="size-5" />;
      case 'deadline':
        return <AlertTriangle className="size-5" />;
      case 'completed':
        return <CheckCircle2 className="size-5" />;
      case 'info':
        return <Info className="size-5" />;
      default:
        return <Bell className="size-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task':
        return { bg: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', border: 'rgba(0, 229, 255, 0.2)' };
      case 'deadline':
        return { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' };
      case 'completed':
        return { bg: 'rgba(0, 255, 178, 0.1)', color: '#00FFB2', border: 'rgba(0, 255, 178, 0.2)' };
      default:
        return { bg: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA', border: 'rgba(167, 139, 250, 0.2)' };
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 bg-dark-card" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl bg-dark-card" />
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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Bell className="size-7 text-neon" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2.5 py-0.5 rounded-full text-sm font-medium bg-neon/15 text-neon border border-neon/30">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Stay updated with your latest notifications</p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            disabled={markingAll}
            variant="ghost"
            className="text-neon hover:text-neon/80 flex items-center gap-2"
          >
            {markingAll ? (
              <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCheck className="size-4" />
            )}
            Mark all as read
          </Button>
        )}
      </motion.div>

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 text-center"
            >
              <BellOff className="size-16 text-muted-foreground mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-foreground mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                You&apos;re all caught up! Notifications will appear here when there&apos;s something new.
              </p>
            </motion.div>
          ) : (
            notifications.map((notification) => {
              const colors = getNotificationColor(notification.type);

              return (
                <motion.div
                  key={notification.id}
                  variants={itemVariants}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0, padding: 0 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={`glass-card glass-card-hover p-4 cursor-pointer flex items-start gap-4 transition-all ${
                    !notification.isRead ? 'border-l-2' : ''
                  }`}
                  style={{
                    borderLeftColor: !notification.isRead ? colors.color : undefined,
                    background: !notification.isRead
                      ? `${colors.bg}`
                      : undefined,
                  }}
                >
                  {/* Icon */}
                  <div
                    className="size-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: colors.bg,
                      color: colors.color,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </h3>
                        <p className={`text-xs mt-0.5 ${!notification.isRead ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notification.isRead && (
                          <span className="size-2 rounded-full bg-neon neon-pulse" />
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Load More / Summary */}
      {notifications.length > 0 && (
        <motion.div variants={itemVariants} className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Showing {notifications.length} notification{notifications.length > 1 ? 's' : ''}
            {unreadCount > 0 && ` · ${unreadCount} unread`}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
