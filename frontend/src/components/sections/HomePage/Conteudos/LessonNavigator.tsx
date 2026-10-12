import { BookOpen, Check, CheckCircle2, Lock, Video } from 'lucide-react';
import type { ModuloDetalhes } from '@/services/conteudo';
import { getModuleArtwork, missionRoomAssets } from '@/lib/staticArtwork';
import { sortAulasByModuleSequence } from '@/lib/lessonOrder';
import { useEffect, useState } from 'react';
import { useNotebookLayout } from '@/hooks/useNotebookLayout';
import { PageControls } from '@/components/ui/navigation/PageControls';

interface LessonNavigatorProps {
  modulo: ModuloDetalhes | null;
  activeAulaId: number;
  onSelectAula: (aulaId: number) => void;
}

const lessonTypeLabels: Record<string, string> = { video: 'Vídeo', texto: 'Leitura', quadrinho: 'Quadrinho' };

export function LessonNavigator({ modulo, activeAulaId, onSelectAula }: LessonNavigatorProps) {
  const compact = useNotebookLayout();
  const [page, setPage] = useState(0);
  useEffect(() => {
    const index = sortAulasByModuleSequence(modulo?.aulas ?? []).findIndex(aula => aula.id === activeAulaId);
    setPage(Math.floor(Math.max(0, index) / 2));
  }, [modulo?.id, activeAulaId]);
  if (!modulo) {
    return <div className="lesson-navigator-loading">Carregando roteiro...</div>;
  }

  const orderedAulas = sortAulasByModuleSequence(modulo.aulas);
  const safePage = Math.min(page, Math.max(0, Math.ceil(orderedAulas.length / 2) - 1));
  const firstIndex = compact ? safePage * 2 : 0;
  const visibleAulas = compact ? orderedAulas.slice(firstIndex, firstIndex + 2) : orderedAulas;

  return (
    <div className="lesson-navigator">
      <header>
        <div><section><span>SUA JORNADA</span><h2>Aulas do módulo</h2></section></div>
      </header>
      <progress className="classroom-module-progress" aria-label="Aulas concluídas no módulo" value={modulo.completedAulas} max={Math.max(1, modulo.totalAulas)} />
      <p className="classroom-module-count">{modulo.completedAulas} de {modulo.totalAulas} concluídas</p>
      <ol className="classroom-lesson-trail">
        {visibleAulas.map((aula, index) => (
          <li key={aula.id} className={aula.id === activeAulaId ? 'is-active' : ''}>
            <span className="classroom-lesson-number" aria-hidden="true">{aula.status === 'completed' ? <Check size={14} /> : index + 1 + firstIndex}</span>
            <button type="button" disabled={aula.status === 'locked'} aria-current={aula.id === activeAulaId ? 'step' : undefined}
              onClick={() => aula.id !== activeAulaId && onSelectAula(aula.id)}>
              <img className="classroom-lesson-art" src={aula.artworkKey && missionRoomAssets[aula.artworkKey] || getModuleArtwork(modulo)} alt="" />
              <span className="classroom-lesson-label"><strong>{aula.title}</strong><small>
                {aula.type === 'video' ? <Video size={12} /> : <BookOpen size={12} />}
                {lessonTypeLabels[aula.type] ?? 'Quadrinho'}
                {aula.status === 'completed' && ' · Concluída'}
                {aula.id === activeAulaId && aula.status !== 'completed' && ' · Nesta aula'}
              </small></span>
              <span className="classroom-lesson-reward"><strong>{aula.xp} XP</strong>
                {aula.status === 'locked' ? <Lock size={14} aria-label="Aula bloqueada" /> : <img src={missionRoomAssets['icon-star']} alt="" />}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {compact && <PageControls page={safePage} total={Math.ceil(orderedAulas.length / 2)} onChange={setPage} label="Roteiro de aulas" />}
      {modulo.progress === 100 && (
        <div className="lesson-navigator-complete"><CheckCircle2 size={15} /> Módulo concluído</div>
      )}
    </div>
  );
}
