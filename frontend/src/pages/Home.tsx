import {Sidebar, SidebarItem} from "../components/shared/Sidebar"
import { PixelCursor } from "../components/ui/visuals/PixelCursor"
import { Home as HomeIcon, User } from "lucide-react"

export default function Home() {
  return (
    <div className="flex h-screen">

      <Sidebar>
        <SidebarItem icon={<HomeIcon />} text="Home" />
        <SidebarItem icon={<User />} text="Perfil" />
      </Sidebar>

        <main className="flex-1 p-6 bg-[var(--background-primary)]">
        <h1 className="text-2xl font-bold">Home</h1>
        <p>Conteúdo da página aqui</p>
        </main>
    </div>
  )
}
