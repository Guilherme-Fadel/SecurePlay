import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { consultarConvite, concluirCadastroConvite, type ConvitePublico } from '@/services/convites';
import { PageTransition } from '@/components/shared/PageTransition';
import { passwordValidationMessage } from '@/lib/password-policy';
import './invite-register.css';

export default function InviteRegister() {
  const [token] = useState(() => window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
  const navigate = useNavigate();
  const [convite, setConvite] = useState<ConvitePublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setConvite(null);
      setLoading(false);
      return;
    }
    consultarConvite(token)
      .then((data) => {
        setConvite(data);
        setEmail(data.email ?? '');
      })
      .catch(() => setConvite(null))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const passwordError = passwordValidationMessage(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await concluirCadastroConvite(token, { name, email, password });
      toast.success(result.mensagem);
      setTimeout(() => navigate('/login', { replace: true }), 800);
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Não foi possível concluir o cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="invite-page">
        <div className="invite-orb invite-orb--primary" />
        <div className="invite-orb invite-orb--secondary" />
        <main className="invite-card">
          <div className="invite-brand"><span><ShieldCheck size={22} /></span> secure<em>play</em></div>

          {loading ? (
            <div className="invite-state"><div className="invite-spinner" /> Validando seu convite...</div>
          ) : !convite ? (
            <div className="invite-state invite-state--error">
              <LockKeyhole size={30} />
              <h1>Convite indisponível</h1>
              <p>Este link expirou, foi revogado ou já foi utilizado.</p>
              <Link to="/login">Ir para o login</Link>
            </div>
          ) : (
            <>
              <div className="invite-icon"><UserRound size={23} /></div>
              <h1>Crie seu acesso</h1>
              <p className="invite-intro">Você foi convidado para fazer parte de <strong>{convite.empresa_nome}</strong>.</p>

              <form onSubmit={handleSubmit} className="invite-form">
                <label>Nome completo<input value={name} onChange={(event) => setName(event.target.value)} minLength={3} required /></label>
                <label>E-mail corporativo<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={Boolean(convite.email)} required /></label>
                <label>Crie uma senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} maxLength={72} autoComplete="new-password" required /></label>
                <label>Confirme a senha<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} maxLength={72} autoComplete="new-password" required /></label>
                <button type="submit" disabled={submitting}>{submitting ? 'Criando acesso...' : 'Concluir cadastro'}</button>
              </form>

              <p className="invite-security"><CheckCircle2 size={14} /> Seu acesso será vinculado à empresa com segurança.</p>
              <p className="invite-legal-note">Ao criar sua conta, você confirma que leu a <Link to="/privacidade">Privacidade</Link> e os <Link to="/termos">Termos de uso</Link>. Se for criança, peça ajuda a um responsável ou educador.</p>
            </>
          )}
        </main>
        <Toaster position="top-right" richColors />
      </div>
    </PageTransition>
  );
}
