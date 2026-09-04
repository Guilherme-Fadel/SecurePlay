import { PageTransition } from '@/components/shared/PageTransition';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { HomeLoadingOverlay } from '@/components/shared/HomeLoadingOverlay';
import { Header } from "@/components/shared/layout/header/index";
import { MobileNavigation, Sidebar, SidebarItem } from '@/components/shared/Sidebar';
import { TrophyIcon, LayoutDashboard, Gamepad2, AwardIcon, BookOpenIcon, SettingsIcon, ArrowLeft, ShieldIcon } from "lucide-react";
import { Dashboard, Awards, Challenges, Ranking, Conteudos, Settings, Perfil } from '@/components/sections/HomePage/index';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SectionContext, type ContentTarget } from '@/contexts/SectionContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useHomeLoading } from '@/hooks/useHomeLoading';
import { useEmpresaTema } from '@/hooks/useEmpresaTema';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVisualPreload } from '@/hooks/useVisualPreload';
import '@/styles/app-ui.css';
import '@/styles/settings-ui.css';
import '@/styles/profile-ui.css';
import '@/styles/dashboard-ui.css';
import '@/styles/academy-dashboard.css';
import { AppButton } from '@/components/ui/buttons/AppButton';
const Admin = lazy(() => import('@/pages/Admin'));
export type Section = 'dashboard' | 'desafios' | 'ranking' | 'conquistas' | 'conteudos' | 'configuracoes' | 'perfil' | 'admin';
const validSections: Section[] = ['dashboard', 'desafios', 'ranking', 'conquistas', 'conteudos', 'configuracoes', 'perfil', 'admin'];
const DEFAULT_SECTION: Section = 'dashboard';

/** Monta o pathname da Home. O conteudo carrega modulo/aula direto na URL. */
function sectionPath(section: Section, target: ContentTarget | null): string {
    if (section === 'conteudos' && target) {
        return `/home/conteudos/${target.moduloId}${target.aulaId ? `/${target.aulaId}` : ''}`;
    }
    return `/home/${section}`;
}

/**
 * Secoes que exigem role. Isso e conveniencia de interface, nao seguranca: quem
 * garante o acesso e o RolesGuard no backend. Serve para nao montar a tela nem
 * disparar as chamadas dela para quem vai receber 403.
 */
