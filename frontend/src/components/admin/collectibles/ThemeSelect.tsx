import { AppSelect } from '@/components/ui/forms/AppSelect';
import type { CollectibleItemType } from '@/services/adminCollectibles';
import { themeOptions } from './collectibleThemes';

interface ThemeSelectProps { type: CollectibleItemType; value: string; onChange: (value: string) => void }

/** Tema da biblioteca de fundo ou de card; vazio deixa só a arte enviada valer. */
export function ThemeSelect({ type, value, onChange }: ThemeSelectProps) {
  return <label className="admin-console-setting-field"><span>Tema da biblioteca</span>
    <AppSelect aria-label="Tema da biblioteca" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Nenhum (usar a arte enviada)</option>
      {themeOptions(type, value).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </AppSelect>
  </label>;
}
