import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CircleHelp, KeyRound, Mail } from 'lucide-react';
import { verificationPath, type LoginFeedback, type LoginNoticeKind } from './useLoginClassroom';

const ICON = { size: 20, strokeWidth: 2.4, 'aria-hidden': true } as const;

function AlertGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M12 7.5v6" />
      <path d="M12 17h.01" />
    </svg>
  );
}

interface MessageProps {
  tone: 'error' | 'info' | 'success' | 'help';
  icon: ReactNode;
  title: string;
  children: ReactNode;
  role?: 'note';
  id?: string;
  hidden?: boolean;
}

function Message({ tone, icon, title, children, role, id, hidden }: MessageProps) {
  return (
    <div className={`lgc-msg lgc-msg--${tone}`} role={role} id={id} hidden={hidden}>
      <span className="lgc-msg-icon" aria-hidden="true">{icon}</span>
      <div className="lgc-msg-body">
        <strong>{title}</strong>
        {children}
      </div>
    </div>
  );
}

const NOTICE_COPY: Record<LoginNoticeKind, { title: string; action: string; icon: ReactNode }> = {
  email_verification: { title: 'Falta confirmar seu e-mail', action: 'Confirmar meu e-mail', icon: <Mail {...ICON} /> },
  password_setup: { title: 'Defina sua senha', action: 'Definir minha senha', icon: <KeyRound {...ICON} /> },
};

/** Aviso de confirmação: em vez de redirecionar, oferece o caminho e leva o foco até ele. */
function NoticeMessage({ kind, email, message }: { kind: LoginNoticeKind; email: string; message: string }) {
  const actionRef = useRef<HTMLAnchorElement>(null);
  const copy = NOTICE_COPY[kind];
  useEffect(() => {
    actionRef.current?.focus();
  }, []);
  return (
    <Message tone="info" icon={copy.icon} title={copy.title}>
      <span>{message}</span>
      <Link ref={actionRef} className="lgc-msg-action" to={verificationPath(kind, email)}>
        {copy.action}
        <ArrowRight size={16} strokeWidth={2.6} aria-hidden="true" />
      </Link>
    </Message>
  );
}

function StatusContent({ feedback }: { feedback: LoginFeedback | null }) {
  if (!feedback || feedback.kind === 'error') return null;
  if (feedback.kind === 'success') {
    return (
      <Message tone="success" icon={<Check {...ICON} strokeWidth={2.8} />} title="Tudo certo!">
        <span>{feedback.message}</span>
      </Message>
    );
  }
  return <NoticeMessage key={`${feedback.kind}:${feedback.message}`} kind={feedback.kind} email={feedback.email} message={feedback.message} />;
}

/** Regiões vivas sempre montadas, para o leitor de tela anunciar o conteúdo que entra nelas. */
export function LoginFeedbackRegions({ feedback }: { feedback: LoginFeedback | null }) {
  return (
    <>
      <div className="lgc-live" role="alert">
        {feedback?.kind === 'error' && (
          <Message tone="error" icon={<AlertGlyph />} title="Não foi possível entrar">
            <span>{feedback.message}</span>
          </Message>
        )}
      </div>
      <div className="lgc-live" role="status">
        <StatusContent feedback={feedback} />
      </div>
    </>
  );
}

export const HELP_PANEL_ID = 'login-help-panel';

export function LoginHelpPanel({ open }: { open: boolean }) {
  return (
    <Message tone="help" role="note" id={HELP_PANEL_ID} hidden={!open} icon={<CircleHelp {...ICON} />} title="Esqueceu a senha ou o usuário?">
      <span>Peça ajuda a um responsável ou educador para entrar de novo.</span>
    </Message>
  );
}
