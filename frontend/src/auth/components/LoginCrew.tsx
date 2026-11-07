import { BrandCharacter, type BrandCharacterExpression, type BrandCharacterProps } from '@/components/shared/BrandCharacter';
import type { LoginFailureReason } from '@/services/login/types';
import type { LoginFeedback, LoginFocus } from './useLoginClassroom';

/** Como o personagem principal reage ao que o aluno faz no formulário. */
export type CrewMood = 'neutral' | 'curious' | 'shy' | 'startled' | 'happy' | 'busy' | 'notice';

interface MoodInput {
  feedback: LoginFeedback | null;
  submitting: boolean;
  startled: boolean;
  focus: LoginFocus;
}

export function deriveCrewMood({ feedback, submitting, startled, focus }: MoodInput): CrewMood {
  if (feedback?.kind === 'success') return 'happy';
  if (submitting) return 'busy';
  if (startled) return 'startled';
  if (focus === 'password') return 'shy';
  if (focus === 'identifier') return 'curious';
  if (feedback && feedback.kind !== 'error') return 'notice';
  return 'neutral';
}

const EXPRESSION: Record<CrewMood, BrandCharacterExpression> = {
  neutral: 'open',
  curious: 'curious',
  shy: 'closed',
  startled: 'startled',
  happy: 'happy',
  busy: 'open',
  notice: 'open',
};

const SPEECH: Record<Exclude<CrewMood, 'startled'>, string> = {
  neutral: 'Oi! Bora para a próxima missão?',
  curious: 'Vale usuário, e-mail ou o código da escola.',
  shy: 'Pode digitar. Não estou olhando sua senha.',
  happy: 'Tudo certo! Abrindo sua próxima missão.',
  busy: 'Preparando sua aventura…',
  notice: 'Quase lá! Siga o aviso para continuar.',
};

const CREDENTIAL_REASONS: ReadonlySet<LoginFailureReason> = new Set(['missing_fields', 'invalid_credentials', 'invalid_input']);

/** O balão é decorativo: o aviso do formulário é que anuncia o erro. */
function speechFor(mood: CrewMood, feedback: LoginFeedback | null): string {
  if (mood !== 'startled') return SPEECH[mood];
  const reason = feedback?.kind === 'error' ? feedback.reason : null;
  if (reason === 'rate_limited') return 'Opa! Vamos respirar e tentar daqui a pouco.';
  if (reason && CREDENTIAL_REASONS.has(reason)) return 'Opa! Confira o usuário e a senha.';
  return 'Opa! Algo não saiu como esperado.';
}

/** A turma ao redor do personagem principal: posição fixa no CSS, expressão fixa aqui. */
const CLASSMATES: Array<BrandCharacterProps & { slot: string }> = [
  { slot: 'a', body: 'var(--sp-yellow)', face: 'var(--sp-black)', expression: 'happy' },
  { slot: 'b', body: 'var(--sp-pink)', face: 'var(--sp-cream)', expression: 'curious' },
  { slot: 'c', body: 'var(--sp-orange)', face: 'var(--sp-yellow)', expression: 'playful' },
  { slot: 'd', body: 'var(--sp-red)', face: 'var(--sp-pink)', expression: 'sleepy' },
  { slot: 'e', body: 'var(--sp-cream)', face: 'var(--sp-blue)', expression: 'open', blink: true },
];

export function LoginCrew(props: MoodInput) {
  const mood = deriveCrewMood(props);
  return (
    <div className="lgc-side">
      <div className="lgc-crew" aria-hidden="true">
        {CLASSMATES.map(({ slot, ...character }) => (
          <div key={slot} className={`lgc-mate lgc-mate--${slot}`}>
            <BrandCharacter {...character} />
          </div>
        ))}
        <div className="lgc-mate lgc-mate--main" data-mood={mood}>
          <BrandCharacter body="var(--sp-blue)" face="var(--sp-cream)" expression={EXPRESSION[mood]} blink={mood === 'neutral'} float />
        </div>
      </div>
      <p className="lgc-bubble" aria-hidden="true">{speechFor(mood, props.feedback)}</p>
      <h2 className="sp-display lgc-side-title">A turma já está na trilha.</h2>
      <p className="lgc-side-copy">Aulas, jogos e conquistas esperam por você, cada um no seu ritmo.</p>
    </div>
  );
}
