import { useConteudos } from '@/hooks/useConteudos';
import { ModuloCard } from './ModuloCard';
import { SkeletonList } from './SkeletonCard';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Radio, Video, BookOpen } from 'lucide-react';

interface ModuloListProps {
  onSelectModulo: (moduloId: number) => void;
}

const typeFilters = [
  { key: 'todos', label: 'Todos', Icon: null },
  { key: 'video', label: 'Vídeos', Icon: Video },
  { key: 'quadrinho', label: 'Quadrinhos', Icon: BookOpen },
] as const;

const statusFilters = [
  { key: 'todos', label: 'Todos' },
  { key: 'em_progresso', label: 'Em progresso' },
  { key: 'concluidos', label: 'Concluídos' },
] as const;

export function ModuloList({ onSelectModulo }: ModuloListProps) {
  const { modulos, loading, filterType, setFilterType, filterStatus, setFilterStatus } = useConteudos();

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <InfoCard variant="primary" raised>
          <InfoCard.Header title="Central de Operações" icon={Radio} variant="accent" />
          <InfoCard.Section>
            <p className="text-[var(--text-secondary)]">Carregando operações...</p>
          </InfoCard.Section>
        </InfoCard>
        <SkeletonList />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <InfoCard variant="primary" raised>
        <InfoCard.Section className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface-alt)]">
              <Radio size={18} className="text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)]">Central de Operações</h3>
              <p className="text-[var(--text-secondary)]">
                Selecione uma operação para iniciar seu treinamento, Agente.
              </p>
            </div>
          </div>
        </InfoCard.Section>
      </InfoCard>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {typeFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterType(filter.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-[var(--font-family-inter)] transition-all duration-200 ${
                filterType === filter.key
                  ? 'bg-[var(--primary)] text-[var(--text-primary)]'
                  : 'bg-[var(--surface-alt)] text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              {filter.Icon && <filter.Icon size={14} />}
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterStatus(filter.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-[var(--font-family-inter)] transition-all duration-200 ${
                filterStatus === filter.key
                  ? 'bg-[var(--secondary)] text-[var(--text-primary)]'
                  : 'bg-[var(--surface-alt)] text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {modulos.length === 0 ? (
        <InfoCard>
          <InfoCard.Section className="text-center py-8">
            <p className="text-[var(--text-secondary)]">Nenhuma operação encontrada</p>
          </InfoCard.Section>
        </InfoCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modulos.map((modulo) => (
            <ModuloCard
              key={modulo.id}
              modulo={modulo}
              onClick={() => onSelectModulo(modulo.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
