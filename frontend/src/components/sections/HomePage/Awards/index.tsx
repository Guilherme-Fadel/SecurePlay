import { useCallback, useRef, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { PageTransition } from '@/components/shared/PageTransition';
import { DigitalKeyIcon } from '@/components/ui/visuals/DigitalKeyIcon';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { useAchievementShop, useAchievementTrail } from '@/hooks/useAchievements';
import type { AchievementTrail } from '@/services/achievements';
import { AlbumView } from './AlbumView';
import { CollectiblesView } from './CollectiblesView';
// Cosméticos (`cosmetic-*`, molduras e fundos) usados pelo menu da conta no trilho.
import '@/styles/cosmetics.css';
import '@/styles/album.css';

type AwardsView = 'album' | 'collectibles';

/**
 * A aba vem da URL (`/home/conquistas?aba=colecionaveis`), para o "Você" do
 * trilho abrir Colecionáveis direto. Sem o parâmetro, fica no Álbum.
 * A coleção aberta também fica na URL (`?colecao=<categoria>`).
 */
const TAB_PARAM = 'aba';
const SHOP_TAB_VALUE = 'colecionaveis';
const COLLECTION_PARAM = 'colecao';
const MANAGEMENT_ROLES = new Set(['admin', 'platform_admin']);

const TABS: ReadonlyArray<{ value: AwardsView; label: string }> = [
  { value: 'album', label: 'Álbum' },
  { value: 'collectibles', label: 'Colecionáveis' },
];

function useAwardsParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view: AwardsView = searchParams.get(TAB_PARAM) === SHOP_TAB_VALUE ? 'collectibles' : 'album';
  const collection = view === 'album' ? searchParams.get(COLLECTION_PARAM) : null;

  const setView = useCallback((next: AwardsView) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (next === 'collectibles') params.set(TAB_PARAM, SHOP_TAB_VALUE);
      else params.delete(TAB_PARAM);
      params.delete(COLLECTION_PARAM);
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  const setCollection = useCallback((category: string | null) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.delete(TAB_PARAM);
      if (category) params.set(COLLECTION_PARAM, category);
      else params.delete(COLLECTION_PARAM);
      return params;
      // Abrir empilha no histórico: o Voltar do navegador fecha a coleção em vez de sair de Conquistas.
    }, { replace: !category });
  }, [setSearchParams]);

  return { view, setView, collection, setCollection };
}

export function Awards() {
  const { view, setView, collection, setCollection } = useAwardsParams();
  const { user } = useCurrentUser();
  const features = useCompanyFeatures();
  const reduceMotion = useReducedMotion() === true;
  const { data: trail, loading, error, refetch } = useAchievementTrail();
  const shopState = useAchievementShop(view === 'collectibles');
  const prestigeBalance = view === 'collectibles'
    ? shopState.data?.prestigeBalance ?? trail?.summary.prestigeBalance
    : trail?.summary.prestigeBalance;
  const albumFeatures = {
    games: features.games.length > 0,
    dailyMission: !MANAGEMENT_ROLES.has(user?.role ?? ''),
  };

  return (
    <PageTransition>
      <div className={`album-v${reduceMotion ? ' is-reduced-motion' : ''}`}>
        <AwardsHeader view={view} onViewChange={setView} trail={trail} prestigeBalance={prestigeBalance} />

        <div id="awards-panel" role="tabpanel" aria-labelledby={`awards-tab-${view}`} className="al-panel">
          {view === 'album' ? (
            <AlbumView
              trail={trail}
              loading={loading}
              error={error}
              refetch={refetch}
              enabled={features.achievements}
              features={albumFeatures}
              collection={collection}
              onCollectionChange={setCollection}
            />
          ) : (
            <CollectiblesView shopState={shopState} trail={trail} />
          )}
        </div>
      </div>
    </PageTransition>
  );
}

/** Título da aba, resumo do álbum (do backend), abas e saldo de Chaves Digitais. */
function AwardsHeader({ view, onViewChange, trail, prestigeBalance }: {
  view: AwardsView;
  onViewChange: (view: AwardsView) => void;
  trail: AchievementTrail | null;
  prestigeBalance: number | undefined;
}) {
  return (
    <header className="al-header">
      <div>
        <h1 className="al-display al-title">{view === 'album' ? 'Meu álbum' : 'Colecionáveis'}</h1>
        {view === 'album' && trail && (
          <p className="al-lead">
            <strong>{trail.summary.unlocked} de {trail.summary.total}</strong> figurinhas coladas · Nível {trail.summary.level}
          </p>
        )}
      </div>
      <div className="al-header-side">
        <AwardsTabs view={view} onChange={onViewChange} />
        {prestigeBalance !== undefined && (
          <p className="al-key">
            <DigitalKeyIcon size={32} />
            <strong>{prestigeBalance}</strong>
            <span className="al-key-label">{prestigeBalance === 1 ? 'Chave Digital' : 'Chaves Digitais'}</span>
          </p>
        )}
      </div>
    </header>
  );
}

const TAB_KEYS: Record<string, (index: number, last: number) => number> = {
  ArrowRight: (index, last) => (index === last ? 0 : index + 1),
  ArrowLeft: (index, last) => (index === 0 ? last : index - 1),
  Home: () => 0,
  End: (_index, last) => last,
};

/** Abas acessíveis: setas, Home e End movem a seleção e o foco (tabindex itinerante). */
function AwardsTabs({ view, onChange }: { view: AwardsView; onChange: (view: AwardsView) => void }) {
  const refs = useRef(new Map<AwardsView, HTMLButtonElement>());
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = TAB_KEYS[event.key];
    if (!move) return;
    event.preventDefault();
    const target = TABS[move(TABS.findIndex((tab) => tab.value === view), TABS.length - 1)];
    if (!target) return;
    onChange(target.value);
    refs.current.get(target.value)?.focus();
  };
  return (
    <div className="al-tabs" role="tablist" aria-label="Seções de Conquistas" onKeyDown={onKeyDown}>
      {TABS.map((tab) => {
        const selected = view === tab.value;
        return (
          <button
            key={tab.value}
            ref={(element) => { if (element) refs.current.set(tab.value, element); else refs.current.delete(tab.value); }}
            type="button"
            role="tab"
            id={`awards-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls="awards-panel"
            tabIndex={selected ? 0 : -1}
            className="al-tab"
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
