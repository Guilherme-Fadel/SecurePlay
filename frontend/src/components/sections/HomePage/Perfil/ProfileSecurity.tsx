import { useState } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { Modal } from '@/components/ui/modal';
import { changePassword } from '@/services/profile';
import { passwordValidationMessage } from '@/lib/password-policy';
import { cn } from '@/lib/utils';
import {
  apiErrorMessage,
  validatePasswordChange,
  type PasswordFieldKey,
  type PasswordFormError,
  type PasswordValues,
} from './profileModel';

const EMPTY_PASSWORDS: PasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' };
const ERROR_ID = 'pv-password-error';

/** Segurança: abre o mesmo modal de troca de senha, com as mesmas validações. */
export function ProfileSecurity() {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwords, setPasswords] = useState<PasswordValues>(EMPTY_PASSWORDS);
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirmation: false });
  const [passwordError, setPasswordError] = useState<PasswordFormError | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // force so e true no sucesso da troca de senha. Nunca ligar direto em onClick/
  // onClose: o React passa o evento como argumento e, sendo truthy, ele anularia
  // a protecao de passwordSaving abaixo.
  const closePasswordModal = (force = false) => {
    if (passwordSaving && !force) return;
    setPasswordModalOpen(false);
    setPasswords(EMPTY_PASSWORDS);
    setPasswordError(null);
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);

    const validationError = validatePasswordChange(passwords, passwordValidationMessage);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Senha alterada com sucesso.');
      closePasswordModal(true);
    } catch (error: unknown) {
      setPasswordError({ message: apiErrorMessage(error, 'Não foi possível alterar a senha. Tente novamente.'), fields: [] });
    } finally {
      setPasswordSaving(false);
    }
  };

  const invalid = (field: PasswordFieldKey) => passwordError?.fields.includes(field) ?? false;
  const toggle = (field: PasswordFieldKey) => setShowPasswords((current) => ({ ...current, [field]: !current[field] }));

  return (
    <section className="pv-card pv-security" aria-labelledby="pv-security-title">
      <header className="pv-card-head">
        <p className="pv-eyebrow">Segurança</p>
        <h2 id="pv-security-title" className="pv-display pv-card-title">Sua senha</h2>
      </header>
      <div className="pv-card-body pv-security-body">
        <p className="pv-muted">Mantenha sua senha única e não a compartilhe com outras pessoas.</p>
        <AppButton variant="chunky" tone="ghost" size="sm" icon={<KeyRound size={17} aria-hidden="true" />} onClick={() => setPasswordModalOpen(true)}>
          Alterar senha
        </AppButton>
        <p className="pv-protection"><ShieldCheck size={16} aria-hidden="true" /> Seu perfil está protegido pela sessão segura do SecurePlay.</p>
      </div>

      <Modal open={passwordModalOpen} onClose={() => closePasswordModal()} title="Alterar senha" maxWidth="max-w-md">
        <form className="pv-password-form" onSubmit={handlePasswordChange} aria-busy={passwordSaving || undefined}>
          <p className="pv-password-intro">Para sua proteção, confirme a senha atual antes de escolher uma nova.</p>
          <PasswordField
            id="current-password"
            label="Senha atual"
            value={passwords.currentPassword}
            visible={showPasswords.current}
            invalid={invalid('current')}
            autoComplete="current-password"
            onVisibilityToggle={() => toggle('current')}
            onChange={(value) => setPasswords((current) => ({ ...current, currentPassword: value }))}
          />
          <PasswordField
            id="new-password"
            label="Nova senha"
            hint="Use ao menos 6 caracteres e no máximo 72 bytes."
            value={passwords.newPassword}
            visible={showPasswords.next}
            invalid={invalid('next')}
            autoComplete="new-password"
            onVisibilityToggle={() => toggle('next')}
            onChange={(value) => setPasswords((current) => ({ ...current, newPassword: value }))}
          />
          <PasswordField
            id="confirm-password"
            label="Confirmar nova senha"
            value={passwords.confirmPassword}
            visible={showPasswords.confirmation}
            invalid={invalid('confirmation')}
            autoComplete="new-password"
            onVisibilityToggle={() => toggle('confirmation')}
            onChange={(value) => setPasswords((current) => ({ ...current, confirmPassword: value }))}
          />
          {passwordError && <p id={ERROR_ID} className="pv-password-error" role="alert">{passwordError.message}</p>}
          <div className="pv-password-actions">
            <AppButton type="button" variant="ghost" onClick={() => closePasswordModal()} disabled={passwordSaving}>Cancelar</AppButton>
            <AppButton type="submit" icon={<KeyRound size={15} aria-hidden="true" />} disabled={passwordSaving}>{passwordSaving ? 'Alterando...' : 'Salvar nova senha'}</AppButton>
          </div>
        </form>
      </Modal>
    </section>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  visible: boolean;
  invalid: boolean;
  autoComplete: string;
  onChange: (value: string) => void;
  onVisibilityToggle: () => void;
}

function PasswordField({ id, label, hint, value, visible, invalid, autoComplete, onChange, onVisibilityToggle }: PasswordFieldProps) {
  const hintId = hint ? `${id}-hint` : null;
  const describedBy = [hintId, invalid ? ERROR_ID : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="pv-password-field">
      <label htmlFor={id}>{label}</label>
      <div className="pv-password-control">
        <input
          id={id}
          className={cn('app-text-input pv-password-input', invalid && 'is-invalid')}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" onClick={onVisibilityToggle} aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}>
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {hint && hintId && <small id={hintId}>{hint}</small>}
    </div>
  );
}
