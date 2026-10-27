import { ContentLoading } from '@/components/shared/ContentLoading';
import { useModulo } from '@/hooks/useModulo';
import { AulaListItem } from './AulaListItem';
import { AulaResumo } from '@/services/conteudo';
import { ArrowLeft, CheckCircle2, Play, Star, Trophy } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { MissionRoomAssets, useMissionRoomAssets } from '@/hooks/useMissionRoomAssets';
import { ProgressiveImage } from '@/components/ui/visuals/ProgressiveImage';
import { getModuleArtwork } from '@/lib/staticArtwork';
import { groupAulasBySections, sortAulasByModuleSequence } from '@/lib/lessonOrder';
import '@/styles/module-library-room.css';
import { useEffect, useState } from 'react';
import { useNotebookLayout } from '@/hooks/useNotebookLayout';
import { PageControls } from '@/components/ui/navigation/PageControls';
import { useModuleBookFrame } from '@/hooks/useModuleBookFrame';

interface ModuloDetalhesProps { moduloId: number; onBack: () => void; onSelectAula: (aulaId: number) => void; }

export function ModuloDetalhes({ moduloId, onBack, onSelectAula }: ModuloDetalhesProps) {
  const { modulo, loading, error, refetch } = useModulo(moduloId);
  const assets = useMissionRoomAssets();
  const frame = useModuleBookFrame(assets['module-book-frame-clean']);
  const compact = useNotebookLayout();
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [moduloId]);
  const failure = error || (frame.status === 'error' ? 'Não foi possível abrir a imagem do livro.' : null);
  if (failure || (!loading && !modulo)) return (
    <div className="app-page flex flex-col items-center justify-center gap-4 min-h-64">
      <p role="alert">{failure || 'Esta missão não está disponível.'}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <AppButton onClick={() => { void refetch(); frame.retry(); }}>Tentar novamente</AppButton>
        <AppButton onClick={onBack} variant="secondary">Voltar aos conteúdos</AppButton>
      </div>
    </div>
  );
  if (loading || !modulo || frame.status === 'loading') return (
    <div className="app-page module-book-page">
      <AppButton onClick={onBack} variant="ghost">Voltar aos conteúdos</AppButton>
      <ContentLoading variant="book" />
    </div>
  );

  const orderedAulas = sortAulasByModuleSequence(modulo.aulas);
  const sections = groupAulasBySections(orderedAulas);
  const bookPages = sections.flatMap((section, sectionIndex) =>
    Array.from({ length: Math.ceil(section.aulas.length / 2) }, (_, index) => ({
      ...section, sectionIndex, offset: index * 2, aulas: section.aulas.slice(index * 2, index * 2 + 2),
    })),
  );
  const safePage = Math.min(page, Math.max(0, bookPages.length - 1));
  const visibleSections = compact ? bookPages.slice(safePage, safePage + 1) : sections.map((section, sectionIndex) => ({ ...section, sectionIndex, offset: 0 }));
  const nextAula = orderedAulas.find((aula) => aula.status === 'unlocked');
  const stars = modulo.difficulty === 'iniciante' ? 1 : modulo.difficulty === 'intermediario' ? 2 : 3;

  return (
    <div className="app-page module-book-page">
      <AppButton onClick={onBack} variant="ghost" size="sm" icon={<ArrowLeft size={16} />} className="w-fit">Voltar aos conteúdos</AppButton>
      <main className="module-book" style={{ '--module-book-frame': `url(${assets['module-book-frame-clean']})` } as React.CSSProperties}>
        <section className="module-book-summary">
          <div className="module-book-cover"><ProgressiveImage src={getModuleArtwork(modulo)} alt="" /></div>
          <span className="module-book-category">{modulo.category}</span>
          <h1>{modulo.title}</h1><p>{modulo.description}</p>
          <div className="module-book-progress"><div className="module-book-stars" aria-label={`${stars} estrelas de dificuldade`}>{Array.from({ length: 3 }).map((_, index) => <Star key={index} className={index < Math.max(stars, Math.ceil(modulo.progress / 34)) ? 'is-filled' : ''} />)}</div><strong>{modulo.progress}%</strong></div>
          <div className="module-book-reward"><Trophy size={22} /><span>RECOMPENSA<strong>+{modulo.xp_bonus} XP</strong></span></div>
          {nextAula ? <AppButton icon={<Play size={17} />} onClick={() => onSelectAula(nextAula.id)}>{nextAula.progress_percent > 0 ? 'Continuar próxima aula' : 'Iniciar próxima aula'}</AppButton> : <div className="learning-module-complete"><CheckCircle2 size={16} /> Missão concluída</div>}
        </section>
        <section className="module-book-route" aria-label="Capítulos e aulas do módulo">
          <div className="module-book-scroll">
            {visibleSections.map(({ name, aulas, sectionIndex, offset }) => <section className="module-book-chapter" key={`${sectionIndex}-${offset}`}>
              <header><span>Capítulo {sectionIndex + 1}</span><i /><strong>{name || 'Aulas da missão'}</strong></header>
              <div className="module-book-lessons">{aulas.map((aula, aulaIndex) => <AulaListItem key={aula.id} aula={aula} index={aulaIndex + offset} artSrc={getLessonIcon(aula, aulaIndex + offset, assets)} onClick={() => onSelectAula(aula.id)} />)}</div>
            </section>)}
            {(!compact || safePage === bookPages.length - 1) && <div className="module-book-finish"><Trophy size={18} /><span>Fim da missão</span></div>}
          </div>
          {compact && <PageControls page={safePage} total={bookPages.length} onChange={setPage} label="Aulas do livro" />}
        </section>
      </main>
    </div>
  );
}

const lessonKeys = ['module-foundations','module-passwords','module-authentication','module-privacy','module-phishing','module-navigation'];
function getLessonIcon(aula: AulaResumo, index: number, assets: MissionRoomAssets) {
  const key = aula.artworkKey && assets[aula.artworkKey]
    ? aula.artworkKey
    : lessonKeys[index % lessonKeys.length];
  return assets[key];
}
