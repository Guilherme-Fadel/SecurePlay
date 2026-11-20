import { AppInput } from '@/components/ui/forms/AppInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import type { CosmeticRarity } from '@/services/achievements';
import { RARITIES, finishSlug, slugify, typeSlug, type CommonForm, type FormErrors } from './adminCollectiblesForm';
import { rarityName } from './adminCollectiblesModel';
import { FieldError } from './FormSection';

interface CommonFieldsProps<T extends CommonForm> {
  value: T;
  errors: FormErrors;
  onChange: (value: T) => void;
  /** O slug só é editável antes do primeiro salvamento. */
  slugLocked: boolean;
  slugMax: number;
  nameLabel: string;
}

/** Nome, slug, descrição, raridade, preço e, só em Comemorativa, data comemorativa e período. */
export function CommonFields<T extends CommonForm>({ value, errors, onChange, slugLocked, slugMax, nameLabel }: CommonFieldsProps<T>) {
  const set = (patch: Partial<CommonForm>) => onChange({ ...value, ...patch });
  const festive = value.rarity === 'festive';
  return <div className="admin-form-grid collectible-form-grid">
    <label className="admin-console-setting-field"><span>{nameLabel}</span>
      <AppInput value={value.name} maxLength={120} aria-invalid={errors.name ? true : undefined} onChange={(event) => set({ name: event.target.value, ...(value.slugEdited || slugLocked ? {} : { slug: slugify(event.target.value, slugMax) }) })} />
      <FieldError>{errors.name}</FieldError>
    </label>
    <label className="admin-console-setting-field"><span>Slug</span>
      <AppInput value={value.slug} maxLength={slugMax} readOnly={slugLocked} aria-invalid={errors.slug ? true : undefined} onChange={(event) => set({ slug: typeSlug(event.target.value, slugMax), slugEdited: true })} onBlur={() => set({ slug: finishSlug(value.slug) })} />
      {errors.slug ? <FieldError>{errors.slug}</FieldError> : <small>{slugLocked ? 'Identificador fixo: não muda depois de salvo.' : 'Sugerido pelo nome; você pode ajustar.'}</small>}
    </label>
    <label className="admin-console-setting-field is-wide"><span>Descrição</span>
      <textarea className="app-text-input collectible-textarea" rows={3} maxLength={400} value={value.description} aria-invalid={errors.description ? true : undefined} onChange={(event) => set({ description: event.target.value })} />
      <FieldError>{errors.description}</FieldError>
    </label>
    <label className="admin-console-setting-field"><span>Raridade</span>
      <AppSelect aria-label="Raridade" value={value.rarity} onChange={(event) => set({ rarity: event.target.value as CosmeticRarity })}>
        {RARITIES.map((rarity) => <option key={rarity} value={rarity}>{rarityName(rarity)}</option>)}
      </AppSelect>
    </label>
    <label className="admin-console-setting-field"><span>Preço em chaves</span>
      <AppInput inputMode="numeric" value={value.price} aria-invalid={errors.price ? true : undefined} onChange={(event) => set({ price: event.target.value.replace(/\D/g, '').slice(0, 6) })} />
      {errors.price ? <FieldError>{errors.price}</FieldError> : <small>Use 0 para liberar só pelas exigências.</small>}
    </label>
    {festive && <>
      <label className="admin-console-setting-field"><span>Data comemorativa</span>
        <AppInput value={value.festiveEvent} maxLength={40} placeholder="Ex.: Natal" aria-invalid={errors.festiveEvent ? true : undefined} onChange={(event) => set({ festiveEvent: event.target.value })} />
        <FieldError>{errors.festiveEvent}</FieldError>
      </label>
      <fieldset className="collectible-period" aria-describedby={errors.period ? 'collectible-period-error' : undefined}>
        <label className="admin-console-setting-field"><span>Disponível de</span><input className="app-text-input" type="date" value={value.availableFrom} onChange={(event) => set({ availableFrom: event.target.value })} /></label>
        <label className="admin-console-setting-field"><span>Até</span><input className="app-text-input" type="date" value={value.availableUntil} onChange={(event) => set({ availableUntil: event.target.value })} /></label>
        {errors.period && <small id="collectible-period-error" className="collectible-field-error is-wide" role="alert">{errors.period}</small>}
      </fieldset>
    </>}
  </div>;
}
