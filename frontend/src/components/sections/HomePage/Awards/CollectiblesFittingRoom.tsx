import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2, LockKeyhole, RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { Avatar } from '@/components/ui/visuals/Avatar';
import { DigitalKeyIcon } from '@/components/ui/visuals/DigitalKeyIcon';
import { AchievementIcon } from '@/components/ui/visuals/AchievementIcon';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { cn } from '@/lib/utils';
import type { CurrentUser } from '@/services/me';
import type { CosmeticItem } from '@/services/achievements';
import { CosmeticArt } from './CollectiblesArt';
import {
  COSMETIC_TYPES,
  itemState,
  keySegments,
  keysLabel,
  missingLabel,
  rarityLabel,
  typeLabel,
  type Look,
  type RequirementInfo,
} from './collectiblesModel';

export interface Feedback {
  kind: 'success' | 'error';
  text: string;
}

interface FittingRoomProps {
  user: CurrentUser | null;
  level: number | null;
  look: Look;
  selected: CosmeticItem | null;
  requirement: RequirementInfo | null;
  balance: number;
  changingItem: number | null;
  feedback: Feedback | null;
  onBuy: (item: CosmeticItem) => void;
  onEquip: (item: CosmeticItem) => void;
  onUnequip: (item: CosmeticItem) => void;
  onClear: () => void;
  onShowEarn: () => void;
}

/**
 * Provador "Assim a turma vê você". A moldura e o fundo usam o mesmo modelo do
 * avatar do trilho (UserMenu): `cosmetic-avatar` + visualValue da borda e
 * `cosmetic-background-host` + visualValue do fundo (styles/cosmetics.css).
 */
export function CollectiblesFittingRoom(props: FittingRoomProps) {
  const { look, selected, feedback } = props;
  return (
    <section className="cole-stage" aria-labelledby="cole-stage-title">
      <span className="cole-eyebrow">Provador</span>
      <h2 id="cole-stage-title" className="cole-display cole-stage-title">Assim a turma vê você</h2>
      <ProfileCard user={props.user} level={props.level} look={look} />
      <WornList look={look} />
      <p className="sr-only" aria-live="polite">{selected ? `Prévia no provador: ${selected.name}.` : ''}</p>
      <div className="cole-act">
        {/* Regiões vivas sempre montadas: o texto muda dentro delas e é anunciado. */}
        <p className="cole-feedback" role="status">{feedback?.kind === 'success' ? feedback.text : ''}</p>
        <p className="cole-feedback is-error" role="alert">{feedback?.kind === 'error' ? feedback.text : ''}</p>
        {selected ? <ItemPanel {...props} selected={selected} /> : <EmptyPanel balance={props.balance} onShowEarn={props.onShowEarn} />}
      </div>
    </section>
  );
}

function WornList({ look }: { look: Look }) {
  return (
    <ul className="cole-worn" aria-label="O que aparece no seu perfil">
      {COSMETIC_TYPES.map((type) => {
        const piece = look[type];
        return (
          <li key={type} className={cn('cole-worn-item', !piece && 'is-none', piece?.preview && 'is-trying')}>
            <small>{typeLabel[type]}</small>
            <b>{piece ? piece.name : 'Nenhum'}</b>
            {piece?.preview && <span className="sr-only"> (prévia)</span>}
          </li>
        );
      })}
    </ul>
  );
}

function ProfileCard({ user, level, look }: { user: CurrentUser | null; level: number | null; look: Look }) {
  const name = user?.nickname || user?.name || 'Você';
  return (
    <div className={cn('cole-card cosmetic-background-host', look.background?.visualValue, look.effect && 'has-effect')}>
      <ProfileAvatar user={user} look={look} />
      <div className="cole-card-id">
        <strong className="cole-display cole-card-name">{name}</strong>
        {look.title && <span className="cole-card-title">{look.title.visualValue}</span>}
        {level !== null && <span className="cole-card-meta">Nível {level}</span>}
      </div>
      {look.badge && <CosmeticArt slug={look.badge.slug} name={look.badge.name} size={64} alt={`Emblema ${look.badge.name}`} className="cole-card-badge" />}
    </div>
  );
}

