import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { consultarConvite, concluirCadastroConvite, type ConvitePublico } from '@/services/convites';
import { PageTransition } from '@/components/shared/PageTransition';
import { BirthDateField } from '@/components/shared/BirthDateField';
import './invite-register.css';

export default function InviteRegister() {
  const [token] = useState(() => window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
  const navigate = useNavigate();
  const [convite, setConvite] = useState<ConvitePublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginCode, setLoginCode] = useState<string | null>(null);

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
    const isSchoolStudent = convite?.registration_mode === 'school_student';
    if (isSchoolStudent && password !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await concluirCadastroConvite(token, {
        name,
        ...(convite?.role === 'user' ? { nickname: nickname.trim() || undefined } : {}),
        ...(isSchoolStudent ? { password } : { email, birth_date: birthDate }),
      });
      toast.success(result.mensagem);
      window.history.replaceState(null, '', window.location.pathname);
      if (isSchoolStudent && result.login_code) setLoginCode(result.login_code);
      else if (isSchoolStudent) throw new Error('Código de acesso não recebido. Procure a administração da escola antes de tentar entrar.');
      else setTimeout(() => navigate('/verifique-email?email=' + encodeURIComponent(email), { replace: true }), 800);
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
          ) : loginCode ? (
            <div className="invite-state invite-state--success">
              <CheckCircle2 size={32} />
              <h1>Conta criada</h1>
              <p>Guarde este código. Ele será usado com sua senha para entrar.</p>
              <strong className="invite-login-code">{loginCode}</strong>
              <button type="button" onClick={() => void navigator.clipboard.writeText(loginCode).then(() => toast.success('Código copiado.'))}><Copy size={16} /> Copiar código</button>
              <Link to="/login">Ir para o login</Link>
            </div>
          ) : (
            <>
              <div className="invite-icon"><UserRound size={23} /></div>
              <h1>Crie seu passe de aventura</h1>
              <p className="invite-intro">Você vai entrar na turma de <strong>{convite.empresa_nome}</strong>.</p>

              <form onSubmit={handleSubmit} className="invite-form">
                <label>Nome para identificar você na turma<input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={100} autoComplete="name" required /></label>
                {convite.role === 'user' && <label>Apelido de aventura <small>vai para aprovação</small><input value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={3} maxLength={24} pattern="[A-Za-zÀ-ÿ0-9 _-]+" placeholder="Ex.: Guardiã Estelar" /></label>}
                {convite.registration_mode === 'school_student' ? <>
                  <label>Crie uma senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} maxLength={72} autoComplete="new-password" required /></label>
                  <label>Confirme a senha<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} maxLength={72} autoComplete="new-password" required /></label>
                </> : <>
                  <label>E-mail da escola<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={Boolean(convite.email)} required /></label>
                  <BirthDateField value={birthDate} onChange={setBirthDate} />
                </>}
                <button type="submit" disabled={submitting}>{submitting ? 'Criando acesso...' : convite.registration_mode === 'school_student' ? 'Criar minha conta' : 'Confirmar meu e-mail'}</button>
              </form>

              <p className="invite-security"><CheckCircle2 size={14} /> {convite.registration_mode === 'school_student' ? 'O código de acesso será exibido uma vez após o cadastro.' : 'Seu acesso será preparado com segurança.'}</p>
              <p className="invite-legal-note">Ao criar sua conta, você confirma que leu a <Link to="/privacidade">Privacidade</Link> e os <Link to="/termos">Termos de uso</Link>. Se for criança, peça ajuda a um responsável ou educador.</p>
            </>
          )}
        </main>
        <Toaster position="top-right" richColors />
      </div>
    </PageTransition>
  );
}
