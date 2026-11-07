import { Link } from 'react-router-dom';
import { PublicAccountShell } from '@/components/shared/PublicAccountShell';

export default function TrialExpired() {
  return (
    <PublicAccountShell
      titleId="trial-expired-title"
      title={<>Seu teste <em>terminou</em></>}
      lead="Obrigado por conhecer a experiência de aluno. Seu progresso foi preservado. Para continuar com sua escola, entre em contato com nossa equipe."
      character={{ expression: 'surprised', speech: 'Uau, sete dias passam rápido!' }}
    >
      <div className="pas-actions">
        <a className="pas-cta" href="mailto:contato@secureplay.com?subject=Quero%20conhecer%20os%20planos%20SecurePlay">Falar com a SecurePlay</a>
      </div>
      <div className="pas-foot">
        <Link className="pas-link" to="/login">Entrar com outra conta</Link>
        <Link className="pas-link" to="/">Voltar à página inicial</Link>
      </div>
    </PublicAccountShell>
  );
}
