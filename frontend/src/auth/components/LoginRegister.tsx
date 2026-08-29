import { useNavigate } from 'react-router-dom';

import { motion, AnimatePresence } from 'motion/react';
import { PixelMascot } from '@/components/ui/visuals/PixelMascot';
import { SecurityLevelIndicator } from '@/components/ui/feedback/SecurityLevelIndicator';
import { toast } from 'sonner';

import { useLoginRegister } from '@/hooks/useLoginRegister';
import { loginService } from '@/services/login/login.ts';
import { registerService } from '@/services/register/register';
import { useCurrentUser } from '@/hooks/useCurrentUser';

import { AuthTabs } from './AuthTabs';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function LoginRegister() {
  const { mode, switchMode, loading, login, register, errors } = useLoginRegister();
  const { setSession, refreshSession } = useCurrentUser();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    loading.start();

    try {
      const result = await loginService(login.email, login.password);

      if (!result.sucesso) {
        toast.error(result.mensagem);
        login.resetPassword();
        return;
      }

      localStorage.setItem('nome', result.nome!);

      if (result.user) {
        setSession(result.user);
      } else {
        await refreshSession();
      }

      toast.success(result.mensagem);

      navigate('/home');

      login.reset();
    } finally {
      loading.stop();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    loading.start();

    try {
      const result = await registerService(
        register.name,
        register.email,
        register.password,
        register.confirmPassword,
        register.acceptTerms
      );

      if (!result.sucesso) {
        toast.error(result.mensagem);
        return;
      }

      const resultLogin = await loginService(register.email, register.password);

      if (!resultLogin.sucesso) {
        toast.error(resultLogin.mensagem);
        register.reset();
        switchMode('login');
        return;
      }

      localStorage.setItem('nome', resultLogin.nome!);

      if (resultLogin.user) {
        setSession(resultLogin.user);
      } else {
        await refreshSession();
      }

      toast.success(result.mensagem);
      navigate('/home');
      register.reset();
    } finally {
      loading.stop();
    }
  };

  return (
    <div className="w-full max-w-md">

      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-center mb-4">
          <PixelMascot className="w-24 h-24" />
        </div>

        <h1 className="text-[var(--secondary)] mb-2 tracking-wide">
          SISTEMA DE SEGURANÇA
        </h1>
        <p className="text-[var(--text-primary)]  opacity-80">
          Governança & Proteção de Dados
        </p>
      </motion.div>

      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <SecurityLevelIndicator />

        <div className="relative bg-[var(--surface-alt)] border border-[var(--secondary-30)] rounded-lg p-8">
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[var(--secondary-60)]" />
          <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[var(--secondary-60)]" />
          <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-[var(--secondary-60)]" />
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-[var(--secondary-60)]" />

          <AuthTabs mode={mode} switchMode={switchMode} />

          <AnimatePresence mode="wait">
            {mode === 'login' ? (
              <LoginForm
                login={login}
                loading={loading}
                errors={errors}
                onSubmit={handleLogin}
              />
            ) : (
              <RegisterForm
                register={register}
                loading={loading}
                errors={errors}
                onSubmit={handleRegister}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="absolute inset-0 rounded-lg -z-10 shadow-[0_8px_30px_rgba(0,0,0,0.35)]" />
      </motion.div>

      <motion.div
        className="text-center mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-[var(--text-secondary)]">
          Segurança descomplicada • Proteção gamificada
        </p>
      </motion.div>
    </div>
  );
}
