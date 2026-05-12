import { motion } from 'motion/react';
import { GameInput } from '@/components/ui/inputs/GameInput';
import { GameButton } from '@/components/ui/buttons/GameButton';
import { GameCheckbox } from '@/components/ui/inputs/GameCheckbox';
import { PasswordStrengthBar } from '@/components/ui/feedback/PasswordStrengthBar';

interface RegisterFormProps {
  register: any;
  loading: any;
  errors: Record<string, string>;
  onSubmit: (e: React.FormEvent) => void;
}

export function RegisterForm({
  register,
  loading,
  errors,
  onSubmit,
}: RegisterFormProps) {
  return (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={onSubmit}
      className="space-y-4"
    >
      <p className="text-[var(--text-primary)]  mb-6">
        Crie seu personagem e comece a aventura
      </p>

      <GameInput
        icon="user"
        label="Nome do Jogador"
        type="text"
        placeholder="Digite seu nome"
        value={register.name}
        onChange={(e) => register.setName(e.target.value)}
        error={errors.name}
      />

      <GameInput
        icon="mail"
        label="E-mail"
        type="email"
        placeholder="jogador@exemplo.com"
        value={register.email}
        onChange={(e) => register.setEmail(e.target.value)}
        error={errors.email}
      />

      <div>
        <GameInput
          icon="lock"
          label="Senha"
          type="password"
          placeholder="Crie uma senha forte"
          value={register.password}
          onChange={(e) => register.setPassword(e.target.value)}
          error={errors.password}
        />
        <PasswordStrengthBar password={register.password} />
      </div>

      <GameInput
        icon="shield"
        label="Confirmar Senha"
        type="password"
        placeholder="Digite a senha novamente"
        value={register.confirmPassword}
        onChange={(e) => register.setConfirmPassword(e.target.value)}
        error={errors.confirmPassword}
      />

      <div className="pt-2">
        <GameCheckbox
          checked={register.acceptTerms}
          onChange={(e) => register.setAcceptTerms(e.target.checked)}
          label="Aceito os termos da missão e políticas de privacidade"
        />

        {errors.terms && (
          <p className="text-[var(--accent)]  mt-2 ml-8">
            ⚠ {errors.terms}
          </p>
        )}
      </div>

      <GameButton type="submit" isLoading={loading.isLoading}>
        <span className="tracking-wide">
          CRIAR PERSONAGEM
        </span>
      </GameButton>
    </motion.form>
  );
}