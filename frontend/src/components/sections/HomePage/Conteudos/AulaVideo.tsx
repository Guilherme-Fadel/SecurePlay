import { ContentLoading } from '@/components/shared/ContentLoading';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, PlayCircle, RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useAula } from '@/hooks/useAula';
import { useAulaProgress } from '@/hooks/useAulaProgress';
import { useModulo } from '@/hooks/useModulo';
import { LearningShell } from './LearningShell';
import { LessonCheckpoint } from './LessonCheckpoint';
import { LessonNavigator } from './LessonNavigator';
import { LessonState } from './LessonState';
import { LessonStepper } from './LessonStepper';
import { formatClock } from './lessonContext';
import { ProgressSaveStatus } from './ProgressSaveStatus';
import { useCanonicalLearnPath } from './useCanonicalLearnPath';

interface AulaVideoProps {
  aulaId: number;
  moduloId: number;
  onBack: () => void;
  onSelectAula: (aulaId: number) => void;
  onTypeResolved?: (type: 'video' | 'quadrinho' | 'texto') => void;
}

export function AulaVideo({ aulaId, moduloId, onBack, onSelectAula, onTypeResolved }: AulaVideoProps) {
  const { aula, setAula, loading, error: aulaError, errorKind, refetch } = useAula(aulaId);
  const { modulo, refetch: refetchModulo } = useModulo(moduloId);
  useCanonicalLearnPath(modulo, aula && { id: aula.id, title: aula.title, moduloId: aula.modulo_id });
  const { concluir, salvarProgresso, retryProgress, saveStatus, loading: concluding, error: progressError } = useAulaProgress();
  const [xpGanho, setXpGanho] = useState<number | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastPersistedSecond = useRef(0);

  useEffect(() => {
    if (!aula) return;
    if (onTypeResolved && aula.type !== 'video') {
      onTypeResolved(aula.type);
      return;
    }
    setVideoProgress(aula.completed ? 100 : Math.max(1, aula.progress.percent));
    lastPersistedSecond.current = aula.progress.lastVideoSecond;
    if (aula.completed) return;
    void salvarProgresso(aula.id, {
      progress_percent: aula.completed ? 100 : Math.max(1, aula.progress.percent),
      last_video_second: aula.progress.lastVideoSecond,
    });
  }, [aula?.id, onTypeResolved, salvarProgresso]);

  const persistVideoPosition = (force = false) => {
    const player = videoRef.current;
    if (!player || !aula || aula.completed || !Number.isFinite(player.duration)) return;
    const second = Math.max(0, Math.floor(player.currentTime));
    if (!force && Math.abs(second - lastPersistedSecond.current) < 10) return;
    const percent = Math.min(99, Math.max(1, Math.round((second / player.duration) * 100)));
    lastPersistedSecond.current = second;
    setVideoProgress(percent);
    void salvarProgresso(aula.id, { progress_percent: percent, last_video_second: second });
  };

  const handleLoadedMetadata = () => {
    const player = videoRef.current;
    if (!player || !aula || aula.completed) return;
    if (aula.progress.lastVideoSecond > 0 && aula.progress.lastVideoSecond < player.duration) {
      player.currentTime = aula.progress.lastVideoSecond;
    }
  };

  const handleResume = () => {
    const player = videoRef.current;
    if (!player || !aula) return;
    if (aula.progress.lastVideoSecond > 0 && aula.progress.lastVideoSecond < player.duration) {
      player.currentTime = aula.progress.lastVideoSecond;
    }
    void player.play().catch(() => undefined);
    player.focus();
  };

  const handleConcluir = async () => {
    const result = await concluir(aulaId);
    if (result) {
      setXpGanho(result.xp_ganho);
      setVideoProgress(100);
      setAula((previous) => previous ? { ...previous, completed: true, progress: { ...previous.progress, percent: 100 } } : previous);
      void refetchModulo();
    }
  };

  if (loading || !aula) {
    if (!aulaError) return <ContentLoading variant="reader" />;
    return <LessonState message={aulaError} kind={errorKind} onRetry={refetch} onBack={onBack} />;
  }
  if (onTypeResolved && aula.type !== 'video') return <ContentLoading variant="reader" />;

  const resumeAt = !aula.completed && !started && aula.content_url && aula.progress.lastVideoSecond > 0
    ? formatClock(aula.progress.lastVideoSecond) : null;

  return (
    <LearningShell
      aulaId={aulaId}
      title={aula.title}
      type="video"
      xp={aula.xp}
      duration={aula.duration}
      modulo={modulo}
      onBack={onBack}
      progress={videoProgress}
      progressLabel={aula.completed ? 'Aula concluída' : `${videoProgress}% assistido`}
      steps={<LessonStepper steps={[
        { key: 'watch', label: 'Assistir', status: aula.completed ? 'done' : 'current' },
        { key: 'done', label: 'Concluir', status: aula.completed ? 'done' : 'next' },
      ]} />}
      aside={<LessonNavigator modulo={modulo} activeAulaId={aulaId} onSelectAula={onSelectAula} />}
      footer={<ProgressSaveStatus status={saveStatus} onRetry={retryProgress} />}
    >
      <section className="lesson-pane" aria-label="Vídeo da aula">
        <div className="lesson-player">
          {aula.content_url ? (
            <video
              ref={videoRef}
              controls
              preload="metadata"
              src={aula.content_url}
              aria-label={`Vídeo: ${aula.title}`}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setStarted(true)}
              onTimeUpdate={() => persistVideoPosition()}
              onPause={() => persistVideoPosition(true)}
            >
              Seu navegador não suporta vídeo.
            </video>
          ) : (
            <div className="lesson-player-empty" role="status">
              <PlayCircle size={42} aria-hidden="true" />
              <strong>Vídeo indisponível</strong>
              <span>O material ainda não foi publicado.</span>
            </div>
          )}
        </div>

        {resumeAt && (
          <div className="lesson-resume">
            <button type="button" onClick={handleResume}>
              <RotateCcw size={16} aria-hidden="true" />Continuar de {resumeAt}
            </button>
          </div>
        )}

        {xpGanho !== null && (
          <LessonCheckpoint variant="compact" title="Checkpoint! Aula concluída" xp={xpGanho}
            actions={<AppButton variant="chunky" tone="blue" icon={<ArrowRight size={18} aria-hidden="true" />} onClick={onBack}>Seguir na trilha</AppButton>} />
        )}

        <nav className="lesson-nav" aria-label="Conclusão do vídeo">
          <span>{aula.completed
            ? <><CheckCircle2 size={16} aria-hidden="true" /> Aula concluída</>
            : `${videoProgress}% assistido`}</span>
          {progressError && <p className="lesson-error" role="alert">{progressError} Tente concluir novamente.</p>}
          {!aula.completed && (
            <AppButton variant="chunky" tone="blue" onClick={handleConcluir} disabled={concluding}>
              {concluding ? 'Registrando...' : progressError ? 'Tentar concluir novamente' : 'Concluir aula'}
            </AppButton>
          )}
        </nav>

        {aula.description && <div className="lesson-brief"><strong>O que você vai aprender</strong>{aula.description}</div>}
      </section>
    </LearningShell>
  );
}
