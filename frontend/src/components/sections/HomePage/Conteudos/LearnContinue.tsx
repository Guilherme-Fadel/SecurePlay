import { Play } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { Pebble } from '@/components/ui/visuals/Pebble';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { getModuleArtwork } from '@/lib/staticArtwork';
import { formatNumber, percentOf, typeLabel, type LearnJourney, type LearnModule } from './learnMapModel';
import { bloqueioDaTurma, textoDeBloqueio } from './lockCopy';

interface LearnContinueProps {
  journey: LearnJourney;
  onOpenAula: (moduloId: number, aulaId: number) => void;
  onOpenModulo: (moduloId: number) => void;
}

const QUIET_TEXT = {
  complete: { eyebrow: 'Jornada completa', title: 'Você concluiu todos os módulos!', line: 'Reveja qualquer aula quando quiser. Novos módulos aparecem neste mapa.' },
  waiting: { eyebrow: 'Aguarde a liberação', title: 'Nenhum módulo liberado agora', line: 'Assim que um módulo for liberado para você, ele aparece aqui.' },
} as const;

/** Sem aula a seguir: jornada completa ou nenhum módulo liberado. */
function LearnContinueQuiet({ complete }: { complete: boolean }) {
  const text = complete ? QUIET_TEXT.complete : QUIET_TEXT.waiting;
  return (
    <section className="lv-next is-quiet" aria-labelledby="lv-next-title">
      <BrandCharacter className="lv-next-hero" body="var(--sp-yellow)" face="var(--sp-black)" expression={complete ? 'happy' : 'open'} blink={!complete} />
      <div className="lv-next-copy">
        <p className="lv-eyebrow">{text.eyebrow}</p>
        <h2 id="lv-next-title" className="lv-display">{text.title}</h2>
        <p className="lv-next-line">{text.line}</p>
      </div>
    </section>
  );
}

/** Rótulo visível e nome acessível da ação: abre a próxima aula ou, sem ela, o módulo. */
function actionOf(current: LearnModule, firstStep: boolean) {
  const aula = current.modulo.nextAula;
  if (!aula) return { text: 'Abrir módulo', label: `Abrir módulo: ${current.modulo.title}` };
  const text = firstStep || !current.started ? 'Começar' : 'Continuar';
  return { text, label: `${text}: ${aula.title}` };
}

/** Card azul (cor da escola) com a próxima aula do módulo atual. */
export function LearnContinue({ journey, onOpenAula, onOpenModulo }: LearnContinueProps) {
  const { current } = journey;
  if (!current) return <LearnContinueQuiet complete={journey.complete} />;

  const { modulo, number } = current;
  const aula = modulo.nextAula ?? null;
  const firstStep = !journey.anyStarted;
  const eyebrow = firstStep ? `Comece pelo módulo ${number}` : 'Continue de onde parou';
  // Próxima aula fechada pela turma: em casa, o caminho é revisar o que já foi feito.
  const fechada = !!aula && bloqueioDaTurma(aula.lock_reason);
  const revisar = modulo.lastCompletedAulaId ?? null;
  const action = fechada
    ? revisar ? { text: 'Revisar a última aula', label: 'Revisar a última aula concluída' } : { text: 'Ver o módulo', label: `Ver o módulo: ${modulo.title}` }
    : actionOf(current, firstStep);
  const percent = percentOf(modulo.completedAulas, modulo.totalAulas);
  const open = () => {
    if (fechada) return revisar ? onOpenAula(modulo.id, revisar) : onOpenModulo(modulo.id);
    return aula ? onOpenAula(modulo.id, aula.id) : onOpenModulo(modulo.id);
  };

  return (
    <section className="lv-next" aria-labelledby="lv-next-title">
      <Pebble src={getModuleArtwork(modulo)} state="next" pixelated className="lv-next-art" />
      <div className="lv-next-copy">
        <p className="lv-eyebrow">{eyebrow}</p>
        <h2 id="lv-next-title" className="lv-display">{aula?.title ?? modulo.title}</h2>
        <ol className="lv-path" aria-label="Onde fica esta aula">
          <li><b>Módulo {number}</b>{modulo.title}</li>
          {aula?.section_name && <li>{aula.section_name}</li>}
          {aula && <li>Aula {aula.position} de {modulo.totalAulas} · {typeLabel(aula.type)} · {formatNumber(aula.xp)} XP</li>}
        </ol>
        {fechada && aula && <p className="lv-next-line">{aula.lock_reason === 'scheduled' ? `Próxima aula: ${textoDeBloqueio(aula.lock_reason, aula.opens_at).toLowerCase()}.` : `${textoDeBloqueio(aula.lock_reason, aula.opens_at)}.`}</p>}
        <div className="lv-next-progress">
          <span>Aulas do módulo</span>
          <span
            className="lv-bar"
            role="progressbar"
            aria-label="Aulas concluídas no módulo"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={`${modulo.completedAulas} de ${modulo.totalAulas} aulas`}
          >
            <span style={{ width: `${percent}%` }} />
          </span>
          <span>{modulo.completedAulas} de {modulo.totalAulas}</span>
        </div>
      </div>
      <AppButton
        variant="chunky"
        tone="yellow"
        size="md"
        className="lv-next-cta"
        icon={<Play size={18} fill="currentColor" aria-hidden="true" />}
        onClick={open}
        aria-label={action.label}
      >
        {action.text}
      </AppButton>
    </section>
  );
}
