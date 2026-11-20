import { Plus, X } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppFilterChip } from '@/components/ui/buttons/AppFilterChip';
import { AppInput } from '@/components/ui/forms/AppInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { MAX_REQUIREMENTS, newRequirement, ruleSummary, type FormErrors, type RequirementDraft, type RequirementMetric, type RuleDraft } from './adminCollectiblesForm';
import { FieldError, FormSection } from './FormSection';

const METRICS: ReadonlyArray<{ value: Exclude<RequirementMetric, 'achievement'>; label: string; hint: string }> = [
  { value: 'xp_season', label: 'XP na temporada', hint: 'XP mínimo' },
  { value: 'xp_total', label: 'XP total', hint: 'XP mínimo' },
  { value: 'rank', label: 'Colocação na temporada', hint: 'Até o lugar' },
  { value: 'access_days', label: 'Dias de acesso', hint: 'Dias mínimos' },
  { value: 'streak', label: 'Sequência de acesso', hint: 'Dias seguidos' },
];

const HELP = 'O aluno só compra quando cumpre as exigências; o backend confere no momento da compra, com os números oficiais dele. Quem já tem o item continua usando. Sem exigências, qualquer aluno com chaves suficientes pode adquirir.';

interface RowProps { entry: RequirementDraft; position: number; error?: string; onChange: (patch: Partial<RequirementDraft>) => void; onRemove: () => void }

function RequirementRow({ entry, position, error, onChange, onRemove }: RowProps) {
  const remove = <AppButton variant="ghost" size="control" className="collectible-icon-button" icon={<X size={16} aria-hidden="true" />} aria-label={`Remover exigência ${position}`} title="Remover exigência" onClick={onRemove} />;
  if (entry.metric === 'achievement') {
    return <li className="collectible-req-row"><span className="collectible-req-fixed">Conquista: {entry.slug}</span>{remove}</li>;
  }
  const hint = METRICS.find((metric) => metric.value === entry.metric)?.hint ?? '';
  return <li className="collectible-req-row">
    <AppSelect aria-label={`Tipo da exigência ${position}`} value={entry.metric} onChange={(event) => onChange({ metric: event.target.value as RequirementMetric })}>
      {METRICS.map((metric) => <option key={metric.value} value={metric.value}>{metric.label}</option>)}
    </AppSelect>
    <AppInput inputMode="numeric" aria-label={`Valor da exigência ${position}`} aria-invalid={error ? true : undefined} placeholder={hint} value={entry.value} onChange={(event) => onChange({ value: event.target.value.replace(/\D/g, '').slice(0, 7) })} />
    {entry.metric === 'rank'
      ? <AppSelect aria-label={`Escopo da colocação ${position}`} value={entry.scope} onChange={(event) => onChange({ scope: event.target.value === 'global' ? 'global' : 'empresa' })}>
        <option value="empresa">Escola</option>
        <option value="global">Geral</option>
      </AppSelect>
      : <span aria-hidden="true" />}
    {remove}
    <FieldError>{error}</FieldError>
  </li>;
}

interface RequirementsEditorProps {
  rule: RuleDraft; errors: FormErrors; onChange: (rule: RuleDraft) => void;
  /** Conquista exigida pelo cadastro antigo do item: só leitura, não entra na regra editável. */
  legacyAchievement?: string | null;
}

/** Modo (todas ou qualquer uma), lista em grade fixa de até 6 exigências e o resumo da regra, sempre visível. */
export function RequirementsEditor({ rule, errors, onChange, legacyAchievement }: RequirementsEditorProps) {
  const { requirements } = rule;
  const patch = (id: number, change: Partial<RequirementDraft>) => onChange({ ...rule, requirements: requirements.map((entry) => (entry.id === id ? { ...entry, ...change } : entry)) });
  const add = () => onChange({ ...rule, requirements: [...requirements, newRequirement(Math.max(0, ...requirements.map((entry) => entry.id)) + 1)] });
  return <FormSection title="Exigências para liberar" help={HELP}>
    <div className="collectible-form-kind" role="group" aria-label="Como combinar as exigências">
      <AppFilterChip selected={rule.mode === 'all'} onClick={() => onChange({ ...rule, mode: 'all' })}>Cumpra todas</AppFilterChip>
      <AppFilterChip selected={rule.mode === 'any'} onClick={() => onChange({ ...rule, mode: 'any' })}>Cumpra qualquer uma</AppFilterChip>
    </div>
    {requirements.length > 0 && <ol className="collectible-req-list" aria-label="Exigências">
      {requirements.map((entry, index) => <RequirementRow key={entry.id} entry={entry} position={index + 1} error={errors[`req:${entry.id}`]} onChange={(change) => patch(entry.id, change)} onRemove={() => onChange({ ...rule, requirements: requirements.filter((other) => other.id !== entry.id) })} />)}
    </ol>}
    <div><AppButton variant="ghost" size="control" icon={<Plus size={16} aria-hidden="true" />} disabled={requirements.length >= MAX_REQUIREMENTS} onClick={add}>Adicionar exigência</AppButton></div>
    <FieldError>{errors.requirements}</FieldError>
    <p className="collectible-rule-summary" aria-live="off">{ruleSummary(rule)}</p>
    {legacyAchievement && <p className="collectible-legacy-note">Exigência antiga: a conquista {legacyAchievement} também é necessária. Ela vem do cadastro anterior, vale na compra e não pode ser editada aqui.</p>}
  </FormSection>;
}
