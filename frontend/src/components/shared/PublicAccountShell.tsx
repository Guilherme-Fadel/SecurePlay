import type { ReactNode, Ref } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/shared/BrandMark';
import { BrandCharacter, type BrandCharacterExpression } from '@/components/shared/BrandCharacter';
import { PageTransition } from '@/components/shared/PageTransition';
import { AccountFeedbackRegions, type AccountFeedback } from './PublicAccountUi';
import '@/styles/public-brand.css';
import './public-account.css';

/** Formas de fundo do login "Sala da turma"; puramente decorativas. */
function AccountBackdrop() {
  return (
    <>
      <svg className="pas-wave pas-wave--top" viewBox="0 0 600 360" aria-hidden="true" focusable="false">
        <path fill="var(--sp-pink)" d="M120 0 H600 V320 C 520 360, 430 300, 380 230 C 330 160, 250 140, 180 100 C 130 70, 110 30, 120 0 Z" />
      </svg>
      <svg className="pas-wave pas-wave--left" viewBox="0 0 600 380" aria-hidden="true" focusable="false">
        <path fill="var(--sp-yellow)" d="M0 40 C 120 0, 240 60, 300 150 C 360 240, 450 300, 600 380 H0 Z" />
        <path fill="var(--sp-orange)" d="M0 200 C 90 170, 170 220, 210 280 C 240 330, 280 360, 330 380 H0 Z" />
      </svg>
      <svg className="pas-wave pas-wave--right" viewBox="0 0 420 300" aria-hidden="true" focusable="false">
        <path fill="var(--sp-blue)" d="M420 0 C 330 20, 270 100, 250 170 C 230 240, 190 280, 120 300 H420 Z" />
      </svg>
    </>
  );
}

export interface AccountCharacter {
  expression: BrandCharacterExpression;
  /** Fala decorativa: o conteúdo da tela é que comunica o estado. */
  speech: string;
}

function AccountSide({ expression, speech }: AccountCharacter) {
  return (
    <div className="pas-side" aria-hidden="true">
      <div className="pas-character">
        <BrandCharacter body="var(--sp-blue)" face="var(--sp-cream)" expression={expression} blink={expression === 'open'} float />
      </div>
      <p className="pas-bubble">{speech}</p>
    </div>
  );
}

interface PublicAccountShellProps {
  titleId: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Recebe o foco programático quando a tela muda de estado (ex.: sucesso). */
  titleRef?: Ref<HTMLHeadingElement>;
  character?: AccountCharacter;
  /** Avisos da tela; as regiões vivas ficam montadas logo abaixo do título. */
  feedback?: AccountFeedback | null;
  wide?: boolean;
  busy?: boolean;
  children?: ReactNode;
}

export function PublicAccountShell({ titleId, title, lead, titleRef, character, feedback, wide = false, busy, children }: PublicAccountShellProps) {
  return (
    <PageTransition>
      <div className="pas">
        <AccountBackdrop />
        <header className="pas-top">
          <Link to="/" className="pas-brand" aria-label="SecurePlay, ir para a página inicial">
            <BrandMark variant="horizontal" tone="auto" decorative />
          </Link>
        </header>
        <main className="pas-stage">
          <section className={wide ? 'pas-panel pas-panel--wide' : 'pas-panel'} aria-labelledby={titleId} aria-busy={busy || undefined}>
            <div className="pas-main">
              <div className="pas-heading">
                <h1 id={titleId} ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="sp-display pas-title">{title}</h1>
                {lead && <p className="pas-lead">{lead}</p>}
              </div>
              {feedback !== undefined && <AccountFeedbackRegions feedback={feedback} />}
              {children}
            </div>
            {character && <AccountSide {...character} />}
          </section>
        </main>
      </div>
    </PageTransition>
  );
}
