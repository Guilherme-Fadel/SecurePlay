import { motion } from 'motion/react';
import { GameInput } from '@/components/ui/inputs/GameInput';
import { GameButton } from '@/components/ui/buttons/GameButton';
import { toast } from 'sonner';

interface LoginFormProps {
  login: any;
  loading: any;
  errors: Record<string, string>;
  onSubmit: (e: React.FormEvent) => void;
}

export function LoginForm({ login, loading, errors, onSubmit }: LoginFormProps) {
  return (
    <motion.form
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onSubmit={onSubmit}
      className="space-y-4"
    >
      <p className="text-[var(--text-primary)]  mb-6">
        Digite suas credenciais para continuar a missão
      </p>

      <GameInput
        icon="mail"
        label="E-mail"
        type="email"
        placeholder="jogador@exemplo.com"
        value={login.email}
        onChange={(e) => login.setEmail(e.target.value)}
        error={errors.email}
      />

      <GameInput
        icon="lock"
        label="Senha"
        type="password"
        placeholder="••••••••"
        value={login.password}
        onChange={(e) => login.setPassword(e.target.value)}
        error={errors.password}
      />

      <div className="flex justify-end">
        <button
          type="button"
          className="text-[var(--secondary)]  hover:underline"
          onClick={() =>
            toast.info('Recuperação de senha', {
              description: 'Um link será enviado para seu e-mail',
            })
          }
        >
          Esqueci minha senha
        </button>
      </div>

      <GameButton type="submit" isLoading={loading.isLoading}>
        <span className="tracking-wide">
          INICIAR MISSÃO
        </span>
      </GameButton>
    </motion.form>
  );
}