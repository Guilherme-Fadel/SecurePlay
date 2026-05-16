import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxWidth?: string;
  maxHeight?: string;
}

export function Modal({
  open,
  onClose,
  children,
  title,
  maxWidth = 'max-w-350',
  maxHeight = 'max-h-200'
}: ModalProps) {

  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
        {/*Blur overlay*/}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative z-10 w-full ${maxWidth} ${maxHeight} mx-4 bg-[var(--surface)] border-2 border-[var(--border)] rounded-xl shadow-2xl`}
          >
            {/*Header com title*/}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                <h2 className="text-[var(--text-primary)] text-lg font-semibold">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md hover:bg-[var(--background)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  aria-label="Fechar modal"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            {/*Header sem title*/}
            {!title && (
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--background)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            )}

            {/*Conteúdo*/}
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
