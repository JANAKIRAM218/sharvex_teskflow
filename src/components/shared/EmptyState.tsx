'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import GlowButton from './GlowButton';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'flex flex-col items-center justify-center px-4 py-16 text-center',
        className
      )}
    >
      {/* Icon with glow */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-[#00FFB2]/10 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <Icon className="h-10 w-10 text-[#00FFB2]" />
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>

      {/* Description */}
      <p className="mb-6 max-w-sm text-sm text-[#94A3B8]">{description}</p>

      {/* Optional action button */}
      {actionLabel && onAction && (
        <GlowButton onClick={onAction} size="md">
          {actionLabel}
        </GlowButton>
      )}
    </motion.div>
  );
}
