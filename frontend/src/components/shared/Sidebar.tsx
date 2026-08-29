import { Section } from "@/pages/Home"
import { Menu, ChevronLeft, ShieldCheck } from "lucide-react"
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
    <aside className={`secure-sidebar sticky top-0 h-screen flex-shrink-0 overflow-visible transition-all duration-300 z-50 ${expanded ? "is-expanded w-65" : "is-collapsed w-18"}`}>
      <nav className="secure-sidebar-nav h-full flex flex-col border-r shadow-sm bg-[var(--surface)] overflow-visible">
        <div className="secure-sidebar-brand p-4 pb-2 flex justify-between items-center">

            {expanded && (

                <div className="secure-sidebar-logo">
                  <span className="secure-sidebar-logo-icon" aria-hidden="true"><ShieldCheck size={21} /></span>
                  <span className="secure-sidebar-logo-copy">
                    <strong>SecurePlay</strong>
                    <small>Academy</small>
                  </span>
                </div>
            )}


          <button
            onClick={() => setExpanded((curr) => !curr)}
            className="secure-sidebar-toggle p-1.5 rounded-lg transition cursor-pointer"
            aria-label={expanded ? 'Recolher menu lateral' : 'Expandir menu lateral'}
          >
            {expanded ? <ChevronLeft /> : <Menu />}
          </button>
        </div>

        <SidebarContext.Provider value={{ expanded }}>
          <ul className="secure-sidebar-list flex-1 px-3 overflow-visible">{children}</ul>
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
    className={`secure-sidebar-item
      relative flex items-center py-2 px-3 my-1
      rounded-md cursor-pointer
      transition-colors
      hover:bg-[var(--background)] text-[var(--text-primary)]

      ${active ? "is-active bg-sidebar-accent text-[var(--text-primary)]" : ""}
    `}
>
      {icon}

      <span
        className={`secure-sidebar-item-label overflow-hidden transition-all text-xl ${
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
