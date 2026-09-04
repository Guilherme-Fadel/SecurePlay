import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  getTema,
  updateTema,
  presignLogo,
  listarEmpresas,
  type EmpresaAdministravel,
} from '@/services/admin';
import { EmpresaPaleta } from '@/services/me';
import { DEFAULT_PALETTES } from '@/lib/defaultPalettes';
import { cn } from '@/lib/utils';
import { useSectionContext } from '@/contexts/SectionContext';
import { buildBrandVars } from '@/hooks/useEmpresaTema';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { AppSectionHeader } from '@/components/ui/visuals/AppSectionHeader';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { CompanyManagementTab } from '@/components/admin/CompanyManagementTab';
import { AdminThemePreview } from '@/components/admin/AdminThemePreview';
import { derivePalette } from '@/lib/palette';
import { optimizeImageUpload } from '@/lib/optimizeImageUpload';
import { AlertCircle, ArrowLeft, Building2, CheckCircle2, LayoutTemplate, Palette, RotateCcw, Save, SlidersHorizontal, Upload, UsersRound, WandSparkles, } from 'lucide-react';
import '@/styles/app-ui.css';
import './admin-ui.css';
import './admin-users.css';
interface AdminProps {
  platformMode?: boolean;
  initialTab?: 'usuarios' | 'layout';
  lockedTab?: boolean;
}

