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
  UsersRound,
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
  const [failedLogoPreview, setFailedLogoPreview] = useState<string | null>(null);
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
  const [empresasResolvedBusca, setEmpresasResolvedBusca] = useState<string | null>(null);
  const [empresasLoading, setEmpresasLoading] = useState(false);
  const [empresasError, setEmpresasError] = useState(false);
  const [empresaMenuOpen, setEmpresaMenuOpen] = useState(false);
  const [empresaActiveIndex, setEmpresaActiveIndex] = useState(0);
  const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState<
    number | null
  >(null);
  const empresaQueryPending = empresaBusca !== empresaBuscaInput.trim() || empresasResolvedBusca !== empresaBusca;
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
    const timeout = window.setTimeout(() => setEmpresaBusca(empresaBuscaInput.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [platformMode, empresaBuscaInput]);

  useEffect(() => {
    if (!platformMode) return;
    let cancelled = false;
    setEmpresasLoading(true);
    setEmpresasError(false);
    listarEmpresasPaginadas({ page: 1, pageSize: 25, search: empresaBusca })
      .then((data) => {
        if (cancelled) return;
        setEmpresas(data.items);
        setEmpresasResolvedBusca(empresaBusca);
        setEmpresaActiveIndex(0);
        if (!empresaBusca) setEmpresaSelecionadaId((current) => current ?? data.items[0]?.id ?? null);
      })
      .catch(() => { if (!cancelled) { setEmpresasResolvedBusca(empresaBusca); setEmpresasError(true); } })
      .finally(() => { if (!cancelled) setEmpresasLoading(false); });
    return () => { cancelled = true; };
  }, [platformMode, empresaBusca]);

  const selectEmpresa = (empresa: EmpresaAdministravel) => {
    if (saving || uploading) return;
    if (empresa.id === empresaSelecionadaId) {
      setEmpresaBuscaInput("");
      setEmpresaBusca("");
      setEmpresaMenuOpen(false);
      return;
    }
    if (dirty && !window.confirm("Há alterações não salvas. Deseja descartá-las e trocar de empresa?")) return;
    setEmpresaSelecionadaId(empresa.id);
    setEmpresaSelecionadaDetalhe(empresa);
    setEmpresaBuscaInput("");
    setEmpresaBusca("");
    setEmpresaMenuOpen(false);
  };

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
        setLogoPreview(data.logo_preview_url ?? null);
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
  const handleRemoveLogo = () => {
    if (logoPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
      logoPreviewObjectUrlRef.current = null;
    }
    setLogoUrl(null);
    setLogoPreview(null);
  };
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
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
              logo_url: logoUrl,
              parametros: parameters,
            })
          : {
              tema: await updateTema({
                paleta,
                logo_url: logoUrl,
              }),
              parametros: parameters,
            };
      const updatedTema = result.tema;
      setEmpresaNome(updatedTema.nome);
      if (logoPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(logoPreviewObjectUrlRef.current);
        logoPreviewObjectUrlRef.current = null;
      }
      setLogoPreview(updatedTema.logo_preview_url ?? null);
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
          empresa_logo: updatedTema.logo_preview_url,
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
                <div className="admin-company-combobox" onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setEmpresaMenuOpen(false);
                }}>
                  <AppSearchInput
                    value={empresaBuscaInput}
                    onChange={(event) => { setEmpresaBuscaInput(event.target.value); setEmpresaMenuOpen(true); }}
                    onFocus={() => setEmpresaMenuOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setEmpresaMenuOpen(false);
                      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                        event.preventDefault();
                        setEmpresaMenuOpen(true);
                        setEmpresaActiveIndex((current) => Math.max(0, Math.min(empresas.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
                      }
                      if (event.key === "Enter" && empresaMenuOpen && !empresaQueryPending && !empresasLoading && !empresasError && empresas[empresaActiveIndex]) {
                        event.preventDefault();
                        selectEmpresa(empresas[empresaActiveIndex]);
                      }
                    }}
                    role="combobox"
                    aria-expanded={empresaMenuOpen}
                    aria-controls={empresaMenuOpen ? "admin-company-options" : undefined}
                    aria-activedescendant={empresaMenuOpen && !empresaQueryPending && !empresasLoading && !empresasError && empresas[empresaActiveIndex] ? `admin-company-option-${empresas[empresaActiveIndex].id}` : undefined}
                    placeholder="Buscar e selecionar empresa"
                    label="Buscar e selecionar empresa"
                    maxLength={100}
                    disabled={saving || uploading}
                  />
                  {empresaMenuOpen && <div id="admin-company-options" className="admin-company-options" role="listbox" aria-label="Empresas">
                    {empresasLoading || empresaQueryPending ? <span role="status">Buscando empresas...</span> : empresasError ? <span role="alert">Não foi possível buscar empresas.</span> : empresas.length === 0 ? <span>Nenhuma empresa encontrada.</span> : empresas.map((empresa, index) => (
                      <button
                        key={empresa.id}
                        id={`admin-company-option-${empresa.id}`}
                        type="button"
                        role="option"
                        aria-selected={empresa.id === empresaSelecionadaId}
                        disabled={saving || uploading}
                        className={cn(index === empresaActiveIndex && "is-active")}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectEmpresa(empresa)}
                      >{empresa.nome}</button>
                    ))}
                  </div>}
                </div>
                <span className="admin-selected-company" role="status">Selecionada: <strong>{empresaSelecionada?.nome ?? "nenhuma empresa"}</strong></span>
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
                  size="sm"
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
                          <AppButton variant="ghost" onClick={handleReset}>
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
                            />
                            <InfoCard.Section className="admin-logo-content">
                              <div className="admin-logo-preview">
                                {logoPreview && logoPreview !== failedLogoPreview ? (
                                  <img
                                    src={logoPreview}
                                    alt="Logo atual da empresa"
                                    onError={() => setFailedLogoPreview(logoPreview)}
                                  />
                                ) : (
                                  <span>{logoUrl ? "Logo indisponível" : "Sem logotipo"}</span>
                                )}
                              </div>
                              <div className="admin-logo-copy">
                                <strong>{empresaNome || "Sua empresa"}</strong>
                                <p>
                                  PNG, WEBP ou JPEG. Tamanho máximo de 2 MB.
                                </p>
                                <div className="admin-logo-actions">
                                  <label
                                    className={cn(
                                      "app-button app-button--soft app-button--sm admin-upload-button",
                                      uploading && "is-disabled",
                                    )}
                                  >
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
                                  {logoUrl && (
                                    <AppButton variant="ghost" size="sm" onClick={handleRemoveLogo} disabled={uploading || saving}>
                                      Remover logotipo
                                    </AppButton>
                                  )}
                                </div>
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
                          logoPreview={logoPreview && logoPreview !== failedLogoPreview ? logoPreview : null}
                          onLogoError={setFailedLogoPreview}
                          empresaNome={empresaNome}
                          userInitial={user.name?.charAt(0).toUpperCase() ?? ""}
                        />

                        <div className="admin-mobile-actions">
                          <AppButton
                            variant="ghost"
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
