import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { Upload } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AdminThemePreview } from '@/components/admin/AdminThemePreview';
import { DEFAULT_PALETTES } from '@/lib/defaultPalettes';
import type { TemaEmpresa } from '@/services/admin';
import type { EmpresaPaleta } from '@/services/me';

type Props = {
  theme: TemaEmpresa | null; palette: EmpresaPaleta; setPalette: Dispatch<SetStateAction<EmpresaPaleta>>;
  logoKey: string | null; logoPreview: string | null; failedPreview: string | null;
  setFailedPreview: Dispatch<SetStateAction<string | null>>; saving: boolean; uploading: boolean;
  uploadLogo: (event: ChangeEvent<HTMLInputElement>) => Promise<void>; removeLogo: () => void;
  user: { name?: string } | null;
};
export function CompanyAppearanceFields({ theme, palette, setPalette, logoKey, logoPreview, failedPreview, setFailedPreview, saving, uploading, uploadLogo, removeLogo, user }: Props) {
  return (<div className="admin-console-appearance-layout"><div className="admin-console-appearance-form">
      <section className="admin-console-settings-card" aria-label="Marca da empresa"><h2>{theme?.nome}</h2><div className="admin-console-logo-preview">{logoPreview && logoPreview !== failedPreview ? <img src={logoPreview} alt="Prévia do logo da empresa" onError={() => setFailedPreview(logoPreview)} /> : <span>{logoKey ? 'Logo indisponível' : 'Sem logotipo'}</span>}</div><label className="admin-console-upload"><Upload size={15} /> Selecionar logo<input type="file" accept="image/png,image/webp,image/jpeg" onChange={(event) => void uploadLogo(event)} disabled={uploading || saving} /></label>{logoKey && <AppButton variant="ghost" size="sm" disabled={saving || uploading} onClick={removeLogo}>Remover logo</AppButton>}</section>
      <section className="admin-console-settings-card"><h2>Paletas disponíveis</h2><div className="admin-console-palette-list">{DEFAULT_PALETTES.map((preset) => <button type="button" disabled={saving || uploading} key={preset.name} aria-pressed={preset.paleta.primary === palette.primary && preset.paleta.secondary === palette.secondary && preset.paleta.accent === palette.accent} onClick={() => setPalette(preset.paleta)}><span style={{ background: preset.paleta.primary }} /><span style={{ background: preset.paleta.secondary }} /><span style={{ background: preset.paleta.accent }} />{preset.name}</button>)}</div><div className="admin-console-color-fields">{(['primary', 'secondary', 'accent', 'text_primary', 'text_secondary'] as const).map((key) => <label key={key}>{key.replace('_', ' ')}<input type="color" disabled={saving || uploading} value={/^#[0-9a-f]{6}$/i.test(palette[key]) ? palette[key] : '#000000'} onChange={(event) => setPalette((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div></section>
    </div><div className="admin-console-appearance-preview"><AdminThemePreview paleta={palette} logoPreview={logoPreview === failedPreview ? null : logoPreview} onLogoError={setFailedPreview} empresaNome={theme?.nome ?? ''} userInitial={user?.name?.charAt(0).toUpperCase() ?? ''} /></div></div>
  );
}
