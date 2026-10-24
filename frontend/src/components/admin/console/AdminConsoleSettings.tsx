import { CompanyAppearanceFields } from './CompanyAppearanceFields';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

import { CompanyDataPanel } from './CompanyDataPanel';
import { AppButton } from '@/components/ui/buttons/AppButton';

import { AdminPageHeader } from '@/components/admin/AdminListLayout';
import { CompanyParametersTab } from '@/components/admin/CompanyParametersTab';
import { DEFAULT_PALETTES } from '@/lib/defaultPalettes';
import { optimizeImageUpload } from '@/lib/optimizeImageUpload';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAdminUnsavedChanges } from '@/hooks/useAdminUnsavedChanges';
import { getCompanyParameters, getTema, presignLogo, updateCompanyParameters, updateTema, type TemaEmpresa } from '@/services/admin';
import type { EmpresaPaleta } from '@/services/me';
import type { CompanyParameters } from '@/config/features';

export type AdminConsoleSettingsKind = 'data' | 'appearance' | 'features';

export function AdminConsoleSettings({ kind, empresaId, embedded = false }: { kind: AdminConsoleSettingsKind; empresaId?: number; embedded?: boolean }) {
  if (kind === 'data') return <CompanyDataSettings empresaId={empresaId} embedded={embedded} />;
  if (kind === 'appearance') return <AppearanceSettings empresaId={empresaId} />;
  if (kind === 'features' && typeof empresaId === 'number') return <FeatureSettings empresaId={empresaId} />;
  return <section className="admin-console-unavailable" role="alert"><h1>Configuração indisponível</h1><p>Esta configuração exige uma empresa selecionada.</p></section>;
}

function CompanyDataSettings({ empresaId }: { empresaId?: number; embedded?: boolean }) {
  return <CompanyDataPanel empresaId={empresaId} />;
}

function AppearanceSettings({ empresaId }: { empresaId?: number }) {
  const { user, setSession } = useCurrentUser();
  const query = useCachedQuery(adminQueryKey('theme', empresaId), () => getTema(empresaId));
  const [theme, setTheme] = useState<TemaEmpresa | null>(query.data);
  const [palette, setPalette] = useState<EmpresaPaleta>(query.data?.paleta ?? DEFAULT_PALETTES[0].paleta);
  const [logoKey, setLogoKey] = useState<string | null>(query.data?.logo_url ?? null);
  const [logoPreview, setLogoPreview] = useState<string | null>(query.data?.logo_preview_url ?? null);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const loading = query.loading;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);
  const baseline = useMemo(() => theme ? JSON.stringify({ palette: theme.paleta ?? DEFAULT_PALETTES[0].paleta, logo: theme.logo_url }) : null, [theme]);
  const dirty = Boolean(theme && baseline !== JSON.stringify({ palette, logo: logoKey }));
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (query.data && !dirtyRef.current) { setTheme(query.data); setPalette(query.data.paleta ?? DEFAULT_PALETTES[0].paleta); setLogoKey(query.data.logo_url); setLogoPreview(query.data.logo_preview_url); }
  }, [query.data]);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  const uploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/webp', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) { setMessage('Use PNG, WEBP ou JPEG de até 2 MB.'); return; }
    setUploading(true); setMessage(null);
    let preview: string | null = null;
    try {
      const optimized = await optimizeImageUpload(file, { maxWidth: 1024, maxHeight: 512 });
      preview = URL.createObjectURL(optimized);
      const { uploadUrl, fields, key } = await presignLogo(optimized.type, empresaId);
      const form = new FormData(); Object.entries(fields).forEach(([field, value]) => form.append(field, value)); form.append('file', optimized);
      const response = await fetch(uploadUrl, { method: 'POST', body: form });
      if (!response.ok) throw new Error('upload failed');
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = preview; setLogoPreview(preview); setLogoKey(key); preview = null;
      setMessage('Logo enviado. Salve a aparência para aplicar a alteração.');
    } catch { setMessage('Não foi possível enviar o logo.'); }
    finally { if (preview) URL.revokeObjectURL(preview); setUploading(false); }
  };
  const save = async () => {
    if (!dirty || saving || uploading || !theme) return false;
    setSaving(true); setMessage(null);
    try {
      const updated = await updateTema({ paleta: palette, logo_url: logoKey }, empresaId);
      setTheme(updated); setPalette(updated.paleta ?? palette); setLogoKey(updated.logo_url); setLogoPreview(updated.logo_preview_url); setFailedPreview(null);
      if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null; }
      if (user?.role === 'admin') setSession({ ...user, empresa_paleta: updated.paleta, empresa_logo: updated.logo_preview_url, empresa_nome: updated.nome });
      setMessage('Aparência salva.'); return true;
    } catch { setMessage('Não foi possível salvar a aparência. Os ajustes continuam no formulário.'); return false; }
    finally { setSaving(false); }
  };
  const reset = () => { setPalette(theme?.paleta ?? DEFAULT_PALETTES[0].paleta); setLogoKey(theme?.logo_url ?? null); setLogoPreview(theme?.logo_preview_url ?? null); if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null; } };
  const { prompt: unsavedPrompt } = useAdminUnsavedChanges(dirty || uploading, save, saving || uploading);
  return <>{unsavedPrompt}<section className="admin-console-settings"><AdminPageHeader action={<div className="admin-console-setting-actions"><AppButton className="admin-console-secondary-action" aria-label="Restaurar" variant="ghost" disabled={!dirty || saving || uploading} icon={<RotateCcw size={15} />} onClick={reset}>Restaurar</AppButton><AppButton disabled={!dirty || saving || uploading || loading} onClick={() => void save()}>{saving ? 'Salvando…' : uploading ? 'Enviando…' : 'Salvar'}</AppButton></div>} title="Aparência" description="Personalize o logo e as cores da experiência da empresa." />
    {loading ? <p role="status">Carregando aparência…</p> : query.error && !dirty ? null : <CompanyAppearanceFields theme={theme} palette={palette} setPalette={setPalette} logoKey={logoKey} logoPreview={logoPreview} failedPreview={failedPreview} setFailedPreview={setFailedPreview} saving={saving} uploading={uploading} uploadLogo={uploadLogo} removeLogo={() => { setLogoKey(null); setLogoPreview(null); if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null; } }} user={user} />}
    {query.error && <p role="alert">Não foi possível carregar os dados. <button type="button" onClick={query.refetch}>Tentar novamente</button></p>}{message && <p role="status">{message}</p>}

  </section></>;
}

