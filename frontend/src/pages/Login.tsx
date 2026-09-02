import { motion } from 'motion/react';
import { Toaster } from 'sonner';
import { LoginRegister } from '@/auth/components/LoginRegister';
import { PageTransition } from '@/components/shared/PageTransition';

export default function Login() {
  return (
    <PageTransition>
      <div className="login-page">
        <div className="login-page-glow" aria-hidden="true" />
        <motion.div
          className="login-page-content"
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
