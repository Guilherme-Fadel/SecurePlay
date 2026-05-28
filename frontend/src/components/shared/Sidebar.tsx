import { Section } from "@/pages/Home"
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
    <aside className={`sticky top-0 h-screen flex-shrink-0 overflow-visible transition-all duration-300 z-50 ${expanded ? "w-65" : "w-18"}`}>
      <nav className="h-full flex flex-col border-r shadow-sm bg-[var(--surface)] overflow-visible">
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
            className="p-1.5 rounded-lg bg-[var(--secondary)] hover:bg-[var(--secondary-hover)] hover:shadow-[0_0_12px_var(--secondary-light-60))] transition hover:shadow-[0_0_12px_var(--secondary-light-60))] transition cursor-pointer"
          >
            {expanded ? <ChevronLeft /> : <Menu />}
          </button>
        </div>

        <SidebarContext.Provider value={{ expanded }}>
          <ul className="flex-1 px-3 overflow-visible">{children}</ul>
        </SidebarContext.Provider>

      </nav>
    </aside>
  )
}


interface SidebarItemProps {
  id: Section
  onSelect: (id: Section) => void
  icon: ReactNode
  text: string
  active?: boolean
  alert?: boolean
}

export function SidebarItem({
  id,
  onSelect,
  icon,
  text,
  active = false,
  alert = false,
}: SidebarItemProps) {
  const { expanded } = useSidebar()
  const [hovered, setHovered] = useState(false)

  return (
    <li
    onClick={() => onSelect(id)}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    className={`
      relative flex items-center py-2 px-3 my-1
      rounded-md cursor-pointer
      transition-colors
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

      {!expanded && hovered && (
        <div
          className="absolute left-full ml-1 px-2 py-1 rounded-md bg-[var(--surface-alt)] text-[var(--text-primary)] text-sm whitespace-nowrap z-[9999] shadow-lg border border-[var(--border)]"
        >
          {text}
        </div>
      )}
    </li>
  )
}
