import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Section } from '@/pages/Home';
import { paths, studentSectionPath } from '@/lib/appPaths';
import { BrandCharacter } from './BrandCharacter';
import { RailAwardsIcon, RailGamesIcon, RailHomeIcon, RailLearnIcon, RailRankingIcon } from './AppRailIcons';
import { AccountGroup, type AccountPanel } from './layout/header';
import { ACCOUNT_PANEL_ID } from './layout/header/UserMenu';
import { RailLayerContext } from './layout/header/RailPopover';
import '@/styles/app-rail.css';

type RailSection = Extract<Section, 'dashboard' | 'conteudos' | 'desafios' | 'ranking' | 'conquistas'>;

interface RailItemConfig {
  id: RailSection;
  label: string;
  icon: ReactNode;
}

/** Ordem do canvas: estudo antes de jogo. A cor de cada item vem do CSS. */
const RAIL_ITEMS: RailItemConfig[] = [
  { id: 'dashboard', label: 'Início', icon: <RailHomeIcon /> },
  { id: 'conteudos', label: 'Aprender', icon: <RailLearnIcon /> },
  { id: 'desafios', label: 'Jogos', icon: <RailGamesIcon /> },
  { id: 'ranking', label: 'Ranking', icon: <RailRankingIcon /> },
  { id: 'conquistas', label: 'Conquistas', icon: <RailAwardsIcon /> },
];

interface AppRailProps {
  activeSection: Section;
  onSelect: (section: Section) => void;
  onOpenCollectibles: () => void;
  showRanking: boolean;
  showAchievements: boolean;
  showAdmin: boolean;
}

/** Clique simples navega pela Home; Ctrl/Shift/meio continuam abrindo o link. */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function followInApp(event: MouseEvent<HTMLAnchorElement>, action: () => void) {
  if (!isPlainClick(event)) return;
  event.preventDefault();
  action();
}

export function AppRail({ activeSection, onSelect, onOpenCollectibles, showRanking, showAchievements, showAdmin }: AppRailProps) {
  const [openPanel, setOpenPanel] = useState<AccountPanel>(null);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const items = RAIL_ITEMS.filter((item) =>
    (item.id !== 'ranking' || showRanking) && (item.id !== 'conquistas' || showAchievements));

  return (
    <RailLayerContext.Provider value={layer}>
      <div className="sp-rail">
        <nav className="sp-rail-nav" aria-label="Menu principal">
          <RailBrand />
          <span className="sp-rail-sep" aria-hidden="true" />
          <RailList items={items} activeSection={activeSection} onSelect={onSelect} />
          <RailMe
            showAchievements={showAchievements}
            accountOpen={openPanel === 'account'}
            onOpenCollectibles={onOpenCollectibles}
            onOpenAccount={() => setOpenPanel('account')}
          />
          <AccountGroup
            openPanel={openPanel}
            onPanelChange={setOpenPanel}
            showAdmin={showAdmin}
            profileActive={activeSection === 'perfil'}
          />
        </nav>
      </div>
      <div ref={setLayer} className="sp-rail-layer" />
    </RailLayerContext.Provider>
  );
}

function RailBrand() {
  return (
    <Link className="sp-rail-brand" to="/" aria-label="SecurePlay: voltar para o site">
      <BrandCharacter className="sp-rail-brand-symbol" body="var(--sp-cream)" face="var(--sp-blue)" eyes="var(--sp-cream)" />
    </Link>
  );
}

function RailList({ items, activeSection, onSelect }: { items: RailItemConfig[]; activeSection: Section; onSelect: (section: Section) => void }) {
  const activeRef = useRef<HTMLLIElement>(null);

  // No celular a lista rola na horizontal: mantém o item ativo à vista.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeSection]);

  return (
    <ul className="sp-rail-list">
      {items.map((item) => {
        const active = item.id === activeSection;
        return (
          <li key={item.id} ref={active ? activeRef : undefined} className={`sp-rail-item sp-rail-item--${item.id}${active ? ' is-active' : ''}`}>
            <a
              className="sp-rail-link"
              href={studentSectionPath(item.id)}
              aria-current={active ? 'page' : undefined}
              onClick={(event) => followInApp(event, () => onSelect(item.id))}
            >
              <span className="sp-rail-icon">{item.icon}</span>
              <span className="sp-rail-label">{item.label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

interface RailMeProps {
  showAchievements: boolean;
  accountOpen: boolean;
  onOpenCollectibles: () => void;
  onOpenAccount: () => void;
}

/** "Você": abre Colecionáveis; sem Conquistas na empresa, abre o menu da conta. */
function RailMe({ showAchievements, accountOpen, onOpenCollectibles, onOpenAccount }: RailMeProps) {
  const content = (
    <>
      <BrandCharacter className="sp-rail-me-character" body="var(--sp-yellow)" face="var(--sp-black)" eyes="var(--sp-yellow)" expression="happy" />
      <span className="sp-rail-label">Você</span>
    </>
  );

  if (!showAchievements) {
    return (
      <button
        type="button"
        className="sp-rail-me"
        aria-label="Você: abrir menu da conta"
        aria-haspopup="dialog"
        aria-expanded={accountOpen}
        aria-controls={accountOpen ? ACCOUNT_PANEL_ID : undefined}
        onClick={onOpenAccount}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      className="sp-rail-me"
      href={paths.colecionaveis()}
      aria-label="Seu personagem: personalizar em Conquistas, Colecionáveis"
      onClick={(event) => followInApp(event, onOpenCollectibles)}
    >
      {content}
    </a>
  );
}
