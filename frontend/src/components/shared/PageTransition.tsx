import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="h-full"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
      transition={{
        duration: reduceMotion ? 0 : 0.1,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}
