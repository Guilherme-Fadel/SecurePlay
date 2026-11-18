import { useEffect, useRef } from 'react';
import { LoginFeedbackRegions } from './LoginNotices';
import { MfaCodeForm, MfaReauthForm, MfaRecoveryCodes, MfaSetupSteps } from './LoginMfaParts';
import { useLoginMfa, type MfaPhase, type MfaStage } from './useLoginMfa';
import type { LoginFeedback } from './useLoginClassroom';

import './login-mfa.css';

const COPY: Record<MfaPhase, { title: string; lead: string }> = {
  setup: {
    title: 'Proteja sua conta',
    lead: 'Contas de gestão cuidam de dados de escolas e de crianças, por isso pedem verificação em duas etapas: além da senha, você confirma o acesso com um código do app autenticador.',
  },
  code: {
    title: 'Confirme que é você',
    lead: 'Digite o código de 6 números que aparece no seu app autenticador.',
  },
  recovery: {
    title: 'Use um código de recuperação',
    lead: 'Digite um dos códigos que você guardou ao ativar a verificação. Cada código vale uma vez.',
  },
  codes: {
    title: 'Guarde seus códigos de recuperação',
    lead: 'Se você perder o acesso ao app autenticador, um destes códigos deixa você entrar.',
  },
};

interface LoginMfaStepProps {
  stage: MfaStage;
  feedback: LoginFeedback | null;
  onVerified: (nome: string | undefined, message: string) => Promise<void>;
  onBack: () => void;
}

/** Segunda etapa do login de gestão: cadastro do app autenticador, código e recuperação. */
export function LoginMfaStep({ stage, feedback, onVerified, onBack }: LoginMfaStepProps) {
  const mfa = useLoginMfa(stage, { onVerified });
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { phase, entry } = mfa;
  const showingCodes = phase === 'codes';
  const busy = entry.submitting || feedback?.kind === 'success';
  const copy = COPY[phase];

  // Ao entrar na etapa e ao mostrar os códigos, o foco vai para o título novo.
  useEffect(() => {
    titleRef.current?.focus();
  }, [showingCodes]);

  return (
    <div className="lgc-mfa">
      <div className="lgc-heading">
        <h1 ref={titleRef} id="login-title" tabIndex={-1} className="sp-display lgc-title lgc-mfa-title">{copy.title}</h1>
        <p className="lgc-lead">{copy.lead}</p>
      </div>
      <LoginFeedbackRegions feedback={feedback} />
      {showingCodes ? (
        <MfaRecoveryCodes codes={mfa.codes} busy={mfa.finishing || busy} onSaved={() => void mfa.confirmSaved()} />
      ) : phase === 'setup' ? (
        <MfaSetupSteps setup={mfa.setup} onRetry={() => void mfa.retrySetup()}>
          {mfa.expired
            ? <MfaReauthForm reauth={mfa.reauth} />
            : <MfaCodeForm phase={phase} entry={entry} busy={busy} blocked={mfa.setup.status !== 'ready'} onSwitch={mfa.switchPhase} />}
        </MfaSetupSteps>
      ) : mfa.expired ? (
        <MfaReauthForm reauth={mfa.reauth} />
      ) : (
        <MfaCodeForm phase={phase} entry={entry} busy={busy} blocked={false} onSwitch={mfa.switchPhase} />
      )}
      <button type="button" className="lgc-link lgc-mfa-back" onClick={onBack}>Voltar ao login</button>
    </div>
  );
}
