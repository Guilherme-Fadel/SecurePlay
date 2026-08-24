import { useModulo } from '@/hooks/useModulo';
import { ProgressBar } from './ProgressBar';
import { AulaListItem } from './AulaListItem';
import { AulaResumo } from '@/services/conteudo';
import { useState } from 'react';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { ChevronDown, ChevronRight, ArrowLeft, Star, Target, Trophy, Layers } from 'lucide-react';

interface ModuloDetalhesProps {
  moduloId: number;
  onBack: () => void;
  onSelectAula: (aulaId: number) => void;
}

export function ModuloDetalhes({ moduloId, onBack, onSelectAula }: ModuloDetalhesProps) {
  const { modulo, loading } = useModulo(moduloId);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['']));

  if (loading || !modulo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)]">Carregando módulo...</p>
      </div>
    );
  }

  const sections = groupBySections(modulo.aulas);
  const difficulty = modulo.difficulty;

  const toggleSection = (name: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-text)] transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        <span>Voltar às Operações</span>
      </button>

      <InfoCard variant="primary">
        <InfoCard.Section className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <h3 className="text-[var(--text-primary)] mb-2">{modulo.title}</h3>
            <p className="text-[var(--text-secondary)] mb-4 font-[var(--font-family-inter)] text-sm leading-relaxed">
              {modulo.description}
            </p>

            <div className="flex items-center gap-3 mb-4">
              <span className="px-2.5 py-1 bg-[var(--primary)]/20 text-[var(--primary)] text-xs rounded-lg font-[var(--font-family-inter)] font-medium">
                {modulo.category}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: difficulty === 'iniciante' ? 1 : difficulty === 'intermediario' ? 2 : 3 }).map((_, i) => (
                  <Star key={i} size={12} className="text-[var(--accent)] fill-[var(--accent)]" />
                ))}
                <span className="text-[var(--text-secondary)] text-xs ml-1 font-[var(--font-family-inter)]">
                  {difficulty === 'iniciante' ? 'Recruta' : difficulty === 'intermediario' ? 'Agente' : 'Comandante'}
                </span>
              </div>
            </div>

            <ProgressBar progress={modulo.progress} className="mb-2" />
            <div className="flex items-center justify-between text-xs font-[var(--font-family-inter)]">
              <span className="text-[var(--text-secondary)]">
                {modulo.completedAulas}/{modulo.totalAulas} fases concluídas
              </span>
              <span className="text-[var(--accent-text)] font-semibold">{modulo.progress}%</span>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-3 lg:w-36">
            <InfoCard className="flex-1">
              <InfoCard.Section className="text-center py-2">
                <InfoCard.Stat label="XP Total" value={modulo.xp_total} icon={Target} variant="accent" />
              </InfoCard.Section>
            </InfoCard>
            <InfoCard className="flex-1">
              <InfoCard.Section className="text-center py-2">
                <InfoCard.Stat label="Bônus" value={`+${modulo.xp_bonus}`} icon={Trophy} variant="secondary" />
              </InfoCard.Section>
            </InfoCard>
          </div>
        </InfoCard.Section>
      </InfoCard>

      <InfoCard>
        <InfoCard.Header title="Fases da Missão" icon={Layers} variant="primary" />

        <div className="flex flex-col">
          {sections.map(({ name, aulas }) => (
            <div key={name}>
              {name && (
                <button
                  onClick={() => toggleSection(name)}
                  className="flex items-center gap-2 w-full px-4 py-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)] transition-colors border-b border-[var(--border)]"
                >
                  {expandedSections.has(name) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="text-sm font-[var(--font-family-inter)] font-medium">{name}</span>
                </button>
              )}

              {(!name || expandedSections.has(name)) && (
                <div className="flex flex-col gap-2 p-3">
                  {aulas.map((aula) => (
                    <AulaListItem
                      key={aula.id}
                      aula={aula}
                      onClick={() => onSelectAula(aula.id)}
                    />
                  ))}
                </div>
              )}
            </div>
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
