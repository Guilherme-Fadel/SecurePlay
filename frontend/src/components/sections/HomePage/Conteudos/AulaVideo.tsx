import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, PlayCircle, Sparkles, Video } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useAula } from '@/hooks/useAula';
import { useAulaProgress } from '@/hooks/useAulaProgress';
import { useModulo } from '@/hooks/useModulo';
import { LearningShell } from './LearningShell';
import { LessonNavigator } from './LessonNavigator';

interface AulaVideoProps {
  aulaId: number;
  moduloId: number;
  onBack: () => void;
  onSelectAula: (aulaId: number) => void;
  onTypeResolved?: (type: 'video' | 'quadrinho') => void;
}

export function AulaVideo({ aulaId, moduloId, onBack, onSelectAula, onTypeResolved }: AulaVideoProps) {
  const { aula, setAula, loading } = useAula(aulaId);
  const { modulo } = useModulo(moduloId);
  const { concluir, salvarProgresso, loading: concluding } = useAulaProgress();
  const [xpGanho, setXpGanho] = useState<number | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastPersistedSecond = useRef(0);

  useEffect(() => {
    if (!aula) return;
    if (onTypeResolved && aula.type === 'quadrinho') {
      onTypeResolved('quadrinho');
      return;
    }
    setVideoProgress(aula.completed ? 100 : Math.max(1, aula.progress.percent));
    lastPersistedSecond.current = aula.progress.lastVideoSecond;
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

  const handleConcluir = async () => {
    const result = await concluir(aulaId);
    if (result) {
      setXpGanho(result.xp_ganho);
      setVideoProgress(100);
      setAula((previous) => previous ? { ...previous, completed: true, progress: { ...previous.progress, percent: 100 } } : previous);
    }
  };

  if (loading || !aula) {
    return <div className="learning-content-loading">Preparando ambiente de aula...</div>;
  }

  return (
    <LearningShell
      eyebrow={modulo?.title ?? 'Treinamento em andamento'}
      title={aula.title}
      description={aula.description}
      icon={Video}
      onBack={onBack}
      progress={videoProgress}
      progressLabel={aula.completed ? 'Aula concluída' : `${videoProgress}% assistido`}
      meta={[
        { label: 'Duração', value: `${aula.duration} min` },
        { label: 'Recompensa', value: `${aula.xp} XP` },
        { label: 'Formato', value: 'Vídeo' },
      ]}
      aside={<LessonNavigator modulo={modulo} activeAulaId={aulaId} onSelectAula={onSelectAula} />}
      footer={
        <>
          <div className="learning-lesson-footer-status">
            {aula.completed
              ? <><CheckCircle2 size={17} /><div><span>Status da fase</span><strong>Concluída</strong></div></>
              : <><PlayCircle size={17} /><div><span>Status da fase</span><strong>Em treinamento</strong></div></>}
          </div>
          {!aula.completed && (
            <AppButton icon={<CheckCircle2 size={16} />} onClick={handleConcluir} disabled={concluding}>
              {concluding ? 'Registrando...' : 'Concluir aula'}
            </AppButton>
          )}
        </>
      }
    >
      <div className="video-learning-stage">
        <div className="video-learning-player">
          {aula.content_url ? (
            <video
              ref={videoRef}
              controls
              src={aula.content_url}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={() => persistVideoPosition()}
              onPause={() => persistVideoPosition(true)}
            >
              Seu navegador não suporta vídeo.
            </video>
          ) : (
            <div className="video-learning-empty"><PlayCircle size={42} /><strong>Vídeo indisponível</strong><span>O material ainda não foi publicado.</span></div>
          )}
        </div>

        <div className="video-learning-briefing">
          <div><span>BRIEFING DA FASE</span><h2>O que você vai aprender</h2></div>
          <p>{aula.description || 'Assista ao treinamento e conclua a fase para liberar o próximo conteúdo.'}</p>
          <div className="video-learning-facts">
            <span><Clock3 size={14} /> {aula.duration} minutos</span>
            <span><Sparkles size={14} /> {aula.xp} XP ao concluir</span>
          </div>
        </div>

        {xpGanho !== null && (
          <div className="learning-xp-reveal"><Sparkles size={18} /><div><span>Fase concluída</span><strong>+{xpGanho} XP adicionados</strong></div></div>
        )}
      </div>
    </LearningShell>
  );
}
