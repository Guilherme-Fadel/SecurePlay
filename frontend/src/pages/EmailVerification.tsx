import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicAccountShell, type AccountCharacter } from '@/components/shared/PublicAccountShell';
import { AccountInput, AccountLoading, AccountMessage, AccountPasswordInput, AccountSubmit, type AccountFeedback } from '@/components/shared/PublicAccountUi';
import { resendEmail } from '@/services/registration';
import { confirmEmailView, useConfirmEmail, type ConfirmEmailState, type ConfirmEmailView } from './useConfirmEmail';

export function CheckEmail() {
  const [params] = useSearchParams();
  const passwordSetup = params.get('mode') === 'password';
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<AccountFeedback | null>(null);
  const resend = async () => {
    setSending(true);
    try {
      setFeedback({ tone: 'info', message: await resendEmail(email) });
    } catch {
      setFeedback({ tone: 'error', message: 'Não foi possível reenviar agora. Tente novamente mais tarde.' });
    } finally {
      setSending(false);
    }
  };
  return (
    <PublicAccountShell
      titleId="check-email-title"
      title={passwordSetup ? <>Instruções de <em>acesso</em></> : <>Confira seu <em>e-mail</em></>}
      lead={passwordSetup
        ? 'Se seu acesso ainda precisa de confirmação ou da senha inicial, solicite novas instruções por e-mail. Se a conta já está ativa, entre normalmente.'
        : 'Se este endereço puder continuar o cadastro, você receberá instruções por e-mail. Confira também a pasta de spam. Se já possui acesso, entre na sua conta.'}
      character={{ expression: 'curious', speech: 'Dá uma espiada na sua caixa de entrada.' }}
      feedback={feedback}
    >
      <div className="pas-form">
        <AccountInput label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        <AccountSubmit type="button" busy={sending} busyLabel="Enviando..." disabled={!email} onClick={() => void resend()}>
          {passwordSetup ? 'Enviar instruções de acesso' : 'Reenviar confirmação'}
        </AccountSubmit>
      </div>
      <div className="pas-foot">
        <Link className="pas-link" to="/login">Já tenho acesso: entrar</Link>
        <p>Digitou o endereço errado? <Link to="/teste-gratuito">Refaça o cadastro do teste</Link> ou use novamente seu convite.</p>
      </div>
    </PublicAccountShell>
  );
}

const CHARACTER: Record<ConfirmEmailView, AccountCharacter> = {
  success: { expression: 'happy', speech: 'Acesso liberado! Bora para a trilha.' },
  'no-link': { expression: 'sleepy', speech: 'Sem o link do e-mail não dá para seguir.' },
  confirming: { expression: 'curious', speech: 'Conferindo seu link…' },
  conflict: { expression: 'startled', speech: 'Opa! Esse usuário já tem dono.' },
  unavailable: { expression: 'sleepy', speech: 'Esse link já não funciona.' },
  password: { expression: 'happy', speech: 'E-mail confirmado! Falta só a senha.' },
};

const TITLE: Record<ConfirmEmailView, ReactNode> = {
  success: <>Acesso <em>ativado</em></>,
  'no-link': <>Link <em>indisponível</em></>,
  confirming: 'Validando e-mail',
  conflict: <>Escolha outro <em>usuário</em></>,
  unavailable: <>Link <em>indisponível</em></>,
  password: <>E-mail <em>confirmado</em></>,
};

const LEAD: Record<ConfirmEmailView, string | undefined> = {
  success: 'E-mail confirmado e senha definida.',
  'no-link': 'Abra o link recebido por e-mail para continuar.',
  confirming: 'Estamos validando seu link seguro.',
  conflict: undefined,
  unavailable: 'Peça um novo link de confirmação para continuar.',
  password: 'Defina uma senha para liberar o acesso à SecurePlay.',
};

function UsernameConflictForm({ state }: { state: ConfirmEmailState }) {
  return (
    <form className="pas-form" onSubmit={event => void state.retryConfirmation(event)}>
      <AccountInput
        label="Usuário de acesso"
        autoFocus
        value={state.alternativeUsername}
        onChange={event => state.setAlternativeUsername(event.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        minLength={3}
        maxLength={24}
        required
        pattern="(?![sS][pP]-)[A-Za-z0-9][A-Za-z0-9._\-]{2,23}"
      />
      <AccountSubmit busy={state.submitting} busyLabel="Confirmando…">Confirmar cadastro</AccountSubmit>
    </form>
  );
}

function ViewContent({ view, state }: { view: ConfirmEmailView; state: ConfirmEmailState }) {
  if (view === 'success') return <Link className="pas-cta" to="/login">Entrar na SecurePlay</Link>;
  if (view === 'no-link' || view === 'unavailable') return <Link className="pas-cta" to="/verifique-email">Pedir outro link</Link>;
  if (view === 'confirming') return <AccountLoading />;
  if (view === 'conflict') return <UsernameConflictForm state={state} />;
  return <PasswordDialog state={state} />;
}

/** Modal obrigatório: o e-mail já foi confirmado e a conta só ativa com a senha definida. */
function PasswordDialog({ state }: { state: ConfirmEmailState }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    passwordInputRef.current?.focus();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  const fieldError = (field: 'password' | 'repeat') => (state.fieldError?.field === field ? state.fieldError.message : null);
  return (
    <dialog
      ref={dialogRef}
      className="pas-dialog"
      aria-modal="true"
      aria-labelledby="confirm-password-title"
      aria-describedby="confirm-password-description"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="pas-dialog-body">
        <h2 id="confirm-password-title" className="sp-display pas-dialog-title">Defina sua senha</h2>
        <p id="confirm-password-description" className="pas-lead">Seu e-mail foi confirmado. Crie uma senha para ativar a conta antes de entrar.</p>
        <div className="pas-live" role="alert">
          {state.error && <AccountMessage tone="error" message={<>{state.error} <Link to="/verifique-email">Pedir outro link</Link></>} />}
        </div>
        <form className="pas-form" onSubmit={(event) => void state.submit(event)}>
          <AccountPasswordInput label="Crie uma senha" inputRef={passwordInputRef} value={state.password} onChange={(event) => state.setPassword(event.target.value)} minLength={6} maxLength={72} required autoComplete="new-password" error={fieldError('password')} />
          <AccountPasswordInput label="Repita a senha" value={state.repeatPassword} onChange={(event) => state.setRepeatPassword(event.target.value)} minLength={6} maxLength={72} required autoComplete="new-password" error={fieldError('repeat')} />
          <AccountSubmit busy={state.submitting} busyLabel="Ativando conta...">Confirmar e ativar conta</AccountSubmit>
        </form>
      </div>
    </dialog>
  );
}

export function ConfirmEmail() {
  const state = useConfirmEmail();
  const view = confirmEmailView(state);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (state.success) successHeadingRef.current?.focus();
  }, [state.success]);
  return (
    <PublicAccountShell
      titleId="confirm-email-title"
      title={TITLE[view]}
      lead={LEAD[view]}
      titleRef={successHeadingRef}
      character={CHARACTER[view]}
      feedback={view === 'conflict' && state.error ? { tone: 'error', message: state.error } : null}
      busy={view === 'confirming'}
    >
      <ViewContent view={view} state={state} />
    </PublicAccountShell>
  );
}
