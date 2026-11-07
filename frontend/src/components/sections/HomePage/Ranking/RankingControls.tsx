import { RefreshCw } from 'lucide-react';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import type { EmpresaAdministravel } from '@/services/admin';
import type { RankingMode, RankingSeasonOption } from '@/services/dashboard';
import { completenessLabel, type RankingScope } from './rankingModel';

interface SegmentOption<T extends string> { value: T; label: string; disabled?: boolean }

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: SegmentOption<T>[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="rk-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} disabled={option.disabled} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

const SCOPE_LABEL: Record<RankingScope, string> = { company: 'Minha instituição', global: 'Global' };

interface RankingControlsProps {
  scopes: RankingScope[];
  scope: RankingScope;
  onScopeChange: (scope: RankingScope) => void;
  companyBlocked: boolean;
  mode: RankingMode;
  onModeChange: (mode: RankingMode) => void;
  closedSeasons: RankingSeasonOption[];
  selectedSeasonId: string;
  onSeasonChange: (id: string) => void;
  companies: EmpresaAdministravel[];
  companyId: number | undefined;
  onCompanyChange: (id: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

/** Escopo e período em controles segmentados; temporada encerrada e empresa (platform_admin) em listas. */
export function RankingControls(props: RankingControlsProps) {
  const { scopes, scope, onScopeChange, companyBlocked, mode, onModeChange, closedSeasons, selectedSeasonId, onSeasonChange, companies, companyId, onCompanyChange, refreshing, onRefresh } = props;
  return (
    <div className="rk-controls">
      {scopes.length > 1
        ? <Segmented label="Escopo do ranking" value={scope} onChange={onScopeChange} options={scopes.map((value) => ({ value, label: SCOPE_LABEL[value], disabled: value === 'company' && companyBlocked && scope !== 'company' }))} />
        : <p className="rk-scope-fixed">{SCOPE_LABEL.company}</p>}
      <Segmented
        label="Período do ranking"
        value={mode}
        onChange={onModeChange}
        // Sem temporadas encerradas conhecidas (antes dos dados, após erro ou sem histórico) a opção fica
        // desabilitada, como antes: a consulta de temporada não roda sem uma temporada escolhida.
        options={[{ value: 'current', label: 'Temporada atual' }, { value: 'season', label: 'Encerradas', disabled: closedSeasons.length === 0 && mode !== 'season' }, { value: 'total', label: 'Total' }]}
      />
      {mode === 'season' && closedSeasons.length > 0 && (
        <label className="rk-select">
          <span className="rk-sr">Temporada encerrada</span>
          <AppSelect aria-label="Escolher temporada encerrada" value={selectedSeasonId} onChange={(event) => onSeasonChange(event.target.value)}>
            <option value="">Escolha uma temporada</option>
            {closedSeasons.map((option) => <option key={option.id} value={option.id}>{option.name} · {completenessLabel(option.completeness)}</option>)}
          </AppSelect>
        </label>
      )}
      {scope === 'company' && companies.length > 0 && (
        <label className="rk-select rk-company">
          <span className="rk-select-label">Empresa</span>
          <AppSelect aria-label="Empresa do ranking" value={companyId ?? ''} onChange={(event) => onCompanyChange(Number(event.target.value))}>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
          </AppSelect>
        </label>
      )}
      <button className="rk-refresh" type="button" onClick={onRefresh} disabled={refreshing} aria-label="Atualizar ranking" title="Atualizar ranking">
        <RefreshCw size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
