import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { consultarConvite, concluirCadastroConvite, type ConvitePublico } from '@/services/convites';
import type { AccountFeedback } from '@/components/shared/PublicAccountUi';
import { backendMessage, readHashToken } from '@/components/shared/publicAccountMessages';

export interface InviteForm {
  name: string;
  email: string;
  username: string;
  phone: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_FORM: InviteForm = { name: '', email: '', username: '', phone: '', birthDate: '', password: '', confirmPassword: '' };

function invitePayload(mode: ConvitePublico['registration_mode'] | undefined, form: InviteForm, schoolWithoutEmail: boolean) {
  const base = { name: form.name, username: form.username.trim() || undefined, phone: form.phone.trim() || undefined };
  if (schoolWithoutEmail) return { ...base, password: form.password };
  if (mode === 'school_student') return { ...base, email: form.email.trim() };
  return { ...base, email: form.email, birth_date: form.birthDate };
}

export function useInviteRegister() {
  const navigate = useNavigate();
  const [token] = useState(readHashToken);
  const [form, setForm] = useState<InviteForm>(EMPTY_FORM);
  const [convite, setConvite] = useState<ConvitePublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [createdUsername, setCreatedUsername] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AccountFeedback | null>(null);
  const schoolWithoutEmail = convite?.registration_mode === 'school_student' && !form.email.trim();

  useEffect(() => {
    if (!token) {
      setConvite(null);
      setLoading(false);
      return;
    }
    let active = true;
    consultarConvite(token)
      .then((data) => {
        if (!active) return;
        setConvite(data);
        setForm((current) => ({ ...current, email: data.email ?? '' }));
      })
      .catch(() => { if (active) setConvite(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const setField = (field: keyof InviteForm) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'password' || field === 'confirmPassword') setMismatch(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (schoolWithoutEmail && form.password !== form.confirmPassword) {
      setMismatch(true);
      return;
    }
    setFeedback(null);
    setSubmitting(true);
    try {
      const result = await concluirCadastroConvite(token, invitePayload(convite?.registration_mode, form, schoolWithoutEmail));
      setFeedback({ tone: 'success', title: 'Tudo certo!', message: result.mensagem });
      window.history.replaceState(null, '', window.location.pathname);
      if (schoolWithoutEmail && result.username) setCreatedUsername(result.username);
      else if (schoolWithoutEmail) throw new Error('Usuário de acesso não recebido. Procure a administração da escola.');
      else {
        setRedirecting(true);
        setTimeout(() => navigate('/verifique-email?email=' + encodeURIComponent(form.email), { replace: true }), 800);
      }
    } catch (error: unknown) {
      setFeedback({ tone: 'error', message: backendMessage(error, 'Não foi possível concluir o cadastro.') });
    } finally {
      setSubmitting(false);
    }
  };

  const copyUsername = () => {
    if (!createdUsername) return;
    void navigator.clipboard.writeText(createdUsername)
      .then(() => setFeedback({ tone: 'success', message: 'Usuário copiado.' }))
      .catch(() => undefined);
  };

  return { convite, loading, form, setField, submitting, redirecting, mismatch, createdUsername, feedback, schoolWithoutEmail, handleSubmit, copyUsername };
}

export type InviteRegisterState = ReturnType<typeof useInviteRegister>;
