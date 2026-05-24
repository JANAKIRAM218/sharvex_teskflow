'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';
type Priority = 'low' | 'medium' | 'high';
type EmployeeStatus = 'active' | 'inactive';

type BadgeType = TaskStatus | Priority | EmployeeStatus;

interface StatusBadgeProps {
  status: BadgeType;
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<BadgeType, { label: string; className: string; dotColor: string }> = {
  pending: {
    label: 'Pending',
    className: 'badge-pending',
    dotColor: '#F59E0B',
  },
  'in-progress': {
    label: 'In Progress',
    className: 'badge-in-progress',
    dotColor: '#00E5FF',
  },
  completed: {
    label: 'Completed',
    className: 'badge-completed',
    dotColor: '#00FFB2',
  },
  overdue: {
    label: 'Overdue',
    className: 'badge-overdue',
    dotColor: '#EF4444',
  },
  low: {
    label: 'Low',
    className: 'badge-low',
    dotColor: '#00FFB2',
  },
  medium: {
    label: 'Medium',
    className: 'badge-medium',
    dotColor: '#F59E0B',
  },
  high: {
    label: 'High',
    className: 'badge-high',
    dotColor: '#EF4444',
  },
  active: {
    label: 'Active',
    className: 'badge-completed',
    dotColor: '#00FFB2',
  },
  inactive: {
    label: 'Inactive',
    className: 'badge-overdue',
    dotColor: '#EF4444',
  },
};

export default function StatusBadge({ status, showDot = true, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {showDot && (
        <motion.span
          className="relative flex h-1.5 w-1.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {(status === 'active' || status === 'in-progress') && (
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: config.dotColor }}
              animate={{ scale: [1, 1.8, 1], opacity: [0.75, 0, 0.75] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          <span
            className="relative inline-flex h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: config.dotColor }}
          />
        </motion.span>
      )}
      {config.label}
    </span>
  );
}