function ProfileAvatar({ user, look }: { user: CurrentUser | null; look: Look }) {
  const reduceMotion = useReducedMotion() === true;
  const changeKey = COSMETIC_TYPES.map((type) => look[type]?.slug ?? '-').join('|');
  return (
    <motion.div
      key={changeKey}
      className="cole-card-avatar"
      initial={reduceMotion ? false : { scale: 0.94, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {look.effect && <CosmeticArt slug={look.effect.slug} name={look.effect.name} size={160} className="cole-card-effect" />}
      <Avatar
        name={user?.name}
        nickname={user?.nickname}
        imageUrl={user?.profile_image_url}
        className={cn('cole-avatar cosmetic-avatar', look.frame?.visualValue)}
      />
    </motion.div>
  );
}

function EmptyPanel({ balance, onShowEarn }: { balance: number; onShowEarn: () => void }) {
  return (
    <div className="cole-act-empty">
      <span className="cole-act-character"><BrandCharacter expression="curious" /></span>
      <div>
        <p>Toque num item para experimentar no seu perfil. Experimentar não gasta chaves.</p>
        {balance === 0 && (
          <p className="cole-act-zero">
            Você ainda não tem Chaves Digitais.{' '}
            <button type="button" className="cole-link" onClick={onShowEarn}>Veja como ganhar as primeiras</button>
          </p>
        )}
      </div>
    </div>
  );
}

type PanelProps = FittingRoomProps & { selected: CosmeticItem };

function ItemPanel(props: PanelProps) {
  const { selected, changingItem } = props;
  const state = itemState(selected);
  const busy = changingItem === selected.id;
  const body: Record<typeof state, ReactNode> = {
    buy: <BuyBody {...props} busy={busy} />,
    save: <SaveBody {...props} />,
    lock: <LockBody {...props} />,
    own: <OwnBody {...props} busy={busy} />,
    equipped: <EquippedBody {...props} busy={busy} />,
  };

  return (
    <div className="cole-act-item" aria-busy={busy || undefined}>
      <div className="cole-act-head">
        <span className={cn('cole-tile', state === 'lock' && 'is-locked')}><CosmeticArt slug={selected.slug} name={selected.name} size={64} /></span>
        <div>
          <span className="cole-eyebrow">{state === 'equipped' ? 'No seu perfil' : 'Experimentando'}</span>
          <strong>{selected.name}</strong>
          <small>{typeLabel[selected.type]} · {rarityLabel[selected.rarity]}</small>
        </div>
      </div>
      {selected.description && <p className="cole-act-desc">{selected.description}</p>}
      {body[state]}
    </div>
  );
}

function BackButton({ onClear }: { onClear: () => void }) {
  return (
    <AppButton variant="chunky" tone="ghost" size="sm" onClick={onClear} icon={<RotateCcw size={16} aria-hidden="true" />}>
      Voltar ao equipado
    </AppButton>
  );
}

const spinner = <Loader2 className="animate-spin" size={18} aria-hidden="true" />;

function BuyBody({ selected, balance, changingItem, busy, onBuy, onClear }: PanelProps & { busy: boolean }) {
  return (
    <>
      <p className="cole-cost">Custa {keysLabel(selected.price)} · você tem {balance}</p>
      <div className="cole-acts">
        <AppButton variant="chunky" tone="yellow" disabled={changingItem !== null} icon={busy ? spinner : <DigitalKeyIcon size={22} />} onClick={() => onBuy(selected)}>
          {busy ? 'Adquirindo…' : `Adquirir por ${selected.price}`}
        </AppButton>
        <BackButton onClear={onClear} />
      </div>
      <p className="cole-note">Ao adquirir, o item já fica equipado no seu perfil.</p>
    </>
  );
}

function SaveBody({ selected, balance, onClear, onShowEarn }: PanelProps) {
  const missing = missingLabel(selected.price, balance);
  return (
    <>
      <div className="cole-cost">
        <span id="cole-save-hint">{missing} · custa {keysLabel(selected.price)}, você tem {balance}</span>
        <span className="cole-keybar" aria-hidden="true">
          {keySegments(selected.price, balance).map((lit, index) => <span key={index} className={lit ? 'is-on' : undefined} />)}
        </span>
      </div>
      <div className="cole-acts">
        <AppButton variant="chunky" tone="yellow" disabled aria-describedby="cole-save-hint" icon={<DigitalKeyIcon size={22} />}>
          {missing}
        </AppButton>
        <BackButton onClear={onClear} />
      </div>
      <button type="button" className="cole-link" onClick={onShowEarn}>Como ganhar chaves</button>
    </>
  );
}

function LockBody({ selected, requirement, onClear }: PanelProps) {
  const node = requirement?.node;
  return (
    <>
      <div className="cole-req">
        <span className="cole-req-art" aria-hidden="true">
          {node ? <AchievementIcon slug={node.slug} icon={node.iconName ?? node.icon} artworkUrl={node.artworkUrl} size={44} /> : <LockKeyhole size={24} />}
        </span>
        <div>
          <strong>Precisa da conquista {requirement?.name ?? 'indicada no catálogo'}</strong>
          <small>{requirement?.hint ? `${requirement.hint} ` : ''}Depois custa {keysLabel(selected.price)}.</small>
        </div>
      </div>
      <div className="cole-acts"><BackButton onClear={onClear} /></div>
    </>
  );
}

function OwnBody({ selected, changingItem, busy, onEquip, onClear }: PanelProps & { busy: boolean }) {
  return (
    <div className="cole-acts">
      <AppButton variant="chunky" tone="blue" disabled={changingItem !== null} icon={busy ? spinner : undefined} onClick={() => onEquip(selected)}>
        {busy ? 'Equipando…' : 'Equipar'}
      </AppButton>
      <BackButton onClear={onClear} />
    </div>
  );
}

function EquippedBody({ selected, changingItem, busy, onUnequip }: PanelProps & { busy: boolean }) {
  return (
    <div className="cole-acts">
      <span className="cole-pill cole-pill--equipped">Equipado</span>
      <AppButton variant="chunky" tone="ghost" size="sm" disabled={changingItem !== null} icon={busy ? spinner : undefined} onClick={() => onUnequip(selected)}>
        {busy ? 'Desequipando…' : 'Desequipar'}
      </AppButton>
    </div>
  );
}
