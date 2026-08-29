import { useModulo } from '@/hooks/useModulo';
import { ProgressBar } from './ProgressBar';
import { AulaListItem } from './AulaListItem';
import { AulaResumo } from '@/services/conteudo';
import { useEffect, useState } from 'react';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { ArrowLeft, BookOpenCheck, CheckCircle2, ChevronDown, ChevronRight, Layers3, Play, Sparkles, Star, Trophy } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';

interface ModuloDetalhesProps {
  moduloId: number;
  onBack: () => void;
  onSelectAula: (aulaId: number) => void;
}

export function ModuloDetalhes({ moduloId, onBack, onSelectAula }: ModuloDetalhesProps) {
  const { modulo, loading } = useModulo(moduloId);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const sections = modulo ? groupBySections(modulo.aulas) : [];

  useEffect(() => {
    const firstNamedSection = sections.find((section) => section.name)?.name;
    if (firstNamedSection) {
      setExpandedSections((current) => current.size ? current : new Set([firstNamedSection]));
    }
  }, [modulo?.id]);

  if (loading || !modulo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)]">Carregando módulo...</p>
      </div>
    );
  }

  const difficulty = modulo.difficulty;
  const nextAula = modulo.aulas.find((aula) => aula.status === 'unlocked');

  const toggleSection = (name: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="app-page learning-module-detail">
      <AppButton
        onClick={onBack}
        variant="ghost"
        size="sm"
        icon={<ArrowLeft size={16} />}
        className="w-fit"
      >
        Voltar aos conteúdos
      </AppButton>

      <section className="learning-module-hero">
        <div className="learning-module-hero-visual">
          {modulo.thumbnail ? <img src={modulo.thumbnail} alt="" /> : <BookOpenCheck size={44} />}
          <span>{modulo.category}</span>
        </div>
        <div className="learning-module-hero-copy">
          <span>DOSSIÊ DO TREINAMENTO</span>
          <h1>{modulo.title}</h1>
          <p>{modulo.description}</p>
          <div className="learning-module-badges">
            <div>
              {Array.from({ length: difficulty === 'iniciante' ? 1 : difficulty === 'intermediario' ? 2 : 3 }).map((_, index) => <Star key={index} size={11} />)}
              <span>{difficulty === 'iniciante' ? 'Recruta' : difficulty === 'intermediario' ? 'Agente' : 'Comandante'}</span>
            </div>
            <div><Layers3 size={13} /><span>{modulo.totalAulas} fases</span></div>
          </div>
          <div className="learning-module-progress-block">
            <div><span>Progresso da missão</span><strong>{modulo.progress}%</strong></div>
            <ProgressBar progress={modulo.progress} />
            <small>{modulo.completedAulas} de {modulo.totalAulas} fases concluídas</small>
          </div>
          {nextAula ? (
            <AppButton icon={<Play size={15} />} onClick={() => onSelectAula(nextAula.id)}>
              {nextAula.progress_percent > 0 ? 'Continuar próxima fase' : 'Iniciar próxima fase'}
            </AppButton>
          ) : (
            <div className="learning-module-complete"><CheckCircle2 size={16} /> Treinamento concluído</div>
          )}
        </div>
        <div className="learning-module-rewards">
          <div><Sparkles size={18} /><span>XP das fases</span><strong>{modulo.xp_total}</strong></div>
          <div><Trophy size={18} /><span>Bônus final</span><strong>+{modulo.xp_bonus}</strong></div>
        </div>
      </section>

      <InfoCard className="learning-module-path-card">
        <div className="learning-module-path-heading">
          <div><Layers3 size={20} /><section><span>ROTEIRO DA MISSÃO</span><h2>Fases do treinamento</h2></section></div>
          <p>Conclua uma fase para liberar a próxima.</p>
        </div>

        <div className="learning-module-sections">
          {sections.map(({ name, aulas }, sectionIndex) => (
            <section key={name || `section-${sectionIndex}`}>
              {name && (
                <button
                  onClick={() => toggleSection(name)}
                  className="learning-module-section-toggle"
                >
                  {expandedSections.has(name) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>Capítulo {String(sectionIndex + 1).padStart(2, '0')}</span>
                  <strong>{name}</strong>
                </button>
              )}

              {(!name || expandedSections.has(name)) && (
                <div className="learning-module-lesson-list">
                  {aulas.map((aula, aulaIndex) => (
                    <AulaListItem
                      key={aula.id}
                      aula={aula}
                      index={aulaIndex}
                      onClick={() => onSelectAula(aula.id)}
                    />
                  ))}
                  {sectionIndex === sections.length - 1 && (
                    <div className="learning-module-finish-line"><Trophy size={17} /><span>Recompensa de conclusão</span><strong>+{modulo.xp_bonus} XP</strong></div>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      </InfoCard>
    </div>
  );
}

function groupBySections(aulas: AulaResumo[]): { name: string; aulas: AulaResumo[] }[] {
  const map = new Map<string, AulaResumo[]>();

  for (const aula of aulas) {
    const key = aula.section_name || '';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(aula);
  }

  return Array.from(map.entries()).map(([name, aulas]) => ({ name, aulas }));
}
