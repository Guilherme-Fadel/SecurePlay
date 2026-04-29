import { Menu, ChevronLeft } from "lucide-react"
import {createContext, useContext, useState, ReactNode} from "react"

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
    <aside className={`sticky top-0 h-screen flex-shrink-0 transition-all duration-300 ${expanded ? "w-65" : "w-18"}`}>
      <nav className="h-full flex flex-col border-r shadow-sm bg-[var(--surface)]">
        <div className="p-4 pb-2 flex justify-between items-center">
          
            {expanded && (
                
                <>  
                    <span className="text-[var(--text-primary)] text-2xl">
                        Secure Play
                    </span>
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
      rounded-md cursor-pointer
      transition-colors group
      hover:bg-[var(--background)] text-[var(--text-primary)]

      ${active ? "bg-sidebar-accent text-[var(--text-primary)]" : ""}
    `}
>
      {icon}

      <span
        className={`overflow-hidden transition-all text-xl ${
          expanded ? "w-52 ml-4 " : "w-0"
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
          bg-sidebar-accent text-sidebar-foreground 
          invisible opacity-0 -translate-x-3
          transition-all
          group-hover:visible group-hover:opacity-100 group-hover:translate-x-0
          text-sidebar-primary
          text-xl
        `}
        >
        {text}
      </div>
      )}
    </li>
  )
}
