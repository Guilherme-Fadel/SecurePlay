import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getTema,
  updateTema,
  presignLogo,
  getCompanyParameters,
  updateCompanySettings,
  listarEmpresasPaginadas,
  type EmpresaAdministravel,
} from "@/services/admin";
import { EmpresaPaleta } from "@/services/me";
import { type CompanyParameters } from "@/config/features";
import { DEFAULT_PALETTES } from "@/lib/defaultPalettes";
import { cn } from "@/lib/utils";
import { useSectionContext } from "@/contexts/SectionContext";
import { buildBrandVars } from "@/hooks/useEmpresaTema";
import { AppButton } from "@/components/ui/buttons/AppButton";
import { AppSearchInput } from "@/components/ui/forms/AppSearchInput";
import { AppSelect } from "@/components/ui/forms/AppSelect";
import { InfoCard } from "@/components/ui/visuals/InfoCard";
import { AppSectionHeader } from "@/components/ui/visuals/AppSectionHeader";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { PendingNicknamesTab } from "@/components/admin/PendingNicknamesTab";
import { InvitationManagementTab } from "@/components/admin/InvitationManagementTab";
import { AdminOverviewTab } from "@/components/admin/AdminOverviewTab";
import { AuditTab } from "@/components/admin/AuditTab";
import { CompanyManagementTab } from "@/components/admin/CompanyManagementTab";
import { CompanyParametersTab } from "@/components/admin/CompanyParametersTab";
import { AdminPageHeader } from "@/components/admin/AdminListLayout";
import { AdminThemePreview } from "@/components/admin/AdminThemePreview";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { derivePalette } from "@/lib/palette";
import { optimizeImageUpload } from "@/lib/optimizeImageUpload";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Building2,
  CheckCircle2,
  Link2,
  LayoutTemplate,
  Palette,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Upload,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import "@/styles/app-ui.css";
import "./admin-ui.css";
import "./admin-users.css";
interface AdminProps {
  platformMode?: boolean;
  initialTab?: "usuarios" | "layout" | "funcionalidades";
  lockedTab?: boolean;
  hideSave?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}
export interface AdminSaveHandle {
  save: () => Promise<void>;
}

