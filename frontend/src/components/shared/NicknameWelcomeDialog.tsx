import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { requestNickname, dismissNicknameOnboarding } from '@/services/profile';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import './nickname-welcome.css';

export function NicknameWelcomeDialog() {
  const { user, setSession } = useCurrentUser();
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeRef = useRef(true);
  const titleId = useId();
  const inputId = useId();
  const descriptionId = useId();
  const visible = user?.role === 'user' && user.nickname_onboarding_pending && !user.nickname && !user.nickname_pending;

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!visible || !dialog) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [visible]);

  async function chooseLater() {
    if (!user || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await dismissNicknameOnboarding();
      if (activeRef.current) setSession({ ...user, ...result });
    } catch {
      setError('Não foi possível continuar agora. Tente novamente.');
    } finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    const value = nickname.trim().replace(/\s+/g, ' ');
    if (value.length < 3 || value.length > 24 || !/^[\p{L}\p{N} _-]+$/u.test(value)) {
      setError('Use de 3 a 24 caracteres: letras, números, espaços, hífen ou sublinhado.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await requestNickname(value);
      if (activeRef.current) setSession({ ...user, ...result });
    } catch {
      setError('Não conseguimos enviar seu apelido. O que você escreveu está aqui para tentar de novo.');
    } finally { setBusy(false); }
  }

  return <dialog ref={dialogRef} className="nickname-welcome-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); void chooseLater(); }}>
    <h2 id={titleId}>Como quer ser chamado na aventura?</h2>
    <p id={descriptionId}>Boas-vindas! Escolha um apelido para aparecer nas atividades e no ranking. A escola vai conferir antes de publicar.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <label htmlFor={inputId}>Seu apelido de aventura</label>
      <AppInput id={inputId} autoFocus value={nickname} onChange={event => setNickname(event.target.value)} minLength={3} maxLength={24} required disabled={busy} autoComplete="nickname" aria-describedby={`${inputId}-hint`} placeholder="Ex.: Guardião das Estrelas" />
      <small id={`${inputId}-hint`}>Seu usuário e sua senha continuam os mesmos. Você também pode escolher depois no Perfil.</small>
      {error && <p role="alert" className="nickname-welcome-error">{error}</p>}
      <div className="nickname-welcome-actions">
        <AppButton variant="ghost" disabled={busy} onClick={() => void chooseLater()}>Escolher depois</AppButton>
        <AppButton type="submit" disabled={busy}>{busy ? 'Aguarde…' : 'Enviar apelido'}</AppButton>
      </div>
    </form>
  </dialog>;
}
