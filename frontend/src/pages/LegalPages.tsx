import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageTransition } from '@/components/shared/PageTransition';
import { BrandMark } from '@/components/shared/BrandMark';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { LegalDocumentContent, legalDocuments, type LegalDocument } from '@/components/shared/LegalDocuments';
import './legal-pages.css';

type LegalShellProps = {
  children: ReactNode;
  centered?: boolean;
  showBack?: boolean;
};

/* Moldura comum: marca para o início, conteúdo e, nos documentos, rodapé azul da identidade. */
function LegalShell({ children, centered = false, showBack = false }: LegalShellProps) {
  return (
    <PageTransition>
      <div className={`lgp${centered ? ' lgp--center' : ''}`}>
        <header className="lgp-top">
          <Link to="/" className="lgp-brand" aria-label="SecurePlay, página inicial">
            <BrandMark variant="horizontal" decorative />
          </Link>
          {showBack && (
            <Link to="/" className="lgp-back"><ArrowLeft size={18} aria-hidden="true" /> Voltar para o início</Link>
          )}
        </header>
        <main className="lgp-main">{children}</main>
        {!centered && <footer className="lgp-footer">
          <nav className="lgp-footer-nav" aria-label="Políticas e acesso">
            <NavLink to="/privacidade">Privacidade</NavLink>
            <NavLink to="/termos">Termos de uso</NavLink>
            <Link to="/login">Entrar</Link>
          </nav>
          <p>© 2026 SecurePlay. Segurança digital para escolas.</p>
        </footer>}
      </div>
    </PageTransition>
  );
}

/* Documento curto (introdução e quatro seções breves): leitura contínua, sem índice. */
function LegalDocumentPage({ document }: { document: LegalDocument }) {
  const { eyebrow, title } = legalDocuments[document];
  return (
    <LegalShell showBack>
      <article className="lgp-doc" aria-labelledby="legal-title">
        <p className="lgp-eyebrow">{eyebrow}</p>
        <h1 id="legal-title" className="sp-display lgp-title">{title}</h1>
        <div className="legal-content lgp-body"><LegalDocumentContent document={document} /></div>
      </article>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return <LegalDocumentPage document="privacy" />;
}

export function TermsPage() {
  return <LegalDocumentPage document="terms" />;
}

export function NotFoundPage() {
  return (
    <LegalShell centered>
      <section className="lgp-lost" aria-labelledby="not-found-title">
        <div className="lgp-lost-character">
          <BrandCharacter expression="surprised" float />
        </div>
        <p className="lgp-eyebrow">Erro 404</p>
        <h1 id="not-found-title" className="sp-display lgp-title">Essa trilha ainda não existe</h1>
        <p className="lgp-lost-copy">Volte para o início e escolha uma das aventuras disponíveis.</p>
        <div className="lgp-actions">
          <Link to="/" className="lgp-btn lgp-btn--primary">Ir para o início</Link>
          <Link to="/login" className="lgp-btn lgp-btn--ghost">Entrar</Link>
        </div>
      </section>
    </LegalShell>
  );
}
