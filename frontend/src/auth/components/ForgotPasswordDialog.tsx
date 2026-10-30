import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { ArrowRight, KeyRound, Mail, MailCheck, X } from 'lucide-react';
import { requestPasswordReset } from '@/services/registration';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ForgotPasswordDialogProps {
  initialEmail: string;
  onClose: () => void;
}

export function ForgotPasswordDialog({ initialEmail, onClose }: ForgotPasswordDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState(() => (EMAIL_PATTERN.test(initialEmail.trim()) ? initialEmail.trim() : ''));
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    // showModal foca o primeiro botão (fechar); o campo de e-mail é o ponto de partida.
    inputRef.current?.focus();
  }, []);

  const close = () => {
    dialogRef.current?.close();
    onClose();
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      setSentMessage(await requestPasswordReset(email.trim()));
    } catch (requestError) {
      setError(
        isAxiosError(requestError) && requestError.response?.status === 429
          ? 'Muitas tentativas. Aguarde um minuto e tente de novo.'
          : 'Não foi possível enviar agora. Tente novamente em instantes.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="forgot-dialog"
      aria-labelledby="forgot-title"
      aria-describedby="forgot-description"
      onCancel={(event) => { event.preventDefault(); close(); }}
      // Clique fora do conteúdo (no fundo escurecido) fecha o modal.
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="forgot-dialog-body">
        <button type="button" className="forgot-dialog-close" aria-label="Fechar" onClick={close}>
          <X size={18} />
        </button>

        {sentMessage ? (
          <div role="status">
            <div className="forgot-dialog-icon" aria-hidden="true"><MailCheck size={24} /></div>
            <h2 id="forgot-title">Confira seu e-mail</h2>
            <p id="forgot-description" className="forgot-dialog-lead">
              {sentMessage} O link vale por 30 minutos.
            </p>
            <p className="forgot-dialog-address"><Mail size={16} aria-hidden="true" /> {email.trim()}</p>
            <p className="forgot-dialog-note">Não chegou em alguns minutos? Confira a caixa de spam ou peça um novo link.</p>
            <button type="button" className="login-submit forgot-dialog-done" onClick={close}>
              Voltar para o login
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <div className="forgot-dialog-icon" aria-hidden="true"><KeyRound size={24} /></div>
            <h2 id="forgot-title">Esqueceu a senha?</h2>
            <p id="forgot-description" className="forgot-dialog-lead">
              Confirme o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
            </p>

            <label className="login-field">
              <span>E-mail da conta</span>
              <div>
                <Mail size={18} aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="email"
                  placeholder="voce@escola.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </label>
            {error && <p className="forgot-dialog-error" role="alert">{error}</p>}

            <div className="forgot-dialog-actions">
              <button type="button" className="forgot-dialog-cancel" onClick={close}>Cancelar</button>
              <button type="submit" className="login-submit" disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar link'}
                {!sending && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </div>

            <p className="forgot-dialog-note">
              Entra com usuário ou código da escola? Peça um novo link a um educador ou responsável.
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}
