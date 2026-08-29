import { PageTransition } from '@/components/shared/PageTransition';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { HomeLoadingOverlay } from '@/components/shared/HomeLoadingOverlay';
import { Header } from "@/components/shared/layout/header/index";
import { Sidebar, SidebarItem } from '@/components/shared/Sidebar';
import { TrophyIcon, LayoutDashboard, Gamepad2, AwardIcon, BookOpenIcon, SettingsIcon, ArrowLeft, ShieldIcon } from "lucide-react";
import { Dashboard, Awards, Challenges, Ranking, Conteudos, Settings, Perfil } from '@/components/sections/HomePage/index';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SectionContext } from '@/contexts/SectionContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useHomeLoading } from '@/hooks/useHomeLoading';
import { useEmpresaTema } from '@/hooks/useEmpresaTema';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import '@/styles/app-ui.css';
import { AppButton } from '@/components/ui/buttons/AppButton';
export type Section = 'dashboard' | 'desafios' | 'ranking' | 'conquistas' | 'conteudos' | 'configuracoes' | 'perfil';
function HomeContent() {
    const navigate = useNavigate();
    const { user } = useCurrentUser();
    const sections: Record<Section, React.ReactNode> = {
        dashboard: <Dashboard />,
        desafios: <Challenges />,
        ranking: <Ranking />,
        conquistas: <Awards />,
        conteudos: <Conteudos />,
        configuracoes: <Settings />,
        perfil: <Perfil />
    };
    useEmpresaTema();
    const [activeSection, setActiveSectionState] = useState<Section>('dashboard');
    const [previousSection, setPreviousSection] = useState<Section | null>(null);
    const { isLoading, setLoading, bootstrapReady, registerBootstrap } = useHomeLoading();
    const setActiveSection = useCallback((section: Section) => {
        setPreviousSection(null);
        setActiveSectionState(section);
    }, []);
    const navigateToSection = useCallback((section: Section) => {
        setActiveSectionState((current) => {
            setPreviousSection(current);
            return section;
        });
    }, []);
    const goBack = useCallback(() => {
        if (previousSection) {
            setActiveSectionState(previousSection);
            setPreviousSection(null);
        }
    }, [previousSection]);
    return (<>
        <SectionContext.Provider value={{ activeSection, setActiveSection, navigateToSection, previousSection, goBack, setLoading, registerBootstrap }}>
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
            {user?.role === 'admin' && (<li onClick={() => navigate('/admin')} className="secure-sidebar-admin relative flex items-center py-2 px-3 my-1 rounded-md cursor-pointer transition-colors hover:bg-[var(--background)] text-[var(--text-primary)]">
                <ShieldIcon />
                <span className="overflow-hidden transition-all text-xl w-52 ml-4">
                  Administrador
                </span>
              </li>)}
          </Sidebar>

          <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <Header />
            <main className="secure-home-main relative flex-1 min-h-0 overflow-y-auto p-6 bg-[var(--background)]">
              <HomeLoadingOverlay isLoading={isLoading}/>
              {previousSection && (<AppButton onClick={goBack} variant="ghost" size="sm" icon={<ArrowLeft size={16}/>} className="mb-4">
                  Voltar
                </AppButton>)}
              {sections[activeSection]}
            </main>
          </div>

        </div>
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
