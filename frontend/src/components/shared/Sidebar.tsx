import type { Section } from "@/pages/Home"
import { Award, BookOpen, ChevronLeft, Gamepad2, LayoutDashboard, Menu, MoreHorizontal, Settings, ShieldCheck, ShieldIcon, Trophy, UserRound } from "lucide-react"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import academyCastle from '@/assets/dashboard/academy-castle-pixel-v5.png'

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
        {expanded && <img className="secure-sidebar-castle" src={academyCastle} alt="" aria-hidden="true" />}

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

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(id)}
        title={expanded ? undefined : text}
        aria-current={active ? 'page' : undefined}
        className={`secure-sidebar-item relative flex w-full items-center py-2 px-3 my-1 rounded-md cursor-pointer transition-colors hover:bg-[var(--background)] text-[var(--text-primary)] ${active ? "is-active bg-sidebar-accent text-[var(--text-primary)]" : ""}`}
      >
        {icon}
        <span className={`secure-sidebar-item-label overflow-hidden transition-all text-xl ${expanded ? "w-52 ml-4 " : "w-0"}`}>
          {text}
        </span>
        {alert && <span className={`absolute right-2 w-2 h-2 rounded bg-indigo-400 ${expanded ? "" : "top-2"}`} aria-label="Há novidade" />}
      </button>
    </li>
  )
}

type MobileNavigationProps = {
  activeSection: Section
  onSelect: (section: Section) => void
  showAdmin: boolean
}

const mobilePrimaryItems: Array<{ id: Section; label: string; icon: ReactNode }> = [
  { id: 'dashboard', label: 'Início', icon: <LayoutDashboard /> },
  { id: 'conteudos', label: 'Aprender', icon: <BookOpen /> },
  { id: 'desafios', label: 'Jogar', icon: <Gamepad2 /> },
  { id: 'ranking', label: 'Ranking', icon: <Trophy /> },
]

const mobileMoreItems: Array<{ id: Section; label: string; icon: ReactNode }> = [
  { id: 'conquistas', label: 'Conquistas', icon: <Award /> },
  { id: 'perfil', label: 'Meu perfil', icon: <UserRound /> },
  { id: 'configuracoes', label: 'Configurações', icon: <Settings /> },
]

export function MobileNavigation({ activeSection, onSelect, showAdmin }: MobileNavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const isMoreActive = mobileMoreItems.some((item) => item.id === activeSection) || (showAdmin && activeSection === 'admin')
  const moreItems = showAdmin
    ? [...mobileMoreItems, { id: 'admin' as Section, label: 'Administrador', icon: <ShieldIcon /> }]
    : mobileMoreItems

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const choose = (section: Section) => {
    onSelect(section)
    setMoreOpen(false)
  }

  return (
    <nav className="secure-mobile-nav" aria-label="Navegação principal">
      <div className="secure-mobile-nav-list">
        {mobilePrimaryItems.map((item) => (
          <button key={item.id} type="button" onClick={() => choose(item.id)} aria-current={activeSection === item.id ? 'page' : undefined} className={`secure-mobile-nav-button ${activeSection === item.id ? 'is-active' : ''}`}>
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
        <div className="secure-mobile-nav-more">
          <button type="button" onClick={() => setMoreOpen((current) => !current)} aria-expanded={moreOpen} aria-controls="secure-mobile-more-menu" className={`secure-mobile-nav-button ${isMoreActive ? 'is-active' : ''}`}>
            <MoreHorizontal /><span>Mais</span>
          </button>
          {moreOpen && (
            <div id="secure-mobile-more-menu" className="secure-mobile-more-menu" aria-label="Mais seções">
              {moreItems.map((item) => (
                <button key={item.id} type="button" onClick={() => choose(item.id)} aria-current={activeSection === item.id ? 'page' : undefined}>
                  {item.icon}<span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
