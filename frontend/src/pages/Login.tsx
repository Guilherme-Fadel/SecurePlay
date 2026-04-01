import { motion } from 'motion/react';
import { Toaster } from 'sonner';
import { PixelBackground } from '../components/ui/visuals/PixelBackground';
import { LoginRegister } from '../auth/components/LoginRegister';
import { PixelCursor } from '../components/ui/visuals/PixelCursor';
import { PageTransition } from '../components/shared/PageTransition';

export default function Login() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--background)] relative overflow-hidden cursor-none">
        <PixelBackground />
        <PixelCursor />
        <motion.div
          className="relative z-10 min-h-screen flex items-center justify-center p-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <LoginRegister />
        </motion.div>

        <Toaster position="top-right" />
      </div>
    </PageTransition> 
  );
}
