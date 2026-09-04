import { useModulo } from '@/hooks/useModulo';
import { AulaListItem } from './AulaListItem';
import { AulaResumo } from '@/services/conteudo';
import { ArrowLeft, BookOpenCheck, CheckCircle2, Play, Sparkles, Star, Trophy } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { MissionRoomAssets, useMissionRoomAssets } from '@/hooks/useMissionRoomAssets';
import { ProgressiveImage } from '@/components/ui/visuals/ProgressiveImage';

interface ModuloDetalhesProps { moduloId: number; onBack: () => void; onSelectAula: (aulaId: number) => void; }

export function ModuloDetalhes({ moduloId, onBack, onSelectAula }: ModuloDetalhesProps) {
  const { modulo, loading } = useModulo(moduloId);
  const assets = useMissionRoomAssets();
  if (loading || !modulo || !assets['module-book-frame-clean']) return <div className="flex items-center justify-center h-64"><p className="text-[var(--text-secondary)]">Abrindo o livro da missão...</p></div>;

  const sections = groupBySections(modulo.aulas);
  const nextAula = modulo.aulas.find((aula) => aula.status === 'unlocked');
  const stars = modulo.difficulty === 'iniciante' ? 1 : modulo.difficulty === 'intermediario' ? 2 : 3;

  return (
    <div className="app-page module-book-page">
      <AppButton onClick={onBack} variant="ghost" size="sm" icon={<ArrowLeft size={16} />} className="w-fit">Voltar aos conteúdos</AppButton>
      <main className="module-book" style={{ '--module-book-frame': `url(${assets['module-book-frame-clean']})` } as React.CSSProperties}>
        <section className="module-book-summary">
          <div className="module-book-cover">{modulo.thumbnail ? <ProgressiveImage src={modulo.thumbnail} alt="" /> : <BookOpenCheck size={54} />}</div>
          <span className="module-book-category">{modulo.category}</span>
          <h1>{modulo.title}</h1><p>{modulo.description}</p>
          <div className="module-book-progress-title"><i /><Sparkles size={14} /><strong>PROGRESSO DA MISSÃO</strong><Sparkles size={14} /><i /></div>
          <div className="module-book-progress"><div className="module-book-stars" aria-label={`${stars} estrelas de dificuldade`}>{Array.from({ length: 3 }).map((_, index) => <Star key={index} className={index < Math.max(stars, Math.ceil(modulo.progress / 34)) ? 'is-filled' : ''} />)}</div><strong>{modulo.progress}%</strong></div>
          <div className="module-book-reward"><Trophy size={22} /><span>RECOMPENSA<strong>+{modulo.xp_bonus} XP</strong></span></div>
          {nextAula ? <AppButton icon={<Play size={17} />} onClick={() => onSelectAula(nextAula.id)}>{nextAula.progress_percent > 0 ? 'Continuar próxima aula' : 'Iniciar próxima aula'}</AppButton> : <div className="learning-module-complete"><CheckCircle2 size={16} /> Missão concluída</div>}
        </section>
        <section className="module-book-route" aria-label="Capítulos e aulas do módulo">
          <div className="module-book-scroll">
            {sections.map(({ name, aulas }, sectionIndex) => <section className="module-book-chapter" key={name || `section-${sectionIndex}`}>
              <header><span>Capítulo {sectionIndex + 1}</span><i /><strong>{name || 'Aulas da missão'}</strong></header>
              <div className="module-book-lessons">{aulas.map((aula, aulaIndex) => <AulaListItem key={aula.id} aula={aula} index={aulaIndex} artSrc={getLessonIcon(aula, aulaIndex, assets)} onClick={() => onSelectAula(aula.id)} />)}</div>
            </section>)}
            <div className="module-book-finish"><Trophy size={18} /><span>Fim da missão</span><strong>+{modulo.xp_bonus} XP</strong></div>
          </div>
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

function groupBySections(aulas: AulaResumo[]): { name: string; aulas: AulaResumo[] }[] {
  const map = new Map<string, AulaResumo[]>();
  for (const aula of aulas) { const key = aula.section_name || ''; const group = map.get(key) ?? []; if (!map.has(key)) map.set(key, group); group.push(aula); }
  return Array.from(map.entries()).map(([name, groupedAulas]) => ({ name, aulas: [...groupedAulas].sort((a, b) => a.order - b.order) }));
}
