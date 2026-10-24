import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { PageTransition } from '@/components/shared/PageTransition';
import { resetStudentPassword } from '@/services/registration';
import './invite-register.css';

export default function StudentPasswordReset() {
  const [token] = useState(() => window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const validToken = /^[A-Za-z0-9_-]{43}$/.test(token);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error('As senhas não conferem.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await resetStudentPassword(token, password);
      setLoginCode(result.login_code);
      setUsername(result.username ?? null);
      window.history.replaceState(null, '', window.location.pathname);
      toast.success(result.mensagem);
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Não foi possível redefinir o acesso.');
    } finally { setSubmitting(false); }
  };

  return <PageTransition><div className="invite-page">
    <div className="invite-orb invite-orb--primary" />
    <div className="invite-orb invite-orb--secondary" />
    <main className="invite-card">
      <div className="invite-brand"><span><ShieldCheck size={22} /></span> secure<em>play</em></div>
      {username || loginCode ? <div className="invite-state invite-state--success">
        <CheckCircle2 size={32} /><h1>Acesso atualizado</h1>
        <p>Use {username ? 'seu usuário' : 'seu código de acesso'} com a nova senha.</p>
        <strong className="invite-login-code">{username ?? loginCode}</strong>
        <button type="button" onClick={() => void navigator.clipboard.writeText(username ?? loginCode ?? '').then(() => toast.success('Identificador copiado.'))}>Copiar {username ? 'usuário' : 'código'}</button>
        <Link to="/login">Ir para o login</Link>
      </div> : !validToken ? <div className="invite-state invite-state--error">
        <KeyRound size={30} /><h1>Link indisponível</h1>
        <p>Peça à administração da escola um novo link de redefinição.</p>
        <Link to="/login">Ir para o login</Link>
      </div> : <>
        <div className="invite-icon"><KeyRound size={23} /></div>
        <h1>Defina uma nova senha</h1>
        <p className="invite-intro">Depois de salvar, use seu usuário ou código de acesso com a nova senha para entrar.</p>
        <form onSubmit={(event) => void submit(event)} className="invite-form">
          <label>Nova senha<input type="password" autoComplete="new-password" minLength={6} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label>Confirme a nova senha<input type="password" autoComplete="new-password" minLength={6} maxLength={72} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          <button type="submit" disabled={submitting}>{submitting ? 'Atualizando...' : 'Salvar nova senha'}</button>
        </form>
      </>}
    </main>
    <Toaster position="top-right" richColors />
  </div></PageTransition>;
}
