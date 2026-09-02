import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageTransition } from '@/components/shared/PageTransition';
import './legal-pages.css';

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
  return (
    <LegalPage eyebrow="PRIVACIDADE" title="Cuidamos dos seus dados">
      <p>O SecurePlay foi criado para ensinar segurança digital de um jeito divertido. Usamos apenas os dados necessários para criar seu acesso, guardar seu progresso e manter a plataforma segura.</p>
      <h2>O que guardamos</h2>
      <p>Seu nome, e-mail, organização, progresso nas missões e configurações da conta. Esses dados ajudam a plataforma a funcionar e permitem que educadores ou responsáveis acompanhem o uso quando necessário.</p>
      <h2>Como protegemos você</h2>
      <p>Não mostramos seu nome completo no ranking para outras pessoas. No lugar dele, usamos um apelido de aventura. Também não vendemos dados pessoais.</p>
      <h2>Ajuda de um adulto</h2>
      <p>Se você tem menos de 13 anos, peça ajuda a um responsável ou educador para criar sua conta e tire qualquer dúvida sobre seus dados.</p>
      <h2>Fale com a gente</h2>
      <p>Para perguntas sobre privacidade, fale com a escola ou organização que enviou seu convite.</p>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage eyebrow="TERMOS DE USO" title="Combinados para uma aventura segura">
      <p>O SecurePlay é um espaço de aprendizagem. Ao usar a plataforma, você concorda em cuidar da sua conta e respeitar as outras pessoas.</p>
      <h2>Use com segurança</h2>
      <p>Não compartilhe sua senha, não tente acessar a conta de outra pessoa e conte a um adulto de confiança se algo parecer estranho.</p>
      <h2>Missões e recompensas</h2>
      <p>Seu progresso, XP e conquistas são pessoais. Eles existem para apoiar o aprendizado e podem ser ajustados pela organização responsável pela turma.</p>
      <h2>Responsáveis e educadores</h2>
      <p>Quem administra a turma é responsável por convidar participantes, orientar o uso da plataforma e apoiar crianças que precisem de ajuda.</p>
      <h2>Precisa de ajuda?</h2>
      <p>Converse com um responsável, educador ou administrador da sua organização antes de continuar se tiver dúvidas sobre estas regras.</p>
    </LegalPage>
  );
}

export function NotFoundPage() {
  return (
    <LegalPage eyebrow="PÁGINA NÃO ENCONTRADA" title="Essa trilha ainda não existe">
      <p>Volte para o início e escolha uma das aventuras disponíveis.</p>
    </LegalPage>
  );
}
