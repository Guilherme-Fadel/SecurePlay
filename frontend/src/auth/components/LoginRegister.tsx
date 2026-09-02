import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import learningScene from '@/assets/kids/academia-missoes-login-v1.png';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { loginService } from '@/services/login/login';

import './login-register.css';

export function LoginRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setSession, refreshSession } = useCurrentUser();
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const result = await loginService(email, password);

      if (!result.sucesso) {
        toast.error(result.mensagem);
        setPassword('');
        return;
      }

      localStorage.setItem('nome', result.nome ?? '');

      if (result.user) {
        setSession(result.user);
      } else {
        await refreshSession();
      }

      toast.success(result.mensagem);
      navigate('/home');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <motion.aside
        className="login-showcase"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="login-brand">
          <span>secure<span>play</span></span>
        </div>

        <div className="login-showcase-copy">
          <span className="login-academy-label"><ShieldCheck size={18} /> Academia de Missões</span>
          <h1>Aprender a se<br /><em>proteger</em> é uma aventura.</h1>
          <span className="login-mission-divider" aria-hidden="true"><i /><ShieldCheck size={18} /><i /></span>
          <p>Um ambiente seguro para aprender, explorar e construir boas escolhas digitais.</p>
        </div>

        <div className="login-scene" aria-hidden="true">
          <img src={learningScene} alt="" />
        </div>

        <div className="login-security-note">
          <span className="login-security-icon"><LockKeyhole size={18} /></span>
          <div>
            <strong>Espaço seguro</strong>
            <p>Uma aventura para aprender com cuidado.</p>
          </div>
        </div>
      </motion.aside>

      <motion.main
        className="login-panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
      >
        <div className="login-mobile-brand">
          <span>secure<span>play</span></span>
        </div>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-icon" aria-hidden="true"><KeyRound size={23} /></div>
          <div className="login-heading">
            <h2 id="login-title">Acesse sua<br />próxima missão</h2>
            <p>Entre com os dados da sua escola ou organização para continuar.</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <label className="login-field">
              <span>E-mail</span>
              <div>
                <Mail size={18} aria-hidden="true" />
                <input
                  type="email"
                  placeholder="voce@escola.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>

            <label className="login-field">
              <span>Senha</span>
              <div>
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className="login-actions">
              <button
                type="button"
                className="login-forgot-password"
                onClick={() => toast.info('Peça ajuda a um responsável ou educador para entrar de novo.')}
              >
                Preciso de ajuda
              </button>
            </div>

            <button type="submit" className="login-submit" disabled={isLoading}>
              {isLoading ? 'Preparando...' : 'Entrar na aventura'}
              {!isLoading && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>

          <div className="login-help">
            <span>Ainda não tem convite?</span>
            <p>Peça ajuda a um responsável, educador ou administrador da sua turma.</p>
          </div>
        </section>

        <p className="login-footer"><ShieldCheck size={14} aria-hidden="true" /> Um lugar para aprender e se cuidar na internet</p>
      </motion.main>
    </div>
  );
}
