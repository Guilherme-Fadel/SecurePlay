import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import type { CosmeticType } from '@/services/achievements';
import { ITEM_TYPES, changeItemType, isItemSlot, isThemeSlot, type FormErrors, type ItemForm as ItemFormState } from './adminCollectiblesForm';
import { slotLabel } from './adminCollectiblesModel';
import { CommonFields } from './CommonFields';
import { FormSection } from './FormSection';
import { ItemArt } from './ItemArt';
import { ItemImportBar } from './ItemImportBar';
import { RequirementsEditor } from './RequirementsEditor';
import { ThemeSelect } from './ThemeSelect';

interface ItemFormProps {
  value: ItemFormState;
  errors: FormErrors;
  onChange: Dispatch<SetStateAction<ItemFormState>>;
  /** Edição: o encaixe e o slug não mudam (o backend recusa a troca). */
  locked: boolean;
  /** Seletor Item avulso | Kit, só na criação. */
  kindSwitch?: ReactNode;
}

const ART_HELP = 'Envie um PNG ou SVG de até 200 KB feito no modelo oficial do personagem: ele entra na posição certa, sem ajuste. O ajuste fino é só para pequenas correções.';
const THEME_HELP = 'Escolha um tema da biblioteca ou envie uma imagem (PNG ou SVG de até 200 KB) que cobre a área toda. Se houver os dois, vale a arte enviada. Esse encaixe não tem ajuste fino.';
const BASICS_HELP = 'Nome, identificador, raridade e preço do item avulso. Em raridade Comemorativa, informe também a data e o período de venda.';

/** Item avulso: dados comuns, exigências e encaixe; a arte e o ajuste fino ficam em `ItemArt`. */
export function ItemForm({ value, errors, onChange, locked, kindSwitch }: ItemFormProps) {
  const patch = (change: Partial<ItemFormState>) => onChange((previous) => ({ ...previous, ...change }));
  const types: CosmeticType[] = isItemSlot(value.type) ? [...ITEM_TYPES] : [value.type, ...ITEM_TYPES];
  const theme = isThemeSlot(value.type);
  return <>
    <FormSection title="Dados do item" help={BASICS_HELP}>
      {kindSwitch && <ItemImportBar kindSwitch={kindSwitch} onChange={onChange} />}
      <CommonFields value={value} errors={errors} onChange={onChange} slugLocked={locked} slugMax={80} nameLabel="Nome do item" />
    </FormSection>
    <RequirementsEditor rule={value.rule} errors={errors} onChange={(rule) => patch({ rule })} legacyAchievement={value.requiredAchievementSlug} />
    <FormSection title="Encaixe e arte" help={theme ? THEME_HELP : ART_HELP}>
      <div className="admin-form-grid collectible-form-grid">
        <label className="admin-console-setting-field"><span>Encaixe</span>
          <AppSelect aria-label="Encaixe" value={value.type} disabled={locked} onChange={(event) => onChange((previous) => changeItemType(previous, event.target.value as CosmeticType))}>
            {types.map((type) => <option key={type} value={type}>{slotLabel(type)}</option>)}
          </AppSelect>
          {locked && <small>O encaixe não muda depois de salvo.</small>}
        </label>
        {theme && <ThemeSelect type={value.type} value={value.visualValue} onChange={(visualValue) => patch({ visualValue })} />}
      </div>
      <ItemArt value={value} error={errors.adjust} onChange={patch} />
    </FormSection>
  </>;
}
