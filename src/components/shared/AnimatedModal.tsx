'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface AnimatedModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: ModalSize;
}

const sizeMap: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function AnimatedModal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: AnimatedModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          'border-white/[0.08] bg-[#111827]/95 backdrop-blur-xl',
          sizeMap[size]
        )}
        showCloseButton={false}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Header with neon accent */}
              <DialogHeader className="relative mb-4">
                <div className="absolute -top-6 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FFB2] to-transparent" />
                <div className="flex items-center justify-between pr-8">
                  <DialogTitle className="text-lg font-semibold text-white">
                    {title}
                  </DialogTitle>
                </div>
                {description && (
                  <DialogDescription className="text-sm text-[#94A3B8]">
                    {description}
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Content */}
              <div className="mt-2">{children}</div>

              {/* Close button with glow */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-[#94A3B8] transition-all hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_10px_rgba(0,255,178,0.2)]"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