export default function Admin({
  platformMode = false,
  initialTab = 'usuarios',
  lockedTab = false,
}: AdminProps) {
    const { user, loading: userLoading, setSession } = useCurrentUser();
    const { setActiveSection } = useSectionContext();
    const [paleta, setPaleta] = useState<EmpresaPaleta>(DEFAULT_PALETTES[0].paleta);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [empresaNome, setEmpresaNome] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const logoPreviewObjectUrlRef = useRef<string | null>(null);
    const [activeTab, setActiveTab] = useState<'empresas' | 'usuarios' | 'layout'>(initialTab);
    const [empresas, setEmpresas] = useState<EmpresaAdministravel[]>([]);
    const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState<number | null>(null);
    const empresaSelecionada = empresas.find((empresa) => empresa.id === empresaSelecionadaId) ?? null;
    const empresaAlvoId = platformMode ? empresaSelecionadaId ?? undefined : undefined;

    const handleEmpresaCriada = (empresa: EmpresaAdministravel) => {
        setEmpresas((current) => [...current, empresa].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
        setEmpresaSelecionadaId(empresa.id);
    };

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => () => {
        if (logoPreviewObjectUrlRef.current) {
            URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
        }
    }, []);

    useEffect(() => {
        if (!platformMode)
            return;
        listarEmpresas()
            .then((data) => {
            setEmpresas(data);
            setEmpresaSelecionadaId((current) => current ?? data[0]?.id ?? null);
        })
            .catch(() => setMessage('Erro ao carregar as empresas.'));
    }, [platformMode]);

    useEffect(() => {
        if (platformMode && !empresaSelecionadaId)
            return;
        getTema(empresaAlvoId)
            .then((data) => {
            setEmpresaNome(data.nome);
            if (data.paleta)
                setPaleta(data.paleta);
            if (data.logo_url) {
                setLogoUrl(data.logo_url);
                setLogoPreview(data.logo_url);
            }
        })
            .catch(() => {
        });
    }, [empresaAlvoId, empresaSelecionadaId, platformMode]);
    const handleColorChange = (field: keyof EmpresaPaleta, value: string) => {
        setPaleta((prev) => ({ ...prev, [field]: value }));
    };
    const handleDerivePalette = (primaryHex: string) => {
        const derived = derivePalette(primaryHex);
        setPaleta(derived);
    };
    const handleSelectPreset = (preset: EmpresaPaleta) => {
        setPaleta({ ...preset });
    };
    const handleReset = () => {
        setPaleta(DEFAULT_PALETTES[0].paleta);
        setMessage('Paleta resetada para o padrão');
        setTimeout(() => setMessage(null), 3000);
    };
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const allowedTypes = ['image/png', 'image/webp', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            setMessage('Formato inválido. Use PNG, WEBP ou JPEG.');
            setTimeout(() => setMessage(null), 3000);
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setMessage('Arquivo muito grande. Máximo: 2MB.');
            setTimeout(() => setMessage(null), 3000);
            return;
        }
        setUploading(true);
        let nextPreviewUrl: string | null = null;
        try {
            const uploadFile = await optimizeImageUpload(file, {
                maxWidth: 1024,
                maxHeight: 512,
            });
            nextPreviewUrl = URL.createObjectURL(uploadFile);
            const { uploadUrl, fields, key } = await presignLogo(uploadFile.type, empresaAlvoId);
            const formData = new FormData();
            Object.entries(fields).forEach(([name, value]) => formData.append(name, value));
            formData.append('file', uploadFile);
            const response = await fetch(uploadUrl, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Falha no upload do logo');
            if (logoPreviewObjectUrlRef.current) URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
            logoPreviewObjectUrlRef.current = nextPreviewUrl;
            setLogoUrl(key);
            setLogoPreview(nextPreviewUrl);
            nextPreviewUrl = null;
            setMessage('Logo enviado com sucesso');
        }
        catch {
            setMessage('Erro ao enviar logo');
        }
        finally {
            if (nextPreviewUrl) URL.revokeObjectURL(nextPreviewUrl);
            setUploading(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };
    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedTema = await updateTema({ paleta, logo_url: logoUrl || undefined }, empresaAlvoId);
            if (user && !platformMode) {
                setSession({
                    ...user,
                    empresa_paleta: updatedTema.paleta,
                    empresa_logo: updatedTema.logo_url,
                    empresa_nome: updatedTema.nome,
                });
            }
            setMessage('Tema salvo com sucesso!');
        }
        catch {
            setMessage('Erro ao salvar tema');
        }
        finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };
    if (userLoading)
        return null;
    if (!user || (platformMode ? user.role !== 'platform_admin' : user.role !== 'admin'))
        return null;
    return (<div className="admin-page-shell admin-page-embedded" style={buildBrandVars(paleta) as React.CSSProperties}>
        {platformMode && !lockedTab && <div className="admin-embedded-return">
          <AppButton variant="ghost" size="sm" icon={<ArrowLeft size={15}/>} onClick={() => setActiveSection('dashboard')}>
            Voltar ao painel
          </AppButton>
        </div>}

        <div className={cn('admin-console', platformMode && 'is-platform')}>
          {platformMode && <div className="admin-platform-context">
            <span>Empresa administrada</span>
            <select value={empresaSelecionadaId ?? ''} onChange={(event) => setEmpresaSelecionadaId(Number(event.target.value))} aria-label="Selecionar empresa">
              <option value="" disabled>Selecione uma empresa</option>
              {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}
            </select>
          </div>}

        <section className={cn('admin-workspace', lockedTab && 'is-single-column')}>
          {!lockedTab && <aside className="admin-tabs" aria-label="Seções administrativas">
            <span className="admin-tabs-label">{platformMode ? 'Administração global' : 'Configurações da empresa'}</span>
            {platformMode && <button type="button" onClick={() => setActiveTab('empresas')} className={cn('admin-tab', activeTab === 'empresas' && 'is-active')}>
              <Building2 size={17}/><span>Empresas</span>
            </button>}
            <button type="button" onClick={() => setActiveTab('usuarios')} className={cn('admin-tab', activeTab === 'usuarios' && 'is-active')}>
              <UsersRound size={17}/><span>Usuários</span>
            </button>
            <button type="button" onClick={() => setActiveTab('layout')} className={cn('admin-tab', activeTab === 'layout' && 'is-active')}>
              <LayoutTemplate size={17}/><span>Layout</span>
            </button>
          </aside>}

          <section className="admin-workspace-content">
            {activeTab === 'empresas' && platformMode ? <CompanyManagementTab empresas={empresas} onEmpresaCriada={handleEmpresaCriada} /> : platformMode && !empresaSelecionada ? <div className="admin-feedback is-error" role="status">Selecione uma empresa para administrar usuários, convites e layout.</div> : activeTab === 'usuarios' ? <UserManagementTab empresaId={empresaAlvoId} empresaNome={platformMode ? empresaSelecionada?.nome : undefined} podeCriarAdministrador={platformMode}/> : <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="app-page admin-page-content">
            <div className="admin-page-heading">
              <div>
                <span className="admin-page-eyebrow">Identidade visual</span>
                  <h1>{platformMode ? 'Layout da empresa selecionada' : 'Personalização da empresa'}</h1>
                <p>
                  Ajuste a marca e as cores usadas na experiência de {empresaNome || 'sua empresa'}.
                </p>
              </div>
              <div className="admin-heading-actions">
                <AppButton variant="ghost" icon={<RotateCcw size={16}/>} onClick={handleReset}>
                  Restaurar padrão
                </AppButton>
                <AppButton icon={<Save size={16}/>} onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar alterações'}
                </AppButton>
              </div>
            </div>

            {message && (<div className={cn('admin-feedback', message.startsWith('Erro') && 'is-error')} role="status" aria-live="polite">
                {message.startsWith('Erro') ? <AlertCircle size={17}/> : <CheckCircle2 size={17}/>}
                <span>{message}</span>
              </div>)}

            <div className="admin-settings-grid">
              <div className="admin-settings-column">
                <section className="admin-settings-section">
                  <AppSectionHeader title="Marca da empresa" subtitle="Identificação exibida nos pontos principais da plataforma."/>
                  <InfoCard raised className="admin-logo-card">
                    <InfoCard.Header title="Logotipo" subtitle="Use uma versão legível em fundos claros e escuros." icon={Building2} variant="primary"/>
                    <InfoCard.Section className="admin-logo-content">
                      <div className="admin-logo-preview">
                        {logoPreview ? (<img src={logoPreview} alt="Logo atual da empresa"/>) : (<Building2 size={25} aria-hidden="true"/>)}
                      </div>
                      <div className="admin-logo-copy">
                        <strong>{empresaNome || 'Sua empresa'}</strong>
                        <p>PNG, WEBP ou JPEG. Tamanho máximo de 2 MB.</p>
                        <label className={cn('app-button app-button--soft app-button--sm admin-upload-button', uploading && 'is-disabled')}>
                          <Upload size={15}/>
                          <span>{uploading ? 'Enviando...' : 'Selecionar arquivo'}</span>
                          <input type="file" accept="image/png,image/webp,image/jpeg" onChange={handleLogoUpload} disabled={uploading}/>
                        </label>
                      </div>
                    </InfoCard.Section>
                  </InfoCard>
                </section>

                <section className="admin-settings-section">
                  <AppSectionHeader title="Cores da interface" subtitle="Escolha uma combinação pronta ou personalize cada papel da paleta."/>
                  <InfoCard raised className="admin-colors-card">
                    <InfoCard.Header title="Paletas sugeridas" icon={Palette} variant="secondary"/>
                    <InfoCard.Section className="admin-palette-section">
                      <div className="admin-palette-grid">
                        {DEFAULT_PALETTES.map((preset) => {
            const selected = preset.paleta.primary === paleta.primary
                && preset.paleta.secondary === paleta.secondary
                && preset.paleta.accent === paleta.accent;
            return (<button key={preset.name} type="button" onClick={() => handleSelectPreset(preset.paleta)} className={cn('admin-palette-option', selected && 'is-selected')} aria-pressed={selected}>
                              <span className="admin-palette-swatches" aria-hidden="true">
                                <i style={{ backgroundColor: preset.paleta.primary }}/>
                                <i style={{ backgroundColor: preset.paleta.secondary }}/>
                                <i style={{ backgroundColor: preset.paleta.accent }}/>
                              </span>
                              <strong>{preset.name}</strong>
                              {selected && <CheckCircle2 size={15}/>}
                            </button>);
        })}
                      </div>
                    </InfoCard.Section>

                    <div className="admin-card-divider"/>

                    <InfoCard.Section className="admin-color-generator">
                      <div className="admin-subsection-heading">
                        <div className="admin-subsection-icon is-primary"><WandSparkles size={17}/></div>
                        <div>
                          <strong>Gerar paleta automaticamente</strong>
                          <p>Selecione uma cor principal para gerar combinações equilibradas.</p>
                        </div>
                      </div>
                      <div className="admin-generator-control">
                        <input type="color" value={paleta.primary} onChange={(event) => handleDerivePalette(event.target.value)} aria-label="Cor primária para geração automática"/>
                        <code>{paleta.primary.toUpperCase()}</code>
                        <span>Cor principal</span>
                      </div>
                    </InfoCard.Section>

                    <div className="admin-card-divider"/>

                    <InfoCard.Section className="admin-manual-colors">
                      <div className="admin-subsection-heading">
                        <div className="admin-subsection-icon is-secondary"><SlidersHorizontal size={17}/></div>
                        <div>
                          <strong>Ajuste manual</strong>
                          <p>Refine as cores individuais usadas pela marca.</p>
                        </div>
                      </div>
                      <div className="admin-color-fields">
                        {[
            { key: 'primary' as const, label: 'Primária' },
            { key: 'secondary' as const, label: 'Secundária' },
            { key: 'accent' as const, label: 'Destaque' },
            { key: 'text_primary' as const, label: 'Texto principal' },
            { key: 'text_secondary' as const, label: 'Texto secundário' },
        ].map(({ key, label }) => (<label key={key} className="admin-color-field">
                            <span>{label}</span>
                            <div>
                              <input type="color" value={paleta[key]} onChange={(event) => handleColorChange(key, event.target.value)} aria-label={`Selecionar ${label.toLowerCase()}`}/>
                              <input type="text" value={paleta[key]} onChange={(event) => handleColorChange(key, event.target.value)} aria-label={`Código hexadecimal de ${label.toLowerCase()}`}/>
                            </div>
                          </label>))}
                      </div>
                    </InfoCard.Section>
                  </InfoCard>
                </section>
              </div>

              <aside className="admin-preview-column">
                <AdminThemePreview paleta={paleta} logoPreview={logoPreview} empresaNome={empresaNome} userInitial={user.name?.charAt(0).toUpperCase() ?? ''}/>

                <div className="admin-mobile-actions">
                  <AppButton variant="ghost" icon={<RotateCcw size={16}/>} onClick={handleReset}>
                    Restaurar
                  </AppButton>
                  <AppButton icon={<Save size={16}/>} onClick={handleSave} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar alterações'}
                  </AppButton>
                </div>
              </aside>
            </div>
            </motion.div>}
          </section>
        </section>
        </div>
      </div>);
}
