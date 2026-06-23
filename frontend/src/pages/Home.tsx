import { PageTransition } from '@/components/shared/PageTransition';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { HomeLoadingOverlay } from '@/components/shared/HomeLoadingOverlay';
import { Header } from "@/components/shared/layout/header/index"
import { Sidebar, SidebarItem } from '@/components/shared/Sidebar'
import { PixelCursor } from "@/components/ui/visuals/PixelCursor"
import { TrophyIcon, LayoutDashboard, Target, AwardIcon, BookOpenIcon, SettingsIcon, ArrowLeft } from "lucide-react"
import { Dashboard, Awards, Challenges, Ranking, Conteudos, Settings, Perfil } from '@/components/sections/HomePage/index';
import { useState, useCallback } from 'react';
import { SectionContext } from '@/contexts/SectionContext';
import { useHomeLoading } from '@/hooks/useHomeLoading';

export type Section = 'dashboard' | 'desafios' | 'ranking' | 'conquistas' | 'conteudos' | 'configuracoes' | 'perfil'

export default function Home() {
  
  const sections: Record<Section, React.ReactNode> = {
      dashboard:     <Dashboard />,
      desafios:      <Challenges />,
      ranking:       <Ranking />,
      conquistas:    <Awards />,
      conteudos:  <Conteudos />,
      configuracoes: <Settings />,
      perfil:        <Perfil />
    }

  const [activeSection, setActiveSectionState] = useState<Section>('dashboard')
  const [previousSection, setPreviousSection] = useState<Section | null>(null)
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


  return (
    <PageTransition>
      <SectionContext.Provider value={{ activeSection, setActiveSection, navigateToSection, previousSection, goBack, setLoading, registerBootstrap }}>
        <LoadingScreen ready={bootstrapReady} />
        <PixelCursor />

        <div className="flex min-h-screen">

          <Sidebar>
            <SidebarItem
              id="dashboard"
              icon={<LayoutDashboard />}
              text="Dashboard"
              active={activeSection === 'dashboard'}
              onSelect={setActiveSection}
            />
            <SidebarItem 
              id="conteudos" 
              icon={<BookOpenIcon />} 
              text="Conteúdos" 
              active={activeSection === 'conteudos'}
              onSelect={setActiveSection}
            />
            <SidebarItem 
              id="desafios" 
              icon={<Target />} 
              text="Desafios" 
              active={activeSection === 'desafios'}
              onSelect={setActiveSection}
            />
            <SidebarItem 
              id="ranking" 
              icon={<TrophyIcon />} 
              text="Ranking"
              active={activeSection === 'ranking'}
              onSelect={setActiveSection} 
            />
            <SidebarItem 
              id="conquistas" 
              icon={<AwardIcon />} 
              text="Conquistas" 
              active={activeSection === 'conquistas'}
              onSelect={setActiveSection}
            />
            <SidebarItem 
              id="configuracoes" 
              icon={<SettingsIcon />} 
              text="Configurações" 
              active={activeSection === 'configuracoes'}
              onSelect={setActiveSection}
            />
          </Sidebar>

          <div className="flex flex-col flex-1 min-w-0">
            <Header />
            <main className="relative flex-1 p-6 bg-[var(--background)]">
              <HomeLoadingOverlay isLoading={isLoading} />
              {previousSection && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1.5 mb-4 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Voltar</span>
                </button>
              )}
              {sections[activeSection]}
            </main>
          </div>

        </div>
      </SectionContext.Provider>
    </PageTransition>
  );
}
