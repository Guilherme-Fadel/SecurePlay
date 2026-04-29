import { PageTransition } from '../components/shared/PageTransition';
import { LoadingScreen } from '../components/shared/LoadingScreen';
import { Header } from "../components/shared/layout/header/index"
import {Sidebar, SidebarItem} from "../components/shared/Sidebar"
import { PixelCursor } from "../components/ui/visuals/PixelCursor"
import { TrophyIcon, LayoutDashboard, Target, AwardIcon, BookOpenIcon, SettingsIcon } from "lucide-react"

export default function Home() {
  return (
    <PageTransition>
      <>
        <LoadingScreen />
        <PixelCursor />

        <div className="flex min-h-screen">

          <Sidebar>
            <SidebarItem icon={<LayoutDashboard />} text="Dashboard" />
            <SidebarItem icon={<Target />} text="Desafios" />
            <SidebarItem icon={<TrophyIcon />} text="Ranking" />
            <SidebarItem icon={<AwardIcon />} text="Conquistas" />
            <SidebarItem icon={<BookOpenIcon />} text="Treinamentos" />
            <SidebarItem icon={<SettingsIcon />} text="Configurações" />
          </Sidebar>

          <div className="flex flex-col flex-1 min-w-0">
            <Header />
            <main className="flex-1 p-6 bg-[var(--background)]">
              <h1 className="font-bold">Home</h1>

            </main>
          </div>

        </div>
      </>
    </PageTransition>
  );
}
