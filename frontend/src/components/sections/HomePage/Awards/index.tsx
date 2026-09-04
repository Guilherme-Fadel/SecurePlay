import { useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import {
  Award,
  BadgeCheck,
  Check,
  ChevronsUp,
  CircleHelp,
  Crown,
  Flame,
  Gamepad2,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Medal,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  type LucideProps,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/shared/PageTransition';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSectionHeader } from '@/components/ui/visuals/AppSectionHeader';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { AchievementIcon } from '@/components/ui/visuals/AchievementIcon';
import { useAchievementShop, useAchievementTrail } from '@/hooks/useAchievements';
import type {
  AchievementCategory,
  AchievementNode,
  AchievementRarity,
  AchievementTrail,
  CosmeticItem,
  CosmeticType,
} from '@/services/achievements';
import '@/styles/awards-ui.css';

type AwardsView = 'trail' | 'shop';

const categoryMeta: Record<AchievementCategory, { label: string; description: string; icon: ComponentType<LucideProps> }> = {
  sentinel: { label: 'Sentinela', description: 'Desafios e proteção', icon: ShieldCheck },
  specialist: { label: 'Especialista', description: 'Conteúdos e aprendizado', icon: GraduationCap },
  investigator: { label: 'Investigador', description: 'Jogos e precisão', icon: Search },
  consistency: { label: 'Consistência', description: 'Hábitos e sequência', icon: Flame },
  elite: { label: 'Elite', description: 'XP e evolução', icon: Crown },
};

const rarityLabels: Record<AchievementRarity, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Rara',
  epic: 'Épica',
  legendary: 'Lendária',
};

const cosmeticLabels: Record<CosmeticType, string> = {
  frame: 'Bordas',
  background: 'Planos de fundo',
  title: 'Títulos',
  badge: 'Emblemas',
  effect: 'Efeitos',
};


export function Awards() {
  const [view, setView] = useState<AwardsView>('trail');
  const { data: trail, loading, error, refetch } = useAchievementTrail();

  return (
    <PageTransition>
      <div className="app-page achievements-page">
        <AppSectionHeader
          title="Conquistas"
          subtitle="Evolua pelas trilhas, conquiste Prestígio e personalize sua presença no SecurePlay."
          action={trail ? (
            <div className="achievements-prestige-pill">
              <Sparkles size={16} />
              <span>{trail.summary.prestigeBalance}</span>
              <small>Prestígio</small>
            </div>
          ) : undefined}
        />

        <div className="achievements-view-switch" role="tablist" aria-label="Áreas de conquistas">
          <button type="button" role="tab" aria-selected={view === 'trail'} className={view === 'trail' ? 'is-active' : ''} onClick={() => setView('trail')}>
            <Award size={17} /> Trilha de Conquistas
          </button>
          <button type="button" role="tab" aria-selected={view === 'shop'} className={view === 'shop' ? 'is-active' : ''} onClick={() => setView('shop')}>
            <ShoppingCart size={17} /> Shop
          </button>
        </div>

        {view === 'trail' ? (
          <TrailView trail={trail} loading={loading} error={error} refetch={refetch} />
        ) : (
          <ShopView />
        )}
      </div>
    </PageTransition>
  );
}

function TrailView({ trail, loading, error, refetch }: {
  trail: AchievementTrail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const selected = trail?.nodes.find((node) => node.slug === selectedSlug) ?? trail?.nodes.find((node) => node.status === 'in_progress') ?? trail?.nodes[0] ?? null;
  const categories = useMemo(() => {
    if (!trail) return [];
    return (Object.keys(categoryMeta) as AchievementCategory[]).map((category) => ({
      category,
      nodes: trail.nodes.filter((node) => node.category === category).sort((a, b) => a.tier - b.tier),
    }));
  }, [trail]);

  if (loading && !trail) return <AchievementsSkeleton />;
  if (error || !trail) return <AchievementsError refetch={refetch} />;
  if (trail.nodes.length === 0) return <EmptyCatalog />;

  return (
    <>
      <InfoCard raised className="achievements-summary-card">
        <div className="achievements-summary-copy">
          <span className="achievements-eyebrow"><Sparkles size={14} /> Progresso de maestria</span>
          <h3>{trail.summary.unlocked} de {trail.summary.total} conquistas desbloqueadas</h3>
          <p>Cada caminho avança automaticamente conforme suas atividades reais na plataforma.</p>
        </div>
        <div className="achievements-summary-progress">
          <div className="achievements-progress-ring" style={{ '--progress': `${trail.summary.progressPercent * 3.6}deg` } as CSSProperties}>
            <strong>{trail.summary.progressPercent}%</strong>
            <span>completo</span>
          </div>
          <div className="achievements-summary-stat"><ChevronsUp size={18} /><span>Nível<strong>{trail.summary.level}</strong></span></div>
          <div className="achievements-summary-stat"><Sparkles size={18} /><span>Prestígio total<strong>{trail.summary.prestigeEarned}</strong></span></div>
        </div>
      </InfoCard>

      <InfoCard raised className="achievement-map-card">
        <div className="achievement-map-main scrollbar-thin">
          <div className="achievement-map-heading">
            <div><h3>Seus caminhos</h3><p>Selecione um marco para acompanhar os detalhes.</p></div>
            <span><Target size={15} /> {trail.nodes.filter((node) => node.status === 'in_progress').length} em progresso</span>
          </div>
          <div className="achievement-branches">
            {categories.map(({ category, nodes }) => (
              <AchievementBranch key={category} category={category} nodes={nodes} selectedSlug={selected?.slug ?? null} onSelect={setSelectedSlug} />
            ))}
          </div>
        </div>
        <AchievementDetail node={selected} />
      </InfoCard>
    </>
  );
}

function AchievementBranch({ category, nodes, selectedSlug, onSelect }: {
  category: AchievementCategory;
  nodes: AchievementNode[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  const meta = categoryMeta[category];
  const CategoryIcon = meta.icon;
  return (
    <section className={`achievement-branch branch-${category}`}>
      <div className="achievement-branch-label">
        <span><CategoryIcon size={18} /></span>
        <div><strong>{meta.label}</strong><small>{meta.description}</small></div>
      </div>
      <div className="achievement-node-track">
        {nodes.map((node, index) => {
          return (
            <div className="achievement-node-slot" key={node.slug}>
              {index > 0 && <span className={`achievement-connector ${node.status === 'unlocked' ? 'is-complete' : ''}`} />}
              <button type="button" className={`achievement-node is-${node.status} rarity-${node.rarity} ${selectedSlug === node.slug ? 'is-selected' : ''}`} onClick={() => onSelect(node.slug)} aria-label={node.name}>
                <span className="achievement-node-progress" style={{ '--node-progress': `${node.progressPercent * 3.6}deg` } as CSSProperties} />
                <AchievementIcon icon={node.iconName ?? node.icon} artworkUrl={node.artworkUrl} size={22} />
                {node.status === 'unlocked' && <Check className="achievement-node-check" size={12} strokeWidth={3} />}
              </button>
              <span className="achievement-node-tier">Nível {node.tier}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AchievementDetail({ node }: { node: AchievementNode | null }) {
  if (!node) return null;
  const category = categoryMeta[node.category];
  return (
    <aside className={`achievement-detail rarity-${node.rarity}`}>
      <div className="achievement-detail-top">
        <span className={`achievement-detail-icon is-${node.status}`}><AchievementIcon icon={node.iconName ?? node.icon} artworkUrl={node.artworkUrl} size={28} /></span>
        <span className="achievement-rarity">{rarityLabels[node.rarity]}</span>
      </div>
      <span className="achievement-detail-path">{category.label} · Nível {node.tier}</span>
      <h3>{node.name}</h3>
      <p>{node.description}</p>
      <div className="achievement-detail-progress">
        <div><span>{node.status === 'unlocked' ? 'Concluída' : 'Progresso'}</span><strong>{node.target === null ? '?' : `${node.progress}/${node.target}`}</strong></div>
        <div className="achievement-detail-bar"><span style={{ width: `${node.progressPercent}%` }} /></div>
      </div>
      <div className="achievement-detail-reward">
        <Sparkles size={18} />
        <div><span>Recompensa</span><strong>{node.rewardPrestige ?? '?'} Prestígio</strong></div>
      </div>
      <div className={`achievement-status-message is-${node.status}`}>
        {node.status === 'unlocked' ? <><BadgeCheck size={17} /> Desbloqueada</> : node.status === 'in_progress' ? <><Target size={17} /> Continue avançando</> : <><LockKeyhole size={17} /> Complete o marco anterior</>}
      </div>
    </aside>
  );
}

function extractErrorMessage(error: unknown): string | undefined {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === 'string' ? message : undefined;
}

function ShopView() {
  const { data: shop, loading, error, refetch, changingItem, purchase, equip, unequip } = useAchievementShop();
  const [filter, setFilter] = useState<CosmeticType | 'all'>('all');
  const items = shop?.items.filter((item) => filter === 'all' || item.type === filter) ?? [];

  const handlePurchase = async (item: CosmeticItem) => {
    try {
      await purchase(item.id);
      toast.success(`${item.name} foi adquirido e equipado.`);
    } catch (requestError: unknown) {
      toast.error(extractErrorMessage(requestError) ?? 'Não foi possível adquirir o item.');
    }
  };

  const handleEquip = async (item: CosmeticItem) => {
    try {
      await equip(item.id);
      toast.success(`${item.name} equipado.`);
    } catch (requestError: unknown) {
      toast.error(extractErrorMessage(requestError) ?? 'Não foi possível equipar o item.');
    }
  };

  const handleUnequip = async (item: CosmeticItem) => {
    try {
      await unequip(item.type, item.id);
      toast.success(`${item.name} foi desequipado. Visual padrão restaurado.`);
    } catch (requestError: unknown) {
      toast.error(extractErrorMessage(requestError) ?? 'Não foi possível desequipar o item.');
    }
  };

  if (loading && !shop) return <AchievementsSkeleton />;
  if (error || !shop) return <AchievementsError refetch={refetch} />;

  return (
    <>
      <InfoCard raised className="achievement-shop-hero">
        <div className="achievement-profile-preview">
          <div className={`achievement-preview-backdrop cosmetic-background-host ${shop.equipped.find((item) => item.type === 'background')?.visualValue ?? ''}`}>
            <div className={`achievement-preview-avatar cosmetic-avatar ${shop.equipped.find((item) => item.type === 'frame')?.visualValue ?? ''}`}>GF</div>
            <div><span>Seu perfil</span><strong>{shop.equipped.find((item) => item.type === 'title')?.visualValue ?? 'Participante SecurePlay'}</strong><small>Visualização dos itens equipados</small></div>
          </div>
        </div>
        <div className="achievement-shop-intro">
          <span className="achievements-eyebrow"><Store size={14} /> Shop SecurePlay</span>
          <h3>Transforme sua evolução em identidade</h3>
          <p>Use apenas Prestígio conquistado na plataforma. Os itens são cosméticos e não alteram seu desempenho.</p>
          <div className="achievement-shop-balance"><Sparkles size={20} /><span>Saldo disponível<strong>{shop.prestigeBalance} Prestígio</strong></span></div>
        </div>
      </InfoCard>

      <div className="achievement-shop-toolbar scrollbar-thin">
        <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Todos</button>
        {(Object.keys(cosmeticLabels) as CosmeticType[]).map((type) => <button type="button" key={type} className={filter === type ? 'is-active' : ''} onClick={() => setFilter(type)}>{cosmeticLabels[type]}</button>)}
      </div>

      {items.length === 0 ? <EmptyShop /> : (
        <div className="achievement-shop-grid">
          {items.map((item) => (
            <InfoCard key={item.id} raised className={`achievement-shop-item rarity-${item.rarity} ${item.equipped ? 'is-equipped' : ''}`}>
              <div className={`achievement-cosmetic-preview type-${item.type} ${item.visualValue}`}>
                {item.type === 'frame' && <span>GF</span>}
                {item.type === 'background' && <Sparkles size={28} />}
                {item.type === 'title' && <strong>{item.visualValue}</strong>}
                {item.type === 'badge' && <Medal size={30} />}
                {item.type === 'effect' && <Sparkles size={30} />}
              </div>
              <div className="achievement-shop-item-heading"><span>{cosmeticLabels[item.type]}</span><small>{rarityLabels[item.rarity]}</small></div>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              {!item.requirementMet && <div className="achievement-shop-lock"><LockKeyhole size={14} /> Conquista necessária</div>}
              <div className="achievement-shop-item-footer">
                <strong><Sparkles size={15} /> {item.price}</strong>
                {item.equipped ? <AppButton size="sm" variant="ghost" disabled={changingItem === item.id} icon={changingItem === item.id ? <Loader2 className="animate-spin" size={15} /> : <RotateCcw size={15} />} onClick={() => handleUnequip(item)}>Desequipar</AppButton> : item.owned ? <AppButton size="sm" variant="secondary" disabled={changingItem === item.id} icon={changingItem === item.id ? <Loader2 className="animate-spin" size={15} /> : <Gamepad2 size={15} />} onClick={() => handleEquip(item)}>Equipar</AppButton> : <AppButton size="sm" disabled={!item.requirementMet || !item.affordable || changingItem === item.id} icon={changingItem === item.id ? <Loader2 className="animate-spin" size={15} /> : <ShoppingCart size={15} />} onClick={() => handlePurchase(item)}>Adquirir</AppButton>}
              </div>
            </InfoCard>
          ))}
        </div>
      )}
    </>
  );
}

function AchievementsSkeleton() {
  return <div className="achievements-skeleton"><div /><div /><div /></div>;
}

function AchievementsError({ refetch }: { refetch: () => void }) {
  return <InfoCard raised className="achievements-empty"><CircleHelp size={34} /><h3>Não foi possível carregar as conquistas</h3><p>Tente novamente para sincronizar seu progresso.</p><AppButton size="sm" icon={<RefreshCw size={15} />} onClick={refetch}>Tentar novamente</AppButton></InfoCard>;
}

function EmptyCatalog() {
  return <InfoCard raised className="achievements-empty"><Award size={36} /><h3>Catálogo aguardando configuração</h3><p>As trilhas aparecerão quando o catálogo de conquistas for instalado no banco de dados.</p></InfoCard>;
}

function EmptyShop() {
  return <InfoCard raised className="achievements-empty"><Store size={36} /><h3>Nenhum item nesta categoria</h3><p>Novos cosméticos poderão ser adicionados ao catálogo sem alterar a interface.</p></InfoCard>;
}
