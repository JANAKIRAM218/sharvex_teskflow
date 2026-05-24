'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ElementType;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-[#00FFB2] to-[#00E5FF] text-[#0B0F19] font-semibold shadow-[0_0_15px_rgba(0,255,178,0.2)] hover:shadow-[0_0_25px_rgba(0,255,178,0.4),0_0_50px_rgba(0,229,255,0.2)]',
  secondary:
    'bg-white/[0.05] text-white border border-white/[0.1] hover:bg-white/[0.08] hover:border-[#00FFB2]/30 hover:shadow-[0_0_15px_rgba(0,255,178,0.1)]',
  danger:
    'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-7 text-base gap-2.5 rounded-xl',
};

export default function GlowButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  children,
  className,
  disabled,
  ...props
}: GlowButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200',
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && 'pointer-events-none opacity-50',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      {children && <span>{children}</span>}
    </motion.button>
  );
}