const restrictedSections: Partial<Record<Section, string>> = { admin: 'platform_admin' };
function HomeContent() {
    const navigate = useNavigate();
    const params = useParams();
    const { user, loading: userLoading } = useCurrentUser();
    const canOpenSection = useCallback(
        (section: Section) => {
            const requiredRole = restrictedSections[section];
            return !requiredRole || user?.role === requiredRole;
        },
        [user?.role],
    );
    const sections: Record<Section, React.ReactNode> = {
        dashboard: <Dashboard />,
        desafios: <Challenges />,
        ranking: <Ranking />,
        conquistas: <Awards />,
        conteudos: <Conteudos />,
        configuracoes: <Settings />,
        perfil: <Perfil />,
        admin: <Suspense fallback={null}><Admin platformMode /></Suspense>,
    };
    useEmpresaTema();
    useVisualPreload();

    // A URL e a fonte de verdade da navegacao. O router cuida do historico, entao
    // nao ha pushState manual nem listener de popstate: o botao voltar do navegador
    // funciona sozinho.
    const rawSection = params.section as Section | undefined;
    const activeSection: Section = rawSection && validSections.includes(rawSection) ? rawSection : DEFAULT_SECTION;
    const moduloId = Number(params.moduloId);
    const aulaId = Number(params.aulaId);
    // Memoizado por moduloId/aulaId: o Conteudos observa contentTarget num useEffect,
    // entao a identidade do objeto precisa ser estavel entre renders da mesma URL.
    const contentTarget: ContentTarget | null = useMemo(
        () =>
            activeSection === 'conteudos' && Number.isInteger(moduloId) && moduloId > 0
                ? { moduloId, ...(Number.isInteger(aulaId) && aulaId > 0 ? { aulaId } : {}) }
                : null,
        [activeSection, moduloId, aulaId],
    );

    // "Voltar" leva a secao de onde o usuario entrou no conteudo. Guardado em ref
    // (nao muda o render) e so vale enquanto a secao atual for conteudos.
    const enteredContentFrom = useRef<Section | null>(null);

    const { isLoading, setLoading, bootstrapReady, registerBootstrap } = useHomeLoading();

    const go = useCallback((section: Section, target: ContentTarget | null, options?: { replace?: boolean }) => {
        const allowed = canOpenSection(section) ? section : DEFAULT_SECTION;
        navigate(sectionPath(allowed, target), { replace: options?.replace });
    }, [canOpenSection, navigate]);

    const setActiveSection = useCallback((section: Section) => {
        enteredContentFrom.current = null;
        go(section, null);
    }, [go]);
    const navigateToSection = useCallback((section: Section) => {
        enteredContentFrom.current = activeSection === 'conteudos' ? enteredContentFrom.current : activeSection;
        go(section, null);
    }, [go, activeSection]);
    const navigateToContent = useCallback((target: ContentTarget) => {
        if (activeSection !== 'conteudos') enteredContentFrom.current = activeSection;
        go('conteudos', target);
    }, [go, activeSection]);
    const setContentTarget = useCallback((target: ContentTarget | null) => {
        go('conteudos', target);
    }, [go]);
    const previousSection = activeSection === 'conteudos' ? enteredContentFrom.current : null;
    const goBack = useCallback(() => {
        if (enteredContentFrom.current) {
            const target = enteredContentFrom.current;
            enteredContentFrom.current = null;
            go(target, null);
        }
    }, [go]);

    // /home sem segmento (vindo do login) vira /home/dashboard, para a URL bater
    // com a secao exibida. replace: nao cria passo extra no historico.
    useEffect(() => {
        if (!rawSection) navigate(sectionPath(DEFAULT_SECTION, null), { replace: true });
    }, [rawSection, navigate]);

    // A secao inicial vem da URL, antes de o usuario estar carregado. Quando ele
    // resolve sem a role, volta para o dashboard e corrige a URL com replace, para
    // nao deixar no historico uma entrada que reabre a secao negada.
    useEffect(() => {
        if (userLoading || canOpenSection(activeSection)) return;
        go(DEFAULT_SECTION, null, { replace: true });
    }, [userLoading, canOpenSection, activeSection, go]);

    const sectionValue = useMemo(
        () => ({ activeSection, setActiveSection, navigateToSection, navigateToContent, contentTarget, setContentTarget, previousSection, goBack, setLoading, registerBootstrap }),
        [activeSection, setActiveSection, navigateToSection, navigateToContent, contentTarget, setContentTarget, previousSection, goBack, setLoading, registerBootstrap],
    );

    return (<>
        <SectionContext.Provider value={sectionValue}>
        <LoadingScreen ready={bootstrapReady}/>
        <Toaster position="top-right" richColors/>

        <div className="secure-home flex h-screen overflow-hidden">

          <Sidebar>
            <SidebarItem id="dashboard" icon={<LayoutDashboard />} text="Dashboard" active={activeSection === 'dashboard'} onSelect={setActiveSection}/>
            <SidebarItem id="conteudos" icon={<BookOpenIcon />} text="Conteúdos" active={activeSection === 'conteudos'} onSelect={setActiveSection}/>
            <SidebarItem id="desafios" icon={<Gamepad2 />} text="Jogos" active={activeSection === 'desafios'} onSelect={setActiveSection}/>
            <SidebarItem id="ranking" icon={<TrophyIcon />} text="Ranking" active={activeSection === 'ranking'} onSelect={setActiveSection}/>
            <SidebarItem id="conquistas" icon={<AwardIcon />} text="Conquistas" active={activeSection === 'conquistas'} onSelect={setActiveSection}/>
            <SidebarItem id="configuracoes" icon={<SettingsIcon />} text="Configurações" active={activeSection === 'configuracoes'} onSelect={setActiveSection}/>
            {canOpenSection('admin') && <SidebarItem id="admin" icon={<ShieldIcon />} text="Administrador" active={activeSection === 'admin'} onSelect={setActiveSection}/>}
          </Sidebar>

          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <Header />
            <main className="secure-home-main relative flex-1 min-h-0 overflow-y-auto p-6 bg-[var(--background)]">
              <HomeLoadingOverlay isLoading={isLoading}/>
              {previousSection && (<AppButton onClick={goBack} variant="ghost" size="sm" icon={<ArrowLeft size={16}/>} className="mb-4">
                  Voltar
                </AppButton>)}
              {canOpenSection(activeSection) ? sections[activeSection] : null}
            </main>
          </div>

        </div>
        <MobileNavigation activeSection={activeSection} onSelect={setActiveSection} showAdmin={canOpenSection('admin')} />
        </SectionContext.Provider>
    </>);
}
export default function Home() {
    return (<PageTransition>
      <ThemeProvider>
        <HomeContent />
      </ThemeProvider>
    </PageTransition>);
}
