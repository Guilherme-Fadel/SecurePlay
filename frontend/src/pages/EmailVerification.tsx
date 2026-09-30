import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageTransition } from '@/components/shared/PageTransition';
import { confirmEmail, resendEmail, setPassword as setRegistrationPassword } from '@/services/registration';
import { passwordValidationMessage } from '@/lib/password-policy';
import './invite-register.css';

export function CheckEmail() {
  const [params] = useSearchParams();
  const passwordSetup = params.get('mode') === 'password';
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [message, setMessage] = useState('');
  const resend = async () => {
    try {
      setMessage(await resendEmail(email));
    } catch {
      setMessage('Não foi possível reenviar agora. Tente novamente mais tarde.');
    }
  };
  return <PageTransition><div className="invite-page"><main className="invite-card">
    <div className="invite-brand">secure<em>play</em></div>
    <h1>{passwordSetup ? 'Defina sua senha' : 'Confira seu e-mail'}</h1>
    <p className="invite-intro">{passwordSetup
      ? 'Seu e-mail já foi confirmado. Solicite um novo link para definir sua senha antes de entrar.'
      : 'Enviamos um link para confirmar seu endereço. Abra-o para criar sua senha e liberar o acesso.'}</p>
    <div className="invite-form"><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <button type="button" onClick={resend} disabled={!email}>{passwordSetup ? 'Enviar link para definir senha' : 'Reenviar confirmação'}</button></div>
    {message && <p role="status" className="invite-legal-note">{message}</p>}
    <p className="invite-legal-note">Digitou o endereço errado? <Link to="/teste-gratuito">Refaça o cadastro do teste</Link> ou use novamente seu convite.</p>
  </main></div></PageTransition>;
}

export function ConfirmEmail() {
  const token = window.location.hash.slice(1);
  const confirmationStarted = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const [hasConfirmationLink] = useState(Boolean(token));
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(Boolean(token));
  const [passwordSetupToken, setPasswordSetupToken] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token || confirmationStarted.current) return;
    confirmationStarted.current = true;
    void confirmEmail(token).then((nextToken) => {
      window.history.replaceState(null, '', '/confirmar-email');
      setPasswordSetupToken(nextToken);
    }).catch(() => {
      setError('O link expirou, já foi usado ou não está disponível. Peça outro link.');
    }).finally(() => setConfirming(false));
  }, [token]);
  useEffect(() => {
    if (!passwordSetupToken || success) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    passwordInputRef.current?.focus();
    return () => { if (dialog.open) dialog.close(); };
  }, [passwordSetupToken, success]);
  useEffect(() => {
    if (success) successHeadingRef.current?.focus();
  }, [success]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = passwordValidationMessage(password);
    if (validation) return setError(validation);
    if (password !== repeatPassword) return setError('As senhas não coincidem.');
    setSubmitting(true);
    setError('');
    try {
      if (!passwordSetupToken) return;
      await setRegistrationPassword(passwordSetupToken, password);
      setSuccess(true);
    } catch {
      setError('O link expirou, já foi usado ou não está disponível. Peça outro link.');
    } finally {
      setSubmitting(false);
    }
  };
  return <PageTransition><div className="invite-page"><main className="invite-card">
    <div className="invite-brand">secure<em>play</em></div>
    {success ? <><h1 ref={successHeadingRef} tabIndex={-1}>Acesso ativado</h1><p className="invite-intro">E-mail confirmado e senha definida.</p><Link className="invite-primary-link" to="/login">Entrar na SecurePlay</Link></> :
      !hasConfirmationLink ? <><h1>Link indisponível</h1><p className="invite-intro">Abra o link recebido por e-mail para continuar.</p><Link className="invite-primary-link" to="/verifique-email">Pedir outro link</Link></> :
      confirming ? <><h1>Validando e-mail</h1><p className="invite-intro">Estamos validando seu link seguro.</p></> :
      !passwordSetupToken ? <><h1>Link indisponível</h1><p className="invite-intro">Peça um novo link de confirmação para continuar.</p><Link className="invite-primary-link" to="/verifique-email">Pedir outro link</Link></> :
      <><h1>E-mail confirmado</h1><p className="invite-intro">Defina uma senha para liberar o acesso à SecurePlay.</p></>}
  </main>
    {passwordSetupToken && !success && <dialog
      ref={dialogRef}
      className="invite-password-dialog"
      aria-modal="true"
      aria-labelledby="invite-password-title"
      aria-describedby="invite-password-description"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="invite-brand">secure<em>play</em></div>
      <h2 id="invite-password-title">Defina sua senha</h2>
      <p id="invite-password-description" className="invite-intro">Seu e-mail foi confirmado. Crie uma senha para ativar a conta antes de entrar.</p>
      <form className="invite-form" onSubmit={submit}>
        <label>Crie uma senha<input ref={passwordInputRef} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} maxLength={72} required autoComplete="new-password" /></label>
        <label>Repita a senha<input type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} minLength={6} maxLength={72} required autoComplete="new-password" /></label>
        <button type="submit" disabled={submitting}>{submitting ? 'Ativando conta...' : 'Confirmar e ativar conta'}</button>
      </form>
      {error && <p role="alert" className="invite-legal-note">{error} <Link to="/verifique-email">Pedir outro link</Link></p>}
    </dialog>}
  </div></PageTransition>;
}
