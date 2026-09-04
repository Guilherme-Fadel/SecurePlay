import { PageTransition } from '@/components/shared/PageTransition';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { HomeLoadingOverlay } from '@/components/shared/HomeLoadingOverlay';
import { Header } from "@/components/shared/layout/header/index";
import { MobileNavigation, Sidebar, SidebarItem } from '@/components/shared/Sidebar';
import { TrophyIcon, LayoutDashboard, Gamepad2, AwardIcon, BookOpenIcon, SettingsIcon, ArrowLeft, ShieldIcon } from "lucide-react";
import { Dashboard, Awards, Challenges, Ranking, Conteudos, Settings, Perfil } from '@/components/sections/HomePage/index';
import { lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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

function readNavigationState(): { section: Section | null; target: ContentTarget | null } {
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get('section') as Section | null;
    const moduloId = Number(params.get('modulo'));
    const aulaId = Number(params.get('aula'));
    return {
        section: requestedSection && validSections.includes(requestedSection) ? requestedSection : null,
        target: Number.isInteger(moduloId) && moduloId > 0
            ? { moduloId, ...(Number.isInteger(aulaId) && aulaId > 0 ? { aulaId } : {}) }
            : null,
    };
}

function writeNavigationState(section: Section, target: ContentTarget | null, replace = false) {
    const url = new URL(window.location.href);
    url.searchParams.set('section', section);
    url.searchParams.delete('modulo');
    url.searchParams.delete('aula');
    if (section === 'conteudos' && target) {
        url.searchParams.set('modulo', String(target.moduloId));
        if (target.aulaId) url.searchParams.set('aula', String(target.aulaId));
    }
    if (replace) window.history.replaceState({}, '', url);
    else window.history.pushState({}, '', url);
}

/**
 * Secoes que exigem role. Isso e conveniencia de interface, nao seguranca: quem
 * garante o acesso e o RolesGuard no backend. Serve para nao montar a tela nem
 * disparar as chamadas dela para quem vai receber 403.
 */
const restrictedSections: Partial<Record<Section, string>> = { admin: 'platform_admin' };
function HomeContent() {
    const location = useLocation();
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
    const [activeSection, setActiveSectionState] = useState<Section>(() => {
        const querySection = readNavigationState().section;
        if (querySection) return querySection;
        const routeState = location.state as { initialSection?: Section } | null;
        return routeState?.initialSection === 'admin' ? 'admin' : 'dashboard';
    });
    const [contentTarget, setContentTargetState] = useState<ContentTarget | null>(() => readNavigationState().target);
    const [previousSection, setPreviousSection] = useState<Section | null>(null);
    const { isLoading, setLoading, bootstrapReady, registerBootstrap } = useHomeLoading();
    const setActiveSection = useCallback((section: Section) => {
        const target = canOpenSection(section) ? section : 'dashboard';
        setPreviousSection(null);
        setActiveSectionState(target);
        setContentTargetState(null);
        writeNavigationState(target, null);
    }, [canOpenSection]);
    const navigateToSection = useCallback((section: Section) => {
        const target = canOpenSection(section) ? section : 'dashboard';
        setActiveSectionState((current) => {
            setPreviousSection(current);
            return target;
        });
        setContentTargetState(null);
        writeNavigationState(target, null);
    }, [canOpenSection]);
    const navigateToContent = useCallback((target: ContentTarget) => {
        setActiveSectionState((current) => {
            setPreviousSection(current === 'conteudos' ? null : current);
            return 'conteudos';
        });
        setContentTargetState(target);
        writeNavigationState('conteudos', target);
    }, []);
    const setContentTarget = useCallback((target: ContentTarget | null) => {
        setContentTargetState(target);
        writeNavigationState('conteudos', target);
    }, []);
    const goBack = useCallback(() => {
        if (previousSection) {
            setActiveSectionState(previousSection);
            setContentTargetState(null);
            writeNavigationState(previousSection, null);
            setPreviousSection(null);
        }
    }, [previousSection]);
    useEffect(() => {
        const handlePopState = () => {
            const navigation = readNavigationState();
            const section = navigation.section ?? 'dashboard';
            setActiveSectionState(canOpenSection(section) ? section : 'dashboard');
            setContentTargetState(navigation.target);
            setPreviousSection(null);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [canOpenSection]);
    // A secao inicial vem da URL, antes de o usuario estar carregado. Quando ele
    // resolve sem a role, volta para o dashboard e corrige a URL com replace, para
    // nao deixar no historico uma entrada que reabre a secao negada.
    useEffect(() => {
        if (userLoading || canOpenSection(activeSection)) return;
        setActiveSectionState('dashboard');
        setContentTargetState(null);
        setPreviousSection(null);
        writeNavigationState('dashboard', null, true);
    }, [userLoading, canOpenSection, activeSection]);
    return (<>
        <SectionContext.Provider value={{ activeSection, setActiveSection, navigateToSection, navigateToContent, contentTarget, setContentTarget, previousSection, goBack, setLoading, registerBootstrap }}>
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
