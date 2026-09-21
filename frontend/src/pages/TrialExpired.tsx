import { Link } from 'react-router-dom';
import { PageTransition } from '@/components/shared/PageTransition';
import './invite-register.css';

export default function TrialExpired() {
  return <PageTransition><div className="invite-page"><main className="invite-card">
    <div className="invite-brand">secure<em>play</em></div>
    <h1>Seu teste terminou</h1>
    <p className="invite-intro">Obrigado por conhecer a experiência de aluno. Seu progresso foi preservado. Para continuar com sua escola, entre em contato com nossa equipe.</p>
    <a className="invite-primary-link" href="mailto:contato@secureplay.com?subject=Quero%20conhecer%20os%20planos%20SecurePlay">Falar com a SecurePlay</a>
    <p className="invite-legal-note"><Link to="/login">Entrar com outra conta</Link></p>
    <p className="invite-legal-note"><Link to="/">Voltar à página inicial</Link></p>
  </main></div></PageTransition>;
}
