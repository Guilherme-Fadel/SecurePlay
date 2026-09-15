import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  BellRing,
  Check,
  ChevronRight,
  Clock3,
  Globe2,
  KeyRound,
  Laptop,
  LockKeyhole,
  LayoutTemplate,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  UsersRound,
  Volume2,
} from "lucide-react";
import { AppButton } from "@/components/ui/buttons/AppButton";
import { InfoCard } from "@/components/ui/visuals/InfoCard";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCompanyFeatures } from "@/hooks/useCompanyFeatures";
import type { AdminSaveHandle } from "@/pages/Admin";
const CompanyAdminSettings = lazy(() => import("@/pages/Admin"));

type SettingsSection =
  | "experiencia"
  | "notificacoes"
  | "seguranca"
  | "usuarios_empresa"
  | "layout_empresa"
  | "funcionalidades_empresa";

interface UserPreferences {
  emailNotifications: boolean;
  challengeReminder: boolean;
  achievementNotifications: boolean;
  soundEffects: boolean;
  reducedMotion: boolean;
  compactMode: boolean;
  timezone: string;
}

const STORAGE_KEY = "secureplay-user-preferences";
const defaultPreferences: UserPreferences = {
  emailNotifications: true,
  challengeReminder: true,
  achievementNotifications: true,
  soundEffects: true,
  reducedMotion: false,
  compactMode: false,
  timezone: "America/Sao_Paulo",
};
const settingSections: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Palette;
}> = [
  {
    id: "experiencia",
    label: "Experiência",
    description: "Tema e interface",
    icon: Palette,
  },
  {
    id: "notificacoes",
    label: "Notificações",
    description: "Alertas e lembretes",
    icon: BellRing,
  },
  {
    id: "seguranca",
    label: "Segurança",
    description: "Acesso e privacidade",
    icon: ShieldCheck,
  },
];
const companyAdminSections: Array<{
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Palette;
}> = [
  {
    id: "usuarios_empresa",
    label: "Usuários da empresa",
    description: "Convites e acessos",
    icon: UsersRound,
  },
  {
    id: "layout_empresa",
    label: "Layout da empresa",
    description: "Marca e paleta",
    icon: LayoutTemplate,
  },
  {
    id: "funcionalidades_empresa",
    label: "Funcionalidades",
    description: "Parâmetros da empresa",
    icon: Settings2,
  },
];

function readPreferences(): UserPreferences {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored
      ? { ...defaultPreferences, ...JSON.parse(stored) }
      : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: typeof BellRing;
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  icon: Icon,
}: ToggleRowProps) {
  return (
    <label className="settings-toggle-row">
      <span className="settings-toggle-icon">
        <Icon size={17} />
      </span>
      <span className="settings-toggle-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="settings-switch" aria-hidden="true">
        <i />
      </span>
    </label>
  );
}

