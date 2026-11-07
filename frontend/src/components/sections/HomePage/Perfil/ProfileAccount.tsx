import { useEffect, useRef, useState } from 'react';
import { Check, Copy, KeyRound, Mail, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import type { CurrentUser } from '@/services/me';

interface ProfileAccountProps {
  user: CurrentUser | null;
  userLoading: boolean;
}

type CopyTarget = 'email' | 'code';

const COPY_STATUS: Record<CopyTarget, string> = { email: 'E-mail copiado.', code: 'Código de acesso copiado.' };

/** Acesso: e-mail ou código escolar copiável e nome do cadastro. */
export function ProfileAccount({ user, userLoading }: ProfileAccountProps) {
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
  }, []);

  const markCopied = (target: CopyTarget) => {
    setCopied(target);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(null), 2200);
  };

  const handleCopyEmail = async () => {
    if (!user?.email) return;

    try {
      if (!navigator.clipboard) throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(user.email);
      // O aviso role="status" anuncia a cópia; o toast de sucesso duplicaria o anúncio.
      markCopied('email');
    } catch {
      toast.error('Não foi possível copiar o e-mail neste navegador.');
    }
  };

  const handleCopyLoginCode = async () => {
    if (!user?.login_code) return;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(user.login_code);
      markCopied('code');
    } catch {
      toast.error('Não foi possível copiar o código neste navegador.');
    }
  };

  const showRegisteredName = Boolean(user?.nickname && user.name && user.nickname !== user.name);

  return (
    <section className="pv-card pv-account" aria-labelledby="pv-account-title">
      <header className="pv-card-head">
        <p className="pv-eyebrow">Acesso</p>
        <h2 id="pv-account-title" className="pv-display pv-card-title">Sua conta</h2>
      </header>
      <div className="pv-card-body">
        <ul className="pv-facts">
          <AccessFact user={user} userLoading={userLoading} copied={copied} onCopyEmail={handleCopyEmail} onCopyCode={handleCopyLoginCode} />
          {showRegisteredName && (
            <li className="pv-fact">
              <span className="pv-fact-icon"><UserRound size={18} aria-hidden="true" /></span>
              <span className="pv-fact-label">Nome do cadastro</span>
              <strong title={user?.name}>{user?.name}</strong>
            </li>
          )}
        </ul>
        {/* Região viva sempre montada: o texto muda dentro dela e é anunciado. */}
        <p className="pv-copy-status" role="status">
          {copied ? COPY_STATUS[copied] : ''}
        </p>
      </div>
    </section>
  );
}

interface AccessFactProps {
  user: CurrentUser | null;
  userLoading: boolean;
  copied: CopyTarget | null;
  onCopyEmail: () => void;
  onCopyCode: () => void;
}

/** E-mail quando existe; senão o código escolar; senão o aviso anterior. */
function AccessFact({ user, userLoading, copied, onCopyEmail, onCopyCode }: AccessFactProps) {
  if (user?.email) {
    return (
      <CopyFact
        icon={<Mail size={18} aria-hidden="true" />}
        label="E-mail"
        value={user.email}
        copied={copied === 'email'}
        copyLabel="Copiar e-mail"
        copiedLabel="E-mail copiado"
        onCopy={onCopyEmail}
      />
    );
  }
  if (user?.login_code) {
    return (
      <CopyFact
        icon={<KeyRound size={18} aria-hidden="true" />}
        label="Código escolar"
        value={user.login_code}
        mono
        copied={copied === 'code'}
        copyLabel="Copiar código de acesso"
        copiedLabel="Código de acesso copiado"
        onCopy={onCopyCode}
      />
    );
  }
  return (
    <li className="pv-fact">
      <span className="pv-fact-icon"><Mail size={18} aria-hidden="true" /></span>
      <span className="pv-fact-label">E-mail</span>
      <strong>{userLoading ? 'Sincronizando e-mail...' : 'E-mail não informado'}</strong>
    </li>
  );
}
interface CopyFactProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  onCopy: () => void;
}

function CopyFact({ icon, label, value, mono, copied, copyLabel, copiedLabel, onCopy }: CopyFactProps) {
  return (
    <li className="pv-fact">
      <span className="pv-fact-icon">{icon}</span>
      <span className="pv-fact-label">{label}</span>
      <strong className={mono ? 'pv-mono' : undefined} title={value}>{value}</strong>
      <button
        type="button"
        className={copied ? 'pv-copy is-copied' : 'pv-copy'}
        onClick={onCopy}
        aria-label={copied ? copiedLabel : copyLabel}
        title={copied ? copiedLabel : copyLabel}
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        <span aria-hidden="true">{copied ? 'Copiado' : 'Copiar'}</span>
      </button>
    </li>
  );
}