const Admin = forwardRef<AdminSaveHandle, AdminProps>(function Admin(
  {
    platformMode = false,
    initialTab = "usuarios",
    lockedTab = false,
    hideSave = false,
    onDirtyChange,
    onBusyChange,
  },
  ref,
) {
  const { user, loading: userLoading, setSession } = useCurrentUser();
  const { setActiveSection } = useSectionContext();
  const [paleta, setPaleta] = useState<EmpresaPaleta>(
    DEFAULT_PALETTES[0].paleta,
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parameters, setParameters] = useState<CompanyParameters | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const generation = useRef(0);
  const logoPreviewObjectUrlRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "empresas" | "visao-geral" | "usuarios" | "apelidos" | "convites" | "auditoria" | "layout" | "funcionalidades"
  >(initialTab);
  const [empresas, setEmpresas] = useState<EmpresaAdministravel[]>([]);
  const [empresaSelecionadaDetalhe, setEmpresaSelecionadaDetalhe] = useState<EmpresaAdministravel | null>(null);
  const [empresaBuscaInput, setEmpresaBuscaInput] = useState("");
  const [empresaBusca, setEmpresaBusca] = useState("");
  const [empresasTotal, setEmpresasTotal] = useState(0);
  const [empresasLoading, setEmpresasLoading] = useState(false);
  const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState<
    number | null
  >(null);
  const empresaSelecionada =
    empresas.find((empresa) => empresa.id === empresaSelecionadaId) ??
    (empresaSelecionadaDetalhe?.id === empresaSelecionadaId ? empresaSelecionadaDetalhe : null);
  const empresaAlvoId = platformMode
    ? (empresaSelecionadaId ?? undefined)
    : undefined;
  const adminSessionKey = user
    ? `secureplay-admin-view:${user.userId}:${platformMode ? "platform" : "company"}`
    : null;
  const [restoredAdminSessionKey, setRestoredAdminSessionKey] = useState<string | null>(null);
  const draftKey = JSON.stringify({
    paleta,
    logoUrl,
    empresaNome,
    parameters: platformMode ? parameters : null,
  });
  const dirty = baseline !== null && baseline !== draftKey;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onBusyChange?.(saving || uploading || !loaded);
  }, [saving, uploading, loaded, onBusyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const handleEmpresaCriada = (empresa: EmpresaAdministravel) => {
    setEmpresas((current) =>
      [...current, empresa].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
      ),
    );
    setEmpresasTotal((current) => current + 1);
    if (!dirty) {
      setEmpresaSelecionadaDetalhe(empresa);
      setEmpresaSelecionadaId(empresa.id);
    }
  };

  useEffect(() => {
    if (!adminSessionKey) return;
    try {
      const saved = sessionStorage.getItem(adminSessionKey);
      if (saved) {
        const state = JSON.parse(saved) as { activeTab?: typeof activeTab; empresaId?: number | null };
        const allowedTabs = platformMode
          ? ["empresas", "visao-geral", "usuarios", "apelidos", "convites", "auditoria", "layout", "funcionalidades"]
          : ["visao-geral", "usuarios", "apelidos", "convites", "layout"];
        if (state.activeTab && allowedTabs.includes(state.activeTab)) {
          setActiveTab(lockedTab ? initialTab : state.activeTab);
        } else {
          setActiveTab(initialTab);
        }
        if (platformMode && typeof state.empresaId === "number") {
          setEmpresaSelecionadaId(state.empresaId);
        }
      } else {
        setActiveTab(initialTab);
      }
    } catch {
      setActiveTab(initialTab);
    }
    setRestoredAdminSessionKey(adminSessionKey);
  }, [adminSessionKey, initialTab, lockedTab, platformMode]);

  useEffect(() => {
    if (!adminSessionKey || restoredAdminSessionKey !== adminSessionKey) return;
    try {
      sessionStorage.setItem(adminSessionKey, JSON.stringify({
        activeTab: lockedTab ? initialTab : activeTab,
        empresaId: platformMode ? empresaSelecionadaId : null,
      }));
    } catch {
      // Preferencias de navegação são opcionais se o armazenamento da sessão estiver indisponível.
    }
  }, [activeTab, adminSessionKey, empresaSelecionadaId, initialTab, lockedTab, platformMode, restoredAdminSessionKey]);

  useEffect(
    () => () => {
      if (logoPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!platformMode) return;
    let cancelled = false;
    setEmpresasLoading(true);
    listarEmpresasPaginadas({ page: 1, pageSize: 25, search: empresaBusca })
      .then((data) => {
        if (cancelled) return;
        setEmpresas(data.items);
        setEmpresasTotal(data.total);
        setEmpresaSelecionadaId((current) => current ?? data.items[0]?.id ?? null);
      })
      .catch(() => { if (!cancelled) setMessage("Erro ao carregar as empresas."); })
      .finally(() => { if (!cancelled) setEmpresasLoading(false); });
    return () => { cancelled = true; };
  }, [platformMode, empresaBusca]);

  useEffect(() => {
    if (platformMode && !empresaSelecionadaId) return;
    const current = ++generation.current;
    setLoaded(false);
    setBaseline(null);
    setParameters(null);
    setMessage(null);
    Promise.all([getTema(empresaAlvoId), getCompanyParameters(empresaAlvoId)])
      .then(([data, nextParameters]) => {
        if (generation.current !== current) return;
        setEmpresaNome(data.nome);
        if (platformMode && empresaAlvoId) {
          setEmpresaSelecionadaDetalhe({ id: empresaAlvoId, ...data });
        }
        const nextPalette = data.paleta ?? DEFAULT_PALETTES[0].paleta;
        setPaleta(nextPalette);
        setLogoUrl(data.logo_url ?? null);
        setLogoPreview(data.logo_url ?? null);
        setParameters(nextParameters);
        setBaseline(
          JSON.stringify({
            paleta: nextPalette,
            logoUrl: data.logo_url ?? null,
            empresaNome: data.nome,
            parameters: platformMode ? nextParameters : null,
          }),
        );
        setLoaded(true);
      })
      .catch(() => {
        if (generation.current === current)
          setMessage(
            "Erro ao carregar as configurações da empresa. Tente novamente.",
          );
      });
    return () => {
      generation.current += 1;
    };
  }, [empresaAlvoId, empresaSelecionadaId, platformMode, loadAttempt]);
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
    setMessage("Paleta resetada para o padrão");
    setTimeout(() => setMessage(null), 3000);
  };
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/png", "image/webp", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      setMessage("Formato inválido. Use PNG, WEBP ou JPEG.");
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Arquivo muito grande. Máximo: 2MB.");
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
      const { uploadUrl, fields, key } = await presignLogo(
        uploadFile.type,
        empresaAlvoId,
      );
      const formData = new FormData();
      Object.entries(fields).forEach(([name, value]) =>
        formData.append(name, value),
      );
      formData.append("file", uploadFile);
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Falha no upload do logo");
      if (logoPreviewObjectUrlRef.current)
        URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
      logoPreviewObjectUrlRef.current = nextPreviewUrl;
      setLogoUrl(key);
      setLogoPreview(nextPreviewUrl);
      nextPreviewUrl = null;
      setMessage("Logo enviado com sucesso");
    } catch {
      setMessage("Erro ao enviar logo");
    } finally {
      if (nextPreviewUrl) URL.revokeObjectURL(nextPreviewUrl);
      setUploading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };
  const handleSave = async () => {
    if (saving || uploading || !loaded)
      throw new Error(
        "Aguarde o carregamento ou envio da imagem antes de salvar.",
      );
    if (!dirty) return;
    setSaving(true);
    try {
      const result =
        platformMode && empresaAlvoId && parameters
          ? await updateCompanySettings(empresaAlvoId, {
              nome: empresaNome.trim(),
              paleta,
              logo_url: logoUrl ?? undefined,
              parametros: parameters,
            })
          : {
              tema: await updateTema({
                paleta,
                logo_url: logoUrl ?? undefined,
              }),
              parametros: parameters,
            };
      const updatedTema = result.tema;
      setEmpresaNome(updatedTema.nome);
      setBaseline(
        JSON.stringify({
          paleta: updatedTema.paleta ?? paleta,
          logoUrl,
          empresaNome: updatedTema.nome,
          parameters: platformMode ? result.parametros : null,
        }),
      );
      if (platformMode && empresaAlvoId)
        setEmpresas((items) =>
          items.map((empresa) =>
            empresa.id === empresaAlvoId
              ? { ...empresa, nome: updatedTema.nome }
              : empresa,
          ),
        );
      if (platformMode && empresaAlvoId) {
        setEmpresaSelecionadaDetalhe((current) => current?.id === empresaAlvoId
          ? { ...current, nome: updatedTema.nome } : current);
      }
      if (user && !platformMode) {
        setSession({
          ...user,
          empresa_paleta: updatedTema.paleta,
          empresa_logo: updatedTema.logo_url,
          empresa_nome: updatedTema.nome,
        });
      }
      setMessage("Todas as alterações da empresa foram salvas!");
    } catch {
      setMessage(
        "Erro ao salvar as alterações. Seus ajustes foram mantidos para tentar novamente.",
      );
      throw new Error("Não foi possível salvar as configurações da empresa.");
    } finally {
      setSaving(false);
    }
  };
  useImperativeHandle(ref, () => ({ save: handleSave }));
  if (userLoading) return null;
  if (
    !user ||
    (platformMode ? user.role !== "platform_admin" : user.role !== "admin")
  )
    return null;
  return (
    <div
      className="admin-page-shell admin-page-embedded"
      style={buildBrandVars(paleta) as React.CSSProperties}
    >
      {platformMode && !lockedTab && (
        <div className="admin-embedded-return">
          <AppButton
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={15} />}
            onClick={() => setActiveSection("dashboard")}
          >
            Voltar ao painel
          </AppButton>
        </div>
      )}

      <div className={cn("admin-console", platformMode && "is-platform")}>
        {(platformMode || !hideSave) && (
          <header className={cn("admin-company-toolbar", !platformMode && "is-save-only")}>
            {platformMode && (
              <div className="admin-platform-context">
                <label htmlFor="admin-company-select">Empresa administrada</label>
                <form onSubmit={(event) => { event.preventDefault(); setEmpresaBusca(empresaBuscaInput.trim()); }} className="admin-platform-search">
                  <AppSearchInput
                    value={empresaBuscaInput}
                    onChange={(event) => setEmpresaBuscaInput(event.target.value)}
                    placeholder="Buscar empresa"
                    label="Buscar empresa por nome"
                    maxLength={100}
                  />
                  <AppButton type="submit" size="control" variant="ghost">Buscar</AppButton>
                </form>
                <AppSelect
                  id="admin-company-select"
                  disabled={saving || uploading}
                  value={empresaSelecionadaId ?? ""}
                  onChange={(event) => {
                    if (
                      !dirty ||
                      window.confirm(
                        "Há alterações não salvas. Deseja descartá-las e trocar de empresa?",
                      )
                    ) {
                      setEmpresaSelecionadaId(Number(event.target.value));
                      setEmpresaSelecionadaDetalhe(empresas.find((empresa) => empresa.id === Number(event.target.value)) ?? null);
                    }
                  }}
                  aria-label="Selecionar empresa"
                >
                  <option value="" disabled>
                    Selecione uma empresa
                  </option>
                  {empresaSelecionadaDetalhe && !empresas.some((empresa) => empresa.id === empresaSelecionadaDetalhe.id) && (
                    <option value={empresaSelecionadaDetalhe.id}>{empresaSelecionadaDetalhe.nome}</option>
                  )}
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </option>
                  ))}
                </AppSelect>
                <small role="status">{empresasLoading ? "Buscando..." : `${empresasTotal} ${empresasTotal === 1 ? 'empresa encontrada' : 'empresas encontradas'}`}</small>
              </div>
            )}

            {!hideSave && (
              <div className="admin-global-save">
                {dirty && (
                  <span className="admin-save-status" role="status">
                    Alterações não salvas
                  </span>
                )}
                <AppButton
                  size="control"
                  icon={<Save size={16} />}
                  onClick={() => void handleSave().catch(() => {})}
                  disabled={!dirty || !loaded || saving || uploading}
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </AppButton>
              </div>
            )}
          </header>
        )}
        {message && (
          <div
            className={cn(
              "admin-feedback",
              message.startsWith("Erro") && "is-error",
            )}
            role="status"
          >
            {message}
            {!loaded && (
              <AppButton
                size="sm"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              >
                Tentar novamente
              </AppButton>
            )}
          </div>
        )}
        <fieldset
          disabled={saving || uploading}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          <section
            className={cn("admin-workspace", lockedTab && "is-single-column")}
          >
            {!lockedTab && (
              <nav className="admin-tabs" aria-label="Seções administrativas">
                <span className="admin-tabs-label">
                  {platformMode
                    ? "Administração global"
                    : "Configurações da empresa"}
                </span>
                {platformMode && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("empresas")}
                    aria-current={activeTab === "empresas" ? "page" : undefined}
                    className={cn(
                      "admin-tab",
                      activeTab === "empresas" && "is-active",
                    )}
                  >
                    <Building2 size={17} />
                    <span>Empresas</span>
                  </button>
                )}
                <button type="button" onClick={() => setActiveTab("visao-geral")} aria-current={activeTab === "visao-geral" ? "page" : undefined} className={cn("admin-tab", activeTab === "visao-geral" && "is-active")}>
                  <BarChart3 size={17} />
                  <span>Visão geral</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("usuarios")}
                  aria-current={activeTab === "usuarios" ? "page" : undefined}
                  className={cn(
                    "admin-tab",
                    activeTab === "usuarios" && "is-active",
                  )}
                >
                  <UsersRound size={17} />
                  <span>Usuários</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("apelidos")}
                  aria-current={activeTab === "apelidos" ? "page" : undefined}
                  className={cn(
                    "admin-tab",
                    activeTab === "apelidos" && "is-active",
                  )}
                >
                  <CheckCircle2 size={17} />
                  <span>Apelidos pendentes</span>
                </button>
                <button type="button" onClick={() => setActiveTab("convites")} aria-current={activeTab === "convites" ? "page" : undefined} className={cn("admin-tab", activeTab === "convites" && "is-active")}>
                  <Link2 size={17} />
                  <span>Convites</span>
                </button>
                {platformMode && <button type="button" onClick={() => setActiveTab("auditoria")} aria-current={activeTab === "auditoria" ? "page" : undefined} className={cn("admin-tab", activeTab === "auditoria" && "is-active")}>
                  <ClipboardList size={17} />
                  <span>Auditoria</span>
                </button>}
                <button
                  type="button"
                  onClick={() => setActiveTab("layout")}
                  aria-current={activeTab === "layout" || activeTab === "funcionalidades" ? "page" : undefined}
                  className={cn(
                    "admin-tab",
                    (activeTab === "layout" || activeTab === "funcionalidades") && "is-active",
                  )}
                >
                  <LayoutTemplate size={17} />
                  <span>Configurações da empresa</span>
                </button>
              </nav>
            )}

            <section className="admin-workspace-content">
              {!lockedTab && (activeTab === "layout" || activeTab === "funcionalidades") && (
                <nav className="admin-settings-subnav" aria-label="Configurações da empresa">
                  <button type="button" aria-current={activeTab === "layout" ? "page" : undefined} onClick={() => setActiveTab("layout")}>Layout</button>
                  {platformMode && <button type="button" aria-current={activeTab === "funcionalidades" ? "page" : undefined} onClick={() => setActiveTab("funcionalidades")}>Funcionalidades</button>}
                </nav>
              )}
              {activeTab === "empresas" && platformMode ? (
                <CompanyManagementTab
                  onEmpresaCriada={handleEmpresaCriada}
                  storageKey={`${adminSessionKey}:companies`}
                  empresaNome={empresaNome}
                  onNomeChange={loaded ? setEmpresaNome : undefined}
                />
              ) : platformMode && !empresaSelecionada ? (
                <div className="admin-feedback is-error" role="status">
                  Selecione uma empresa para administrar usuários, convites,
                  layout e funcionalidades.
                </div>
              ) : activeTab === "funcionalidades" && platformMode && user?.role === "platform_admin" ? (
                <CompanyParametersTab
                  parameters={parameters}
                  setParameters={setParameters}
                  canEdit={platformMode && user.role === "platform_admin"}
                  saving={saving}
                />
              ) : activeTab === "visao-geral" ? (
                <AdminOverviewTab empresaId={empresaAlvoId} empresaNome={platformMode ? empresaSelecionada?.nome : undefined} onNavigate={(tab) => setActiveTab(tab)} />
              ) : activeTab === "usuarios" ? (
                <UserManagementTab empresaId={empresaAlvoId} />
              ) : activeTab === "apelidos" ? (
                <PendingNicknamesTab empresaId={empresaAlvoId} />
              ) : activeTab === "convites" ? (
                <InvitationManagementTab empresaId={empresaAlvoId} podeCriarAdministrador={platformMode} />
              ) : activeTab === "auditoria" && platformMode ? (
                <AuditTab empresaId={empresaAlvoId} empresaNome={empresaSelecionada?.nome} />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="app-page admin-page-content"
                >
                  <fieldset
                    disabled={!loaded}
                    style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
                  >
                    <AdminPageHeader
                      title={platformMode ? "Layout da empresa selecionada" : "Personalização da empresa"}
                      description="Ajuste a marca e as cores usadas na experiência SecurePlay."
                      action={
                        <div className="admin-heading-actions">
                          <AppButton variant="ghost" icon={<RotateCcw size={16} />} onClick={handleReset}>
                            Restaurar padrão
                          </AppButton>
                        </div>
                      }
                    />

                    <div className="admin-settings-grid">
                      <div className="admin-settings-column">
                        <section className="admin-settings-section">
                          <AppSectionHeader
                            title="Marca da empresa"
                            action={<AdminHelpTip label="Marca da empresa" text="Identificação exibida nos pontos principais da plataforma." />}
                          />
                          <InfoCard raised className="admin-logo-card">
                            <InfoCard.Header
                              title="Logotipo"
                              action={<AdminHelpTip label="Logotipo" text="Use uma versão legível em fundos claros e escuros." />}
                              icon={Building2}
                              variant="primary"
                            />
                            <InfoCard.Section className="admin-logo-content">
                              <div className="admin-logo-preview">
                                {logoPreview ? (
                                  <img
                                    src={logoPreview}
                                    alt="Logo atual da empresa"
                                  />
                                ) : (
                                  <Building2 size={25} aria-hidden="true" />
                                )}
                              </div>
                              <div className="admin-logo-copy">
                                <strong>{empresaNome || "Sua empresa"}</strong>
                                <p>
                                  PNG, WEBP ou JPEG. Tamanho máximo de 2 MB.
                                </p>
                                <label
                                  className={cn(
                                    "app-button app-button--soft app-button--sm admin-upload-button",
                                    uploading && "is-disabled",
                                  )}
                                >
                                  <Upload size={15} />
                                  <span>
                                    {uploading
                                      ? "Enviando..."
                                      : "Selecionar arquivo"}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/png,image/webp,image/jpeg"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                  />
                                </label>
                              </div>
                            </InfoCard.Section>
                          </InfoCard>
                        </section>

                        <section className="admin-settings-section">
                          <AppSectionHeader
                            title="Cores da interface"
                            action={<AdminHelpTip label="Cores da interface" text="Escolha uma combinação pronta ou personalize cada papel da paleta." />}
                          />
                          <InfoCard raised className="admin-colors-card">
                            <InfoCard.Header
                              title="Paletas sugeridas"
                              icon={Palette}
                              variant="secondary"
                            />
                            <InfoCard.Section className="admin-palette-section">
                              <div className="admin-palette-grid">
                                {DEFAULT_PALETTES.map((preset) => {
                                  const selected =
                                    preset.paleta.primary === paleta.primary &&
                                    preset.paleta.secondary ===
                                      paleta.secondary &&
                                    preset.paleta.accent === paleta.accent;
                                  return (
                                    <button
                                      key={preset.name}
                                      type="button"
                                      onClick={() =>
                                        handleSelectPreset(preset.paleta)
                                      }
                                      className={cn(
                                        "admin-palette-option",
                                        selected && "is-selected",
                                      )}
                                      aria-pressed={selected}
                                    >
                                      <span
                                        className="admin-palette-swatches"
                                        aria-hidden="true"
                                      >
                                        <i
                                          style={{
                                            backgroundColor:
                                              preset.paleta.primary,
                                          }}
                                        />
                                        <i
                                          style={{
                                            backgroundColor:
                                              preset.paleta.secondary,
                                          }}
                                        />
                                        <i
                                          style={{
                                            backgroundColor:
                                              preset.paleta.accent,
                                          }}
                                        />
                                      </span>
                                      <strong>{preset.name}</strong>
                                      {selected && <CheckCircle2 size={15} />}
                                    </button>
                                  );
                                })}
                              </div>
                            </InfoCard.Section>

                            <div className="admin-card-divider" />

                            <InfoCard.Section className="admin-color-generator">
                              <div className="admin-subsection-heading">
                                <div className="admin-subsection-icon is-primary">
                                  <WandSparkles size={17} />
                                </div>
                                <div className="admin-subsection-copy">
                                  <strong>Gerar paleta automaticamente</strong>
                                  <AdminHelpTip label="Gerar paleta automaticamente" text="Selecione uma cor principal para gerar combinações equilibradas." />
                                </div>
                              </div>
                              <div className="admin-generator-control">
                                <input
                                  type="color"
                                  value={paleta.primary}
                                  onChange={(event) =>
                                    handleDerivePalette(event.target.value)
                                  }
                                  aria-label="Cor primária para geração automática"
                                />
                                <code>{paleta.primary.toUpperCase()}</code>
                                <span>Cor principal</span>
                              </div>
                            </InfoCard.Section>

                            <div className="admin-card-divider" />

                            <InfoCard.Section className="admin-manual-colors">
                              <div className="admin-subsection-heading">
                                <div className="admin-subsection-icon is-secondary">
                                  <SlidersHorizontal size={17} />
                                </div>
                                <div className="admin-subsection-copy">
                                  <strong>Ajuste manual</strong>
                                  <AdminHelpTip label="Ajuste manual" text="Refine as cores individuais usadas pela marca." />
                                </div>
                              </div>
                              <div className="admin-color-fields">
                                {[
                                  {
                                    key: "primary" as const,
                                    label: "Primária",
                                  },
                                  {
                                    key: "secondary" as const,
                                    label: "Secundária",
                                  },
                                  { key: "accent" as const, label: "Destaque" },
                                  {
                                    key: "text_primary" as const,
                                    label: "Texto principal",
                                  },
                                  {
                                    key: "text_secondary" as const,
                                    label: "Texto secundário",
                                  },
                                ].map(({ key, label }) => (
                                  <label
                                    key={key}
                                    className="admin-color-field"
                                  >
                                    <span>{label}</span>
                                    <div>
                                      <input
                                        type="color"
                                        value={paleta[key]}
                                        onChange={(event) =>
                                          handleColorChange(
                                            key,
                                            event.target.value,
                                          )
                                        }
                                        aria-label={`Selecionar ${label.toLowerCase()}`}
                                      />
                                      <input
                                        type="text"
                                        value={paleta[key]}
                                        onChange={(event) =>
                                          handleColorChange(
                                            key,
                                            event.target.value,
                                          )
                                        }
                                        aria-label={`Código hexadecimal de ${label.toLowerCase()}`}
                                      />
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </InfoCard.Section>
                          </InfoCard>
                        </section>
                      </div>

                      <aside className="admin-preview-column">
                        <AdminThemePreview
                          paleta={paleta}
                          logoPreview={logoPreview}
                          empresaNome={empresaNome}
                          userInitial={user.name?.charAt(0).toUpperCase() ?? ""}
                        />

                        <div className="admin-mobile-actions">
                          <AppButton
                            variant="ghost"
                            icon={<RotateCcw size={16} />}
                            onClick={handleReset}
                          >
                            Restaurar
                          </AppButton>
                        </div>
                      </aside>
                    </div>
                  </fieldset>
                </motion.div>
              )}
            </section>
          </section>
        </fieldset>
      </div>
    </div>
  );
});
export default Admin;
