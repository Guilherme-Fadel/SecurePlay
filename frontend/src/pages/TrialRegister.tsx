import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import { BirthDateField } from '@/components/shared/BirthDateField';
import { PageTransition } from '@/components/shared/PageTransition';
import { startTrial } from '@/services/registration';
import './invite-register.css';

export default function TrialRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await startTrial({ name, email, birth_date: birthDate });
      navigate('/verifique-email?email=' + encodeURIComponent(email), { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Não foi possível iniciar o teste.');
    } finally {
      setSubmitting(false);
    }
  };

  return <PageTransition><div className="invite-page"><main className="invite-card">
    <div className="invite-brand">secure<em>play</em></div>
    <h1>Experimente por 7 dias</h1>
    <p className="invite-intro">Explore a experiência de aluno gratuitamente. O prazo começa quando você confirma seu e-mail.</p>
    <form className="invite-form" onSubmit={submit}>
      <label>Seu nome<input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={100} required autoComplete="name" /></label>
      <label>Seu e-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
      <BirthDateField value={birthDate} onChange={setBirthDate} />
      <button type="submit" disabled={submitting}>{submitting ? 'Enviando confirmação...' : 'Começar teste gratuito'}</button>
    </form>
    <p className="invite-legal-note">Ao criar sua conta, você confirma que leu a <Link to="/privacidade">Privacidade</Link> e os <Link to="/termos">Termos de uso</Link>. Se for criança, peça ajuda a um responsável ou educador.</p>
    <p className="invite-legal-note"><Link to="/login">Já tenho uma conta</Link></p>
  </main><Toaster position="top-right" richColors /></div></PageTransition>;
}
