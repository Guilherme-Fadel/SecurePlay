import { MoreVertical, ChevronRight, Menu, ChevronLeft } from "lucide-react"
import {createContext, useContext, useState, ReactNode} from "react"
import { PixelMascot } from "../ui/visuals/PixelMascot"

interface SidebarContextProps {
  expanded: boolean
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
)

function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("SidebarItem must be used within a Sidebar")
  }
  return context
}


interface SidebarProps {
  children: ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  const [expanded, setExpanded] = useState<boolean>(true)


  return (
    <aside className={`h-screen transition-all duration-300 ${expanded ? "w-60" : "w-18"}`}>
      <nav className="h-full flex flex-col border-r shadow-sm bg-sidebar-foreground/35">
        <div className="p-4 pb-2 flex justify-between items-center">
          
            {expanded && (
                
                <>  
                    <h1 className="text-sm font-['Press_Start_2P'] text-[var(--text-primary)]">
                        Secure Play
                    </h1>
                </>
            )}


          <button
            onClick={() => setExpanded((curr) => !curr)}
            className="p-1.5 rounded-lg bg-[var(--secondary)] hover:bg-[#2ED8A0] hover:shadow-[0_0_12px_rgba(58,242,165,0.6)] transition hover:shadow-[0_0_12px_rgba(58,242,165,0.6)] transition cursor-pointer"
          >
            {expanded ? <ChevronLeft /> : <Menu />}
          </button>
        </div>

        <SidebarContext.Provider value={{ expanded }}>
          <ul className="flex-1 px-3">{children}</ul>
        </SidebarContext.Provider>

        <div className="border-t flex p-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://ui-avatars.com/api/?name=Guilherme+Fadel&background=c7d2fe&color=3730a3&bold=true"
            alt="User avatar"
            className="w-10 h-10 rounded-md"
          />

          <div
            className={`
              leading-4 overflow-hidden transition-all
              ${expanded ? "w-40" : "w-0"}
            `}
          >
            <h4 className="font-semibold text-[var(--text-primary)]">
              Guilherme Fadel
            </h4>
            <span className="text-xs text-[var(--text-primary)]/70">
              gui_teste@gmail.com
            </span>
          </div>
        </div>

        {expanded && (
          <>
            <div className="relative group">
              <MoreVertical
                size={20}
                className="text-[var(--text-primary)] cursor-pointer"
              />

              <div
                className="
                  absolute left-full ml-1 bottom-full mb-0.5
                  w-44 rounded-md
                  bg-[var(--background)]
                  border border-[var(--border-primary)]/10
                  shadow-xl
                  invisible opacity-0 scale-95
                  transition-all duration-200
                  group-hover:visible
                  group-hover:opacity-100
                  group-hover:scale-100
                  z-50
                "
              >
                <ul className="text-xs font-['Press_Start_2P'] text-[var(--text-primary)]">
                  <li className="px-4 py-2 hover:bg-[var(--background-primary)]/10 cursor-pointer">
                    Perfil
                  </li>
                  <li className="px-4 py-2 hover:bg-[var(--background-primary)]/10 cursor-pointer">
                    Configurações
                  </li>
                  <li className="px-4 py-2 text-red-400 hover:bg-red-500/10 cursor-pointer">
                    Sair
                  </li>
                </ul>
              </div>
            </div>
                    
          </>
        )}
      </div>
      </nav>
    </aside>
  )
}


interface SidebarItemProps {
  icon: ReactNode
  text: string
  active?: boolean
  alert?: boolean
}

export function SidebarItem({
  icon,
  text,
  active = false,
  alert = false,
}: SidebarItemProps) {
  const { expanded } = useSidebar()

  return (
    <li
    className={`
      relative flex items-center py-2 px-3 my-1
      font-['Press_Start_2P'] text-xs rounded-md cursor-pointer
      transition-colors group
      hover:bg-sidebar-accent hover:text-sidebar-foreground
      text-sidebar-primary-foreground

      ${active ? "bg-sidebar-accent text-sidebar-foreground" : ""}
    `}
>
      {icon}

      <span
        className={`overflow-hidden transition-all ${
          expanded ? "w-52 ml-3" : "w-0"
        }`}
      >
        {text}
      </span>

      {alert && (
        <div
          className={`absolute right-2 w-2 h-2 rounded bg-indigo-400 ${
            expanded ? "" : "top-2"
          }`}
        />
      )}

      {!expanded && (
        <div
        className={`
          absolute left-full ml-6 px-2 py-1 rounded-md
          bg-sidebar-accent text-sidebar-foreground text-xs
          invisible opacity-0 -translate-x-3
          transition-all
          group-hover:visible group-hover:opacity-100 group-hover:translate-x-0
          text-sidebar-primary
        `}
        >
        {text}
      </div>
      )}
    </li>
  )
}