function FeatureSettings({ empresaId }: { empresaId: number }) {
  const query = useCachedQuery(adminQueryKey('parameters', empresaId), () => getCompanyParameters(empresaId));
  const [parameters, setParameters] = useState<CompanyParameters | null>(query.data);
  const [baseline, setBaseline] = useState<string | null>(query.data ? JSON.stringify(query.data) : null);
  const [saving, setSaving] = useState(false);
  const loading = query.loading;
  const [message, setMessage] = useState<string | null>(null);
  const dirty = Boolean(parameters && baseline !== JSON.stringify(parameters));
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (query.data && !dirtyRef.current) { setParameters(query.data); setBaseline(JSON.stringify(query.data)); }
  }, [query.data]);
  const save = async () => { if (!parameters || !dirty || saving) return false; setSaving(true); setMessage(null); try { const updated = await updateCompanyParameters(parameters, empresaId); setParameters(updated); setBaseline(JSON.stringify(updated)); setMessage('Funcionalidades atualizadas.'); return true; } catch { setMessage('Não foi possível salvar as funcionalidades.'); return false; } finally { setSaving(false); } };
  const { prompt: unsavedPrompt } = useAdminUnsavedChanges(dirty, save, saving);
  return <>{unsavedPrompt}<section className="admin-console-settings"><CompanyParametersTab headerActions={<div className="admin-console-setting-actions"><AppButton className="admin-console-secondary-action" aria-label="Restaurar" variant="ghost" icon={<RotateCcw size={15} />} disabled={!dirty || saving || loading || Boolean(query.error)} onClick={() => { if (baseline) setParameters(JSON.parse(baseline) as CompanyParameters); }}>Restaurar</AppButton><AppButton disabled={!dirty || saving || loading || Boolean(query.error)} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar'}</AppButton></div>} parameters={query.error && !dirty ? null : parameters} setParameters={setParameters} canEdit={!loading && !query.error} saving={saving || loading} />{query.error && <p role="alert">Não foi possível carregar os dados. <button type="button" onClick={query.refetch}>Tentar novamente</button></p>}{message && <p role="status">{message}</p>}</section></>;
}
