import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Copy, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { consultarConvite, concluirCadastroConvite, type ConvitePublico } from '@/services/convites';
import { PageTransition } from '@/components/shared/PageTransition';
import { BirthDateField } from '@/components/shared/BirthDateField';
import { RegistrationContactFields } from '@/components/shared/RegistrationContactFields';
import { RegistrationLegalNotice } from '@/components/shared/RegistrationLegalNotice';
import './invite-register.css';

export default function InviteRegister() {
  const [token] = useState(() => window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');
  const navigate = useNavigate();
  const [convite, setConvite] = useState<ConvitePublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [createdUsername, setCreatedUsername] = useState<string | null>(null);
  const schoolWithoutEmail = convite?.registration_mode === 'school_student' && !email.trim();

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
    if (schoolWithoutEmail && password !== confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await concluirCadastroConvite(token, {
        name,
        username: username.trim() || undefined,
        phone: phone.trim() || undefined,
        ...(schoolWithoutEmail ? { password } : isSchoolStudent ? { email: email.trim() } : { email, birth_date: birthDate }),
      });
      toast.success(result.mensagem);
      window.history.replaceState(null, '', window.location.pathname);
      if (schoolWithoutEmail && result.username) setCreatedUsername(result.username);
      else if (schoolWithoutEmail) throw new Error('Usuário de acesso não recebido. Procure a administração da escola.');
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
        <main className={`invite-card${convite && !createdUsername ? ' invite-card--registration' : ''}`}>
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
          ) : createdUsername ? (
            <div className="invite-state invite-state--success">
              <CheckCircle2 size={32} />
              <h1>Conta criada</h1>
              <p>Use seu usuário e a senha que você criou para entrar.</p>
              <strong className="invite-login-code">{createdUsername}</strong>
              <button type="button" onClick={() => void navigator.clipboard.writeText(createdUsername).then(() => toast.success('Usuário copiado.'))}><Copy size={16} /> Copiar usuário</button>
              <Link to="/login">Ir para o login</Link>
            </div>
          ) : (
            <>
              <div className="invite-icon"><UserRound size={23} /></div>
              <h1>Crie seu passe de aventura</h1>
              <p className="invite-intro">Você vai entrar na turma de <strong>{convite.empresa_nome}</strong>.</p>

              <form onSubmit={handleSubmit} className="invite-form invite-form--registration">
                <label>Nome para identificar você na turma<input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={100} autoComplete="name" required /></label>
                {convite.registration_mode === 'school_student' ? <>
                  <label><span>E-mail <small>opcional</small></span><input type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={100} autoComplete="email" /><small>Sem e-mail, escolha um usuário e uma senha. Com e-mail, confirme o endereço para criar sua senha.</small></label>
                  <RegistrationContactFields username={username} phone={phone} setUsername={setUsername} setPhone={setPhone} usernameRequired={schoolWithoutEmail} disabled={submitting} />
                  {schoolWithoutEmail && <>
                  <label>Crie uma senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} maxLength={72} autoComplete="new-password" required /></label>
                  <label>Confirme a senha<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} maxLength={72} autoComplete="new-password" required /></label>
                  </>}
                </> : <>
                  <label>E-mail da escola<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={Boolean(convite.email)} required /></label>
                  <RegistrationContactFields username={username} phone={phone} setUsername={setUsername} setPhone={setPhone} disabled={submitting} />
                  <BirthDateField value={birthDate} onChange={setBirthDate} />
                </>}
                <button type="submit" disabled={submitting}>{submitting ? 'Criando acesso...' : schoolWithoutEmail ? 'Criar minha conta' : 'Confirmar meu e-mail'}</button>
              </form>

              <p className="invite-security"><CheckCircle2 size={14} /> {schoolWithoutEmail ? 'Entre com o usuário escolhido e sua senha.' : 'Confirme seu e-mail para ativar o acesso.'}</p>
              <RegistrationLegalNotice />
            </>
          )}
        </main>
        <Toaster position="top-right" richColors />
      </div>
    </PageTransition>
  );
}
