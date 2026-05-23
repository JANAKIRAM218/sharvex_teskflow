'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className,
  glow = false,
  hoverable = false,
  onClick,
}: GlassCardProps) {
  const Component = hoverable ? motion.div : 'div';

  const motionProps = hoverable
    ? {
        whileHover: {
          y: -2,
          borderColor: 'rgba(0, 255, 178, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 15px rgba(0, 255, 178, 0.1)',
          transition: { duration: 0.2 },
        },
        whileTap: onClick ? { scale: 0.99 } : undefined,
      }
    : {};

  return (
    <Component
      className={cn(
        'glass-card relative overflow-hidden',
        hoverable && 'glass-card-hover cursor-pointer',
        glow && 'neon-border',
        className
      )}
      onClick={onClick}
      {...motionProps}
    >
      {/* Glow gradient overlay */}
      {glow && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#00FFB2]/5 via-transparent to-[#00E5FF]/5" />
      )}
      <div className="relative z-10">{children}</div>
    </Component>
  );
}
