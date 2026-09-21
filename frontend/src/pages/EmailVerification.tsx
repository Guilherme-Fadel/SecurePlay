import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageTransition } from '@/components/shared/PageTransition';
import { confirmEmail, resendEmail } from '@/services/registration';
import { passwordValidationMessage } from '@/lib/password-policy';
import './invite-register.css';

export function CheckEmail() {
  const [params] = useSearchParams();
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
    <h1>Confira seu e-mail</h1>
    <p className="invite-intro">Enviamos um link para confirmar seu endereço. Abra-o para criar sua senha e liberar o acesso.</p>
    <div className="invite-form"><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <button type="button" onClick={resend} disabled={!email}>Reenviar confirmação</button></div>
    {message && <p role="status" className="invite-legal-note">{message}</p>}
    <p className="invite-legal-note">Digitou o endereço errado? <Link to="/teste-gratuito">Refaça o cadastro do teste</Link> ou use novamente seu convite.</p>
  </main></div></PageTransition>;
}

export function ConfirmEmail() {
  const token = window.location.hash.slice(1);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = passwordValidationMessage(password);
    if (validation) return setError(validation);
    if (password !== repeatPassword) return setError('As senhas não coincidem.');
    setSubmitting(true);
    setError('');
    try {
      await confirmEmail(token, password);
      window.history.replaceState(null, '', '/confirmar-email');
      setSuccess(true);
    } catch {
      setError('O link expirou, já foi usado ou não está disponível. Peça outro link.');
    } finally {
      setSubmitting(false);
    }
  };
  return <PageTransition><div className="invite-page"><main className="invite-card">
    <div className="invite-brand">secure<em>play</em></div>
    {success ? <><h1>E-mail confirmado</h1><p className="invite-intro">Sua conta está pronta.</p><Link className="invite-primary-link" to="/login">Entrar na SecurePlay</Link></> :
      !token ? <><h1>Link indisponível</h1><p className="invite-intro">Abra o link recebido por e-mail para continuar.</p><Link className="invite-primary-link" to="/verifique-email">Pedir outro link</Link></> :
      <><h1>Confirme seu acesso</h1><p className="invite-intro">Crie sua senha para validar o e-mail e ativar a conta.</p>
        <form className="invite-form" onSubmit={submit}>
          <label>Crie uma senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} maxLength={72} required autoComplete="new-password" /></label>
          <label>Repita a senha<input type="password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} minLength={6} maxLength={72} required autoComplete="new-password" /></label>
          <button type="submit" disabled={submitting}>{submitting ? 'Ativando conta...' : 'Confirmar e ativar conta'}</button>
        </form>
        {error && <p role="alert" className="invite-legal-note">{error} <Link to="/verifique-email">Pedir outro link</Link></p>}
      </>}
  </main></div></PageTransition>;
}
