import { PageTransition } from '../components/shared/PageTransition';
import { LoadingScreen } from '../components/shared/LoadingScreen';
import { Header } from "../components/shared/layout/header/index"
import { Sidebar, SidebarItem, type Section } from '../components/shared/Sidebar'
import { PixelCursor } from "../components/ui/visuals/PixelCursor"
import { TrophyIcon, LayoutDashboard, Target, AwardIcon, BookOpenIcon, SettingsIcon } from "lucide-react"
import { Dashboard, Awards, Challenges, Ranking, Training, Settings } from '../components/sections/HomePage/index';
import { useState } from 'react';


export default function Home() {
  
  const sections: Record<Section, React.ReactNode> = {
      dashboard:     <Dashboard />,
      desafios:      <Challenges />,
      ranking:       <Ranking />,
      conquistas:    <Awards />,
      treinamentos:  <Training />,
      configuracoes: <Settings />,
    }

  const [activeSection, setActiveSection] = useState<Section>('dashboard')

  console.log(activeSection)


  return (
    <PageTransition>
      <>
        <LoadingScreen />
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
              id="treinamentos" 
              icon={<BookOpenIcon />} 
              text="Treinamentos" 
              active={activeSection === 'treinamentos'}
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
            <main className="flex-1 p-6 bg-[var(--background)]">
              {sections[activeSection]}
            </main>
          </div>

        </div>
      </>
    </PageTransition>
  );
}
