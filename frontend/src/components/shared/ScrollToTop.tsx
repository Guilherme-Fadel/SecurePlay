import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      const shouldBeVisible = window.scrollY > 300;

      setIsVisible((prev) => {
        if (prev !== shouldBeVisible) {
          return shouldBeVisible;
        }
        return prev;
      });
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className=" cursor-none fixed bottom-8 right-8 z-50 w-14 h-14 bg-[var(--secondary)] border-4 border-[var(--border-primary)] shadow-[4px_4px_0px_0px_rgba(11,28,45,1)] hover:shadow-[2px_2px_0px_0px_rgba(11,28,45,1)] transition-all group"
        >
            <div className="relative w-full h-full flex items-center justify-center">
              <ArrowUp className="w-6 h-6 text-[var(--background)] group-hover:-translate-y-1 transition-transform" />
              
              <motion.div
                className="absolute -top-2 -right-2 w-4 h-4 bg-[var(--accent)] border-2 border-[var(--border-primary)]"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
