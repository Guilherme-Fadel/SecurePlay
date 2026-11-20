import { AppSelect } from '@/components/ui/forms/AppSelect';
import type { EmpresaAdministravel } from '@/services/admin';
import type { RankingCategory, RankingMode, RankingSeasonOption, RankingUnit } from '@/services/dashboard';
import { CATEGORY_TABS, UNIT_TABS } from './boardModel';
import { completenessLabel, type RankingScope } from './rankingModel';

interface Choice<T extends string> { value: T; label: string; disabled?: boolean }

function Group<T extends string>({ label, className, options, value, onChange }: { label: string; className: string; options: readonly Choice<T>[]; value: T | ''; onChange: (value: T) => void }) {
  return (
    <div className={className} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} disabled={option.disabled} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

const SCOPE_LABEL: Record<RankingScope, string> = { company: 'Minha escola', global: 'Todas as escolas' };
const MODES: readonly Choice<RankingMode>[] = [
  { value: 'current', label: 'Temporada' },
  { value: 'season', label: 'Encerradas' },
  { value: 'total', label: 'Total' },
];

export interface ScoreboardFiltersProps {
  scopes: RankingScope[];
  scope: RankingScope;
  onScopeChange: (scope: RankingScope) => void;
  /** O aluno não tem instituição: "Minha escola" fica desabilitada fora dela. */
  companyBlocked: boolean;
  unit: RankingUnit;
  onUnitChange: (unit: RankingUnit) => void;
  category: RankingCategory;
  onCategoryChange: (category: RankingCategory) => void;
  mode: RankingMode;
  onModeChange: (mode: RankingMode) => void;
  closedSeasons: RankingSeasonOption[];
  selectedSeasonId: string;
  onSeasonChange: (id: string) => void;
  /** Só platform_admin: escolhe de qual empresa ver o ranking. */
  companies: EmpresaAdministravel[];
  companyId: number | undefined;
  onCompanyChange: (id: number) => void;
}

/**
 * Filtros dentro do placar (como no canvas): escopo e unidade, categoria em abas e período; com
 * "Encerradas", a linha das temporadas. O mesmo bloco fica montado nos estados de carregar, erro e
 * vazio, então trocar um filtro não tira o foco do teclado.
 */
export function ScoreboardFilters(props: ScoreboardFiltersProps) {
  const { scopes, scope, mode, closedSeasons, selectedSeasonId, companies, companyId } = props;
  const scopeOptions = scopes.map((value) => ({ value, label: SCOPE_LABEL[value], disabled: value === 'company' && props.companyBlocked && scope !== 'company' }));
  const modes = MODES.map((option) => ({ ...option, disabled: option.value === 'season' && closedSeasons.length === 0 && mode !== 'season' }));
  return (
    <div className="sb-filters">
      <div className="sb-row1">
        {scopes.length > 1
          ? <Group label="Abrangência do placar" className="sb-seg" options={scopeOptions} value={scope} onChange={props.onScopeChange} />
          : <p className="sb-scope-fixed">{SCOPE_LABEL.company}</p>}
        <Group label="Quem aparece no placar" className="sb-seg" options={UNIT_TABS} value={props.unit} onChange={props.onUnitChange} />
      </div>
      {scope === 'company' && companies.length > 0 && (
        <label className="sb-company">
          <span>Empresa</span>
          <AppSelect aria-label="Empresa do ranking" value={companyId ?? ''} onChange={(event) => props.onCompanyChange(Number(event.target.value))}>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.nome}</option>)}
          </AppSelect>
        </label>
      )}
      <div className="sb-row2">
        <Group label="Categoria do placar" className="sb-tabs" options={CATEGORY_TABS} value={props.category} onChange={props.onCategoryChange} />
        <Group label="Período do placar" className="sb-per" options={modes} value={mode} onChange={props.onModeChange} />
      </div>
      {mode === 'season' && closedSeasons.length > 0 && (
        <div className="sb-seasons" role="group" aria-label="Temporada encerrada">
          <span>Temporada:</span>
          {closedSeasons.map((option) => (
            <button key={option.id} type="button" aria-pressed={selectedSeasonId === option.id} onClick={() => props.onSeasonChange(option.id)}>
              {option.name}{option.completeness === 'complete' ? '' : ` · ${completenessLabel(option.completeness)}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
