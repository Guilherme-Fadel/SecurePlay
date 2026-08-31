import { useState, useEffect } from 'react';
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
import { AlertCircle, ArrowLeft, Building2, CheckCircle2, Eye, LayoutTemplate, Palette, RotateCcw, Save, ShieldCheck, SlidersHorizontal, Upload, UsersRound, WandSparkles, } from 'lucide-react';
import '@/styles/app-ui.css';
import './admin-users.css';
function hexToHsl(hex: string): [
    number,
    number,
    number
] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result)
        return [0, 0, 0];
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) {
        r = c;
        g = x;
    }
    else if (h < 120) {
        r = x;
        g = c;
    }
    else if (h < 180) {
        g = c;
        b = x;
    }
    else if (h < 240) {
        g = x;
        b = c;
    }
    else if (h < 300) {
        r = x;
        b = c;
    }
    else {
        r = c;
        b = x;
    }
    const toHex = (n: number) => {
        const hex = Math.round((n + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function derivePalette(primaryHex: string): EmpresaPaleta {
    const [h, s, l] = hexToHsl(primaryHex);
    const secondary = hslToHex((h + 180) % 360, Math.min(s, 80), Math.max(l, 40));
    const accent = hslToHex((h + 60) % 360, Math.min(s + 10, 100), Math.min(l + 10, 60));
    const isDark = l < 50;
    return {
        primary: primaryHex,
        secondary,
        accent,
        text_primary: isDark ? '#ECECEC' : '#1E293B',
        text_secondary: isDark ? '#94a3b8' : '#475569',
    };
}
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
    const [activeTab, setActiveTab] = useState<'usuarios' | 'layout'>(initialTab);
    const [empresas, setEmpresas] = useState<EmpresaAdministravel[]>([]);
    const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState<number | null>(null);
    const empresaSelecionada = empresas.find((empresa) => empresa.id === empresaSelecionadaId) ?? null;
    const empresaAlvoId = platformMode ? empresaSelecionadaId ?? undefined : undefined;

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

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
        const allowedTypes = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            setMessage('Formato inválido. Use PNG, SVG, WEBP ou JPEG.');
            setTimeout(() => setMessage(null), 3000);
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setMessage('Arquivo muito grande. Máximo: 2MB.');
            setTimeout(() => setMessage(null), 3000);
            return;
        }
        setUploading(true);
        try {
            const { uploadUrl, key } = await presignLogo(file.type, empresaAlvoId);
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });
            setLogoUrl(key);
            setLogoPreview(URL.createObjectURL(file));
            setMessage('Logo enviado com sucesso');
        }
        catch {
            setMessage('Erro ao enviar logo');
        }
        finally {
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

        {platformMode && <div className="admin-platform-context">
          <span>Empresa administrada</span>
          <select value={empresaSelecionadaId ?? ''} onChange={(event) => setEmpresaSelecionadaId(Number(event.target.value))} aria-label="Selecionar empresa">
            <option value="" disabled>Selecione uma empresa</option>
            {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>)}
          </select>
        </div>}

        {platformMode && !empresaSelecionada ? <div className="admin-feedback is-error" role="status">Selecione uma empresa para administrar usuários, convites e layout.</div> : <section className={cn('admin-workspace', lockedTab && 'is-single-column')}>
          {!lockedTab && <aside className="admin-tabs" aria-label="Seções administrativas">
            <span className="admin-tabs-label">{platformMode ? 'Administração global' : 'Configurações da empresa'}</span>
            <button type="button" onClick={() => setActiveTab('usuarios')} className={cn('admin-tab', activeTab === 'usuarios' && 'is-active')}>
              <UsersRound size={17}/><span>Usuários</span>
            </button>
            <button type="button" onClick={() => setActiveTab('layout')} className={cn('admin-tab', activeTab === 'layout' && 'is-active')}>
              <LayoutTemplate size={17}/><span>Layout</span>
            </button>
          </aside>}

          <section className="admin-workspace-content">
            {activeTab === 'usuarios' ? <UserManagementTab empresaId={empresaAlvoId} empresaNome={platformMode ? empresaSelecionada?.nome : undefined}/> : <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="app-page admin-page-content">
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
                        <p>PNG, SVG, WEBP ou JPEG. Tamanho máximo de 2 MB.</p>
                        <label className={cn('app-button app-button--soft app-button--sm admin-upload-button', uploading && 'is-disabled')}>
                          <Upload size={15}/>
                          <span>{uploading ? 'Enviando...' : 'Selecionar arquivo'}</span>
                          <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" onChange={handleLogoUpload} disabled={uploading}/>
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
                <section className="admin-settings-section admin-preview-section">
                  <AppSectionHeader title="Pré-visualização" subtitle="Uma amostra do dashboard com a paleta selecionada."/>
                  <InfoCard raised className="admin-preview-card">
                    <InfoCard.Header title="Dashboard da empresa" icon={Eye} variant="accent"/>
                    <InfoCard.Section>
                      <div className="admin-interface-preview" style={{
            '--preview-primary': paleta.primary,
            '--preview-secondary': paleta.secondary,
            '--preview-accent': paleta.accent,
            '--preview-text': paleta.text_primary,
            '--preview-muted': paleta.text_secondary,
            '--preview-bg': paleta.text_primary.toUpperCase() === '#ECECEC' ? '#111827' : '#F8FAFC',
            '--preview-surface': paleta.text_primary.toUpperCase() === '#ECECEC' ? '#1E293B' : '#FFFFFF',
        } as React.CSSProperties}>
                        <div className="admin-preview-sidebar">
                          <div className="admin-preview-company-mark">
                            {logoPreview ? <img src={logoPreview} alt=""/> : <ShieldCheck size={16}/>}
                          </div>
                          <i className="is-active"/><i /><i /><i />
                        </div>
                        <div className="admin-preview-workspace">
                          <div className="admin-preview-header">
                            <div><strong>{empresaNome || 'Sua Empresa'}</strong><span>Dashboard</span></div>
                            <span className="admin-preview-avatar">{user.name?.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="admin-preview-welcome">
                            <div className="admin-preview-user-icon">{user.name?.charAt(0).toUpperCase()}</div>
                            <div><strong>Bem-vindo de volta!</strong><span>Continue sua jornada de segurança.</span></div>
                          </div>
                          <div className="admin-preview-cards">
                            <div><span>Progresso</span><strong>72%</strong><i><b /></i></div>
                            <div className="is-highlight"><span>Desafio do dia</span><strong>Blindagem de Conta</strong><button>Iniciar desafio</button></div>
                          </div>
                        </div>
                      </div>

                      <div className="admin-preview-legend">
                        <div><i style={{ backgroundColor: paleta.primary }}/><span>Primária</span><code>{paleta.primary}</code></div>
                        <div><i style={{ backgroundColor: paleta.secondary }}/><span>Secundária</span><code>{paleta.secondary}</code></div>
                        <div><i style={{ backgroundColor: paleta.accent }}/><span>Destaque</span><code>{paleta.accent}</code></div>
                      </div>
                    </InfoCard.Section>
                  </InfoCard>
                </section>

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
        </section>}
      </div>);
}
