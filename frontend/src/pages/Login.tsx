import { motion } from 'motion/react';
import { Toaster } from 'sonner';
import { LoginRegister } from '@/auth/components/LoginRegister';
import { PageTransition } from '@/components/shared/PageTransition';

export default function Login() {
  return (
    <PageTransition>
      <div className="min-h-screen relative overflow-hidden bg-[#edf2f8] p-4 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(var(--primary-rgb),0.17),transparent_28%),radial-gradient(circle_at_89%_83%,rgba(var(--secondary-rgb),0.12),transparent_27%)]" />
        <motion.div
          className="relative z-10 flex min-h-[calc(100dvh-2rem)] items-center justify-center sm:min-h-[calc(100dvh-3rem)]"
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
