import { useModulo } from '@/hooks/useModulo';
import { ProgressBar } from './ProgressBar';
import { AulaListItem } from './AulaListItem';
import { AulaResumo } from '@/services/conteudo';
import { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowLeft, Star } from 'lucide-react';

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
        <p className="text-[var(--text-secondary)] text-xl">Carregando módulo...</p>
      </div>
    );
  }

  const sections = groupBySections(modulo.aulas);

  const toggleSection = (name: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors w-fit"
      >
        <ArrowLeft size={18} />
        <span className="text-lg">Voltar às Operações</span>
      </button>

      <div className="bg-[var(--surface)] border-4 border-[var(--primary)] p-6" style={{ boxShadow: '4px 4px 0 var(--primary)' }}>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <h2 className="text-3xl text-[var(--text-primary)] mb-2">{modulo.title}</h2>
            <p className="text-sm text-[var(--text-secondary)] font-[var(--font-family-inter)] mb-4 leading-relaxed">
              {modulo.description}
            </p>

            <div className="flex items-center gap-4 mb-4">
              <span className="px-2 py-1 bg-[var(--primary)] text-white text-xs font-[var(--font-family-inter)]">
                {modulo.category}
              </span>
              <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                {modulo.difficulty === 'iniciante' && <><Star size={12} className="text-[var(--accent)] fill-[var(--accent)]" /> Recruta</>}
                {modulo.difficulty === 'intermediario' && <><Star size={12} className="text-[var(--accent)] fill-[var(--accent)]" /><Star size={12} className="text-[var(--accent)] fill-[var(--accent)]" /> Agente</>}
                {modulo.difficulty === 'avancado' && <><Star size={12} className="text-[var(--accent)] fill-[var(--accent)]" /><Star size={12} className="text-[var(--accent)] fill-[var(--accent)]" /><Star size={12} className="text-[var(--accent)] fill-[var(--accent)]" /> Comandante</>}
              </div>
            </div>

            <ProgressBar progress={modulo.progress} height="h-3" />

            <div className="flex items-center justify-between mt-2 text-sm font-[var(--font-family-inter)]">
              <span className="text-[var(--text-secondary)]">
                {modulo.completedAulas}/{modulo.totalAulas} fases concluídas
              </span>
              <span className="text-[var(--accent)]">{modulo.progress}%</span>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-4 lg:w-40">
            <div className="bg-[var(--background)] border-2 border-[var(--border)] p-3 text-center flex-1">
              <p className="text-xs text-[var(--text-secondary)] font-[var(--font-family-inter)]">XP Total</p>
              <p className="text-xl text-[var(--accent)]">{modulo.xp_total}</p>
            </div>
            <div className="bg-[var(--background)] border-2 border-[var(--border)] p-3 text-center flex-1">
              <p className="text-xs text-[var(--text-secondary)] font-[var(--font-family-inter)]">Bônus</p>
              <p className="text-xl text-[var(--secondary)]">+{modulo.xp_bonus}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xl text-[var(--text-primary)] mb-2">Fases da Missão</h3>

        {sections.map(({ name, aulas }) => (
          <div key={name} className="flex flex-col gap-2">
            {name && (
              <button
                onClick={() => toggleSection(name)}
                className="flex items-center gap-2 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {expandedSections.has(name) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="text-lg">{name}</span>
              </button>
            )}

            {(!name || expandedSections.has(name)) && (
              <div className="flex flex-col gap-2 pl-2">
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