export function Settings() {
  const features = useCompanyFeatures();
  const { theme, setTheme } = useTheme();
  const { user } = useCurrentUser();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("experiencia");
  const [preferences, setPreferences] =
    useState<UserPreferences>(readPreferences);
  const [saved, setSaved] = useState(false);
  const [draftTheme, setDraftTheme] = useState<Theme>(theme);
  const [companyDirty, setCompanyDirty] = useState(false);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const companyAdmin = useRef<AdminSaveHandle>(null);
  const companySection =
    activeSection === "usuarios_empresa" ||
    activeSection === "layout_empresa" ||
    activeSection === "funcionalidades_empresa";
  const [companyTab, setCompanyTab] = useState<
    "usuarios" | "layout" | "funcionalidades"
  >("usuarios");
  useEffect(() => {
    if (activeSection === "usuarios_empresa") setCompanyTab("usuarios");
    if (activeSection === "layout_empresa") setCompanyTab("layout");
    if (activeSection === "funcionalidades_empresa")
      setCompanyTab("funcionalidades");
    setSaved(false);
  }, [activeSection, draftTheme]);
  useEffect(() => {
    if (companyDirty) setSaved(false);
  }, [companyDirty]);

  useEffect(() => {
    document.documentElement.toggleAttribute(
      "data-reduced-motion",
      preferences.reducedMotion,
    );
    document.documentElement.toggleAttribute(
      "data-compact-ui",
      preferences.compactMode,
    );
  }, [preferences.compactMode, preferences.reducedMotion]);

  const updatePreference = <Key extends keyof UserPreferences>(
    key: Key,
    value: UserPreferences[Key],
  ) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const savePreferences = async () => {
    if (saving || companyBusy) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (companyDirty) {
        if (!companyAdmin.current)
          throw new Error("A configuração da empresa ainda está carregando.");
        await companyAdmin.current.save();
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      setTheme(draftTheme);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError(
        "Não foi possível concluir o salvamento. Os ajustes pendentes foram mantidos. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };
  const restoreDefaults = () => {
    setPreferences(defaultPreferences);
    setDraftTheme("dark");
    setSaved(false);
  };
  const visibleSections =
    user?.role === "admin"
      ? [...settingSections, ...companyAdminSections]
      : settingSections;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="settings-page app-page"
    >
      <header className="settings-page-heading">
        <div>
          <span className="settings-eyebrow">
            <Settings2 size={13} /> Preferências
          </span>
          <h1>Configurações</h1>
          <p>Controle os parâmetros da sua experiência no Security Play.</p>
        </div>
        <div className="settings-heading-actions">
          <AppButton
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={15} />}
            onClick={restoreDefaults}
            disabled={saving || companyBusy}
          >
            Restaurar padrão
          </AppButton>
          <AppButton
            size="sm"
            disabled={saving || companyBusy}
            icon={saved ? <Check size={15} /> : <Save size={15} />}
            onClick={() => void savePreferences()}
          >
            {saving ? "Salvando…" : saved ? "Salvo" : "Salvar alterações"}
          </AppButton>
        </div>
      </header>

      {saveError && (
        <p className="admin-feedback is-error" role="alert">
          {saveError}
        </p>
      )}
      <fieldset
        disabled={saving}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <div className="settings-workspace">
          <aside
            className="settings-navigation"
            aria-label="Categorias de configurações"
          >
            <span className="settings-navigation-label">
              Configurações do usuário
            </span>
            {visibleSections.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={cn(
                  "settings-navigation-item",
                  activeSection === id && "is-active",
                )}
                aria-current={activeSection === id ? "page" : undefined}
              >
                <span className="settings-navigation-icon">
                  <Icon size={17} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <ChevronRight size={16} className="settings-navigation-arrow" />
              </button>
            ))}
            <div className="settings-navigation-note">
              <LockKeyhole size={14} />
              <span>
                {activeSection === "funcionalidades_empresa"
                  ? "Os parâmetros da empresa são salvos no sistema."
                  : "Suas preferências ficam vinculadas a este navegador."}
              </span>
            </div>
          </aside>

          <section className="settings-content">
            {activeSection === "experiencia" && (
              <div className="settings-panel">
                <div className="settings-panel-heading">
                  <div>
                    <h2>Experiência</h2>
                    <p>Ajuste a aparência e o comportamento da interface.</p>
                  </div>
                </div>
                <InfoCard raised className="settings-card">
                  <InfoCard.Header
                    title="Aparência"
                    subtitle="Escolha como você prefere visualizar a plataforma."
                    icon={Monitor}
                    variant="primary"
                  />
                  <InfoCard.Section>
                    <div
                      className="settings-theme-options"
                      role="radiogroup"
                      aria-label="Tema da interface"
                    >
                      {(
                        [
                          {
                            id: "dark",
                            label: "Escuro",
                            description: "Confortável para sessões longas",
                            icon: Moon,
                          },
                          {
                            id: "light",
                            label: "Claro",
                            description: "Mais luminoso para o dia",
                            icon: Sun,
                          },
                        ] as Array<{
                          id: Theme;
                          label: string;
                          description: string;
                          icon: typeof Moon;
                        }>
                      ).map(({ id, label, description, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setDraftTheme(id)}
                          className={cn(
                            "settings-theme-option",
                            draftTheme === id && "is-selected",
                          )}
                          role="radio"
                          aria-checked={draftTheme === id}
                        >
                          <span
                            className={cn("settings-theme-preview", `is-${id}`)}
                          >
                            <Icon size={17} />
                          </span>
                          <span>
                            <strong>{label}</strong>
                            <small>{description}</small>
                          </span>
                          {draftTheme === id && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  </InfoCard.Section>
                </InfoCard>
                <InfoCard raised className="settings-card">
                  <InfoCard.Header
                    title="Interface"
                    subtitle="Pequenos ajustes para deixar o painel do seu jeito."
                    icon={Sparkles}
                    variant="secondary"
                  />
                  <InfoCard.Section className="settings-toggle-list">
                    <ToggleRow
                      title="Sons da interface"
                      description="Reproduz sons sutis durante interações na plataforma."
                      icon={Volume2}
                      checked={preferences.soundEffects}
                      onChange={(value) =>
                        updatePreference("soundEffects", value)
                      }
                    />
                    <ToggleRow
                      title="Reduzir animações"
                      description="Diminui movimentos e transições em toda a plataforma."
                      icon={Sparkles}
                      checked={preferences.reducedMotion}
                      onChange={(value) =>
                        updatePreference("reducedMotion", value)
                      }
                    />
                    <ToggleRow
                      title="Modo compacto"
                      description="Aproxima informações para exibir mais conteúdo por tela."
                      icon={Laptop}
                      checked={preferences.compactMode}
                      onChange={(value) =>
                        updatePreference("compactMode", value)
                      }
                    />
                  </InfoCard.Section>
                </InfoCard>
              </div>
            )}

            {activeSection === "notificacoes" && (
              <div className="settings-panel">
                <div className="settings-panel-heading">
                  <div>
                    <h2>Notificações</h2>
                    <p>
                      Defina quando o Security Play deve chamar sua atenção.
                    </p>
                  </div>
                </div>
                <InfoCard raised className="settings-card">
                  <InfoCard.Header
                    title="Canais e lembretes"
                    subtitle="Você pode alterar esses parâmetros quando quiser."
                    icon={BellRing}
                    variant="primary"
                  />
                  <InfoCard.Section className="settings-toggle-list">
                    <ToggleRow
                      title="Notificações por e-mail"
                      description="Receba avisos importantes da sua conta e da plataforma."
                      icon={BellRing}
                      checked={preferences.emailNotifications}
                      onChange={(value) =>
                        updatePreference("emailNotifications", value)
                      }
                    />
                    <ToggleRow
                      title="Lembrete de desafio diário"
                      description="Seus desafios pendentes aparecem no momento certo."
                      icon={Clock3}
                      checked={preferences.challengeReminder}
                      onChange={(value) =>
                        updatePreference("challengeReminder", value)
                      }
                    />
                    {features.achievements && (
                      <ToggleRow
                        title="Conquistas e evolução"
                        description="Celebre novos emblemas, níveis e marcos alcançados."
                        icon={Sparkles}
                        checked={preferences.achievementNotifications}
                        onChange={(value) =>
                          updatePreference("achievementNotifications", value)
                        }
                      />
                    )}
                  </InfoCard.Section>
                </InfoCard>
                <InfoCard raised className="settings-card">
                  <InfoCard.Header
                    title="Fuso horário"
                    subtitle="Usado para organizar lembretes e atividades do dia."
                    icon={Globe2}
                    variant="secondary"
                  />
                  <InfoCard.Section>
                    <label className="settings-select-field">
                      <span>Fuso horário</span>
                      <select
                        value={preferences.timezone}
                        onChange={(event) =>
                          updatePreference("timezone", event.target.value)
                        }
                      >
                        <option value="America/Sao_Paulo">
                          Brasília (GMT-3)
                        </option>
                        <option value="America/Manaus">Manaus (GMT-4)</option>
                        <option value="America/Rio_Branco">
                          Rio Branco (GMT-5)
                        </option>
                      </select>
                    </label>
                  </InfoCard.Section>
                </InfoCard>
              </div>
            )}

            {activeSection === "seguranca" && (
              <div className="settings-panel">
                <div className="settings-panel-heading">
                  <div>
                    <h2>Segurança</h2>
                    <p>
                      Revise os parâmetros que protegem o acesso à sua conta.
                    </p>
                  </div>
                </div>
                <InfoCard raised className="settings-card">
                  <InfoCard.Header
                    title="Proteção da conta"
                    subtitle="Mantenha suas credenciais e seu acesso em segurança."
                    icon={ShieldCheck}
                    variant="accent"
                  />
                  <InfoCard.Section className="settings-security-list">
                    <div className="settings-security-row">
                      <span className="settings-toggle-icon">
                        <KeyRound size={17} />
                      </span>
                      <div>
                        <strong>Autenticação em dois fatores</strong>
                        <p>Uma camada extra de proteção para sua conta.</p>
                      </div>
                      <span className="settings-status-chip is-soon">
                        Em breve
                      </span>
                    </div>
                    <div className="settings-security-row">
                      <span className="settings-toggle-icon">
                        <LockKeyhole size={17} />
                      </span>
                      <div>
                        <strong>Sessão protegida</strong>
                        <p>
                          Seu acesso atual é gerenciado com credenciais seguras.
                        </p>
                      </div>
                      <span className="settings-status-chip is-active">
                        <Check size={13} /> Ativa
                      </span>
                    </div>
                  </InfoCard.Section>
                  <InfoCard.Footer>
                    <span className="settings-card-footnote">
                      Para alterações de senha ou acesso, fale com o
                      administrador da sua empresa.
                    </span>
                  </InfoCard.Footer>
                </InfoCard>
              </div>
            )}

            {user?.role === "admin" && (
              <div hidden={!companySection}>
                <Suspense
                  fallback={
                    <p role="status">Carregando configurações da empresa…</p>
                  }
                >
                  <CompanyAdminSettings
                    ref={companyAdmin}
                    initialTab={companyTab}
                    lockedTab
                    hideSave
                    onDirtyChange={setCompanyDirty}
                    onBusyChange={setCompanyBusy}
                  />
                </Suspense>
              </div>
            )}
          </section>
        </div>
      </fieldset>
    </motion.div>
  );
}
