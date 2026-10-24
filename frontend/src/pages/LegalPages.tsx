import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageTransition } from '@/components/shared/PageTransition';
import './legal-pages.css';
import { LegalDocumentContent, legalDocuments } from '@/components/shared/LegalDocuments';

type LegalPageProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
};

function LegalPage({ title, eyebrow, children }: LegalPageProps) {
  return (
    <PageTransition>
      <main className="legal-page">
        <section className="legal-card" aria-labelledby="legal-title">
          <Link to="/" className="legal-back"><ArrowLeft size={17} /> Voltar para o início</Link>
          <div className="legal-mark" aria-hidden="true"><ShieldCheck size={25} /></div>
          <p className="legal-eyebrow">{eyebrow}</p>
          <h1 id="legal-title">{title}</h1>
          <div className="legal-content">{children}</div>
        </section>
      </main>
    </PageTransition>
  );
}

export function PrivacyPage() {
  return <LegalPage {...legalDocuments.privacy}><LegalDocumentContent document="privacy" /></LegalPage>;
}

export function TermsPage() {
  return <LegalPage {...legalDocuments.terms}><LegalDocumentContent document="terms" /></LegalPage>;
}

export function NotFoundPage() {
  return (
    <LegalPage eyebrow="PÁGINA NÃO ENCONTRADA" title="Essa trilha ainda não existe">
      <p>Volte para o início e escolha uma das aventuras disponíveis.</p>
    </LegalPage>
  );
}
