import { useConteudos } from '@/hooks/useConteudos';
import { ModuloCard } from './ModuloCard';
import { SkeletonList } from './SkeletonCard';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { ArrowRight, BookOpen, CheckCircle2, GraduationCap, Layers3, Play, Sparkles, Video } from 'lucide-react';
import { AppSectionHeader } from '@/components/ui/visuals/AppSectionHeader';
import { AppButton } from '@/components/ui/buttons/AppButton';

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
  const { modulos, allModulos: queriedModulos, loading, filterType, setFilterType, filterStatus, setFilterStatus } = useConteudos();
  const allModulos = queriedModulos ?? [];

  const completedModules = allModulos.filter((modulo) => modulo.progress === 100).length;
  const completedLessons = allModulos.reduce((total, modulo) => total + modulo.completedAulas, 0);
  const totalLessons = allModulos.reduce((total, modulo) => total + modulo.totalAulas, 0);
  const availableXp = allModulos.reduce((total, modulo) => total + modulo.xp_total + modulo.xp_bonus, 0);
  const overallProgress = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const continueModule = allModulos.find((modulo) => modulo.hasStarted && modulo.progress < 100)
    ?? allModulos.find((modulo) => modulo.progress > 0 && modulo.progress < 100)
    ?? allModulos.find((modulo) => modulo.progress < 100)
    ?? allModulos[0];

  if (loading) {
    return (
      <div className="app-page flex flex-col gap-6">
        <AppSectionHeader title="Conteúdos" subtitle="Carregando seus módulos de treinamento..." />
        <SkeletonList />
      </div>
    );
  }

  return (
    <div className="app-page learning-center">
      <AppSectionHeader
        title="Central de Aprendizado"
        subtitle="Avance pela sua trilha, conclua fases e transforme conhecimento em prática."
        className="app-page-heading"
      />

      <section className="learning-overview">
        <div className="learning-overview-main">
          <div className="learning-overview-emblem"><GraduationCap size={27} /></div>
          <div className="learning-overview-copy">
            <span>SUA PRÓXIMA MISSÃO</span>
            <h2>{continueModule?.title ?? 'Trilha concluída'}</h2>
            <p>{continueModule?.description ?? 'Você concluiu todos os treinamentos disponíveis.'}</p>
            {continueModule && (
              <AppButton icon={continueModule.hasStarted || continueModule.progress > 0 ? <Play size={15} /> : <ArrowRight size={15} />} onClick={() => onSelectModulo(continueModule.id)}>
                {continueModule.hasStarted || continueModule.progress > 0 ? 'Continuar treinamento' : 'Iniciar treinamento'}
              </AppButton>
            )}
          </div>
          <div className="learning-overview-progress">
            <div className="learning-progress-ring" style={{ '--learning-progress': `${overallProgress}%` } as React.CSSProperties}>
              <div><strong>{overallProgress}%</strong><span>da academia</span></div>
            </div>
          </div>
        </div>
        <div className="learning-overview-stats">
          <div><CheckCircle2 size={17} /><span>Módulos concluídos</span><strong>{completedModules}/{allModulos.length}</strong></div>
          <div><Layers3 size={17} /><span>Fases concluídas</span><strong>{completedLessons}/{totalLessons}</strong></div>
          <div><Sparkles size={17} /><span>XP disponível</span><strong>{availableXp}</strong></div>
        </div>
      </section>

      <section className="learning-path-section">
        <div className="learning-section-heading">
          <div><span>JORNADA ATUAL</span><h2>Sua trilha de formação</h2></div>
          <p>Os módulos são liberados conforme você avança.</p>
        </div>
        <div className="learning-path-track scrollbar-thin">
          {allModulos.map((modulo, index) => {
            const complete = modulo.progress === 100;
            const current = modulo.id === continueModule?.id;
            return (
              <button key={modulo.id} onClick={() => onSelectModulo(modulo.id)} className={`${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''}`}>
                <i>{complete ? <CheckCircle2 size={17} /> : index + 1}</i>
                <div><span>{modulo.category}</span><strong>{modulo.title}</strong><small>{modulo.progress}% concluído</small></div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="learning-library-section">
        <div className="learning-section-heading">
          <div><span>BIBLIOTECA</span><h2>Explore os treinamentos</h2></div>
          <p>{modulos.length} módulo(s) encontrado(s)</p>
        </div>

      <div className="app-filter-bar learning-filter-bar flex flex-wrap gap-3">
        <div className="app-filter-group flex gap-2">
          {typeFilters.map((filter) => (
            <AppButton
              key={filter.key}
              onClick={() => setFilterType(filter.key)}
              variant={filterType === filter.key ? 'primary' : 'ghost'}
              size="sm"
              icon={filter.Icon ? <filter.Icon size={14} /> : undefined}
            >
              {filter.label}
            </AppButton>
          ))}
        </div>

        <div className="app-filter-group flex gap-2">
          {statusFilters.map((filter) => (
            <AppButton
              key={filter.key}
              onClick={() => setFilterStatus(filter.key)}
              variant={filterStatus === filter.key ? 'secondary' : 'ghost'}
              size="sm"
            >
              {filter.label}
            </AppButton>
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
        <div className="learning-module-grid">
          {modulos.map((modulo) => (
            <ModuloCard
              key={modulo.id}
              modulo={modulo}
              onClick={() => onSelectModulo(modulo.id)}
            />
          ))}
        </div>
      )}
      </section>
    </div>
  );
}
