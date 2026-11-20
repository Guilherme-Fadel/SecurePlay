import { useId } from 'react';
import type { BrandCharacterExpression } from '../BrandCharacter';
import { FaceBase } from './art/faceBase';
import { INK } from './art/palette';
import { CharacterBody, DEFAULT_PIECE_COLOR, LibraryArt, librarySkin, skinBodyColor } from './characterArt';
import {
  ARTBOARD, CHARACTER_VIEWBOX, SLOT_ANCHOR, characterLayers, isSafeArtUrl, pieceTransform,
  type CharacterLayer, type CharacterLook, type CharacterVariant,
} from './characterLook';
import './character.css';

export interface CharacterAvatarProps {
  look: CharacterLook;
  /** Cor do corpo; algumas skins impõem a própria. */
  color: string;
  variant: CharacterVariant;
  expression?: BrandCharacterExpression;
  /** Texto para leitor de tela; sem ele, o personagem é decorativo. */
  label?: string;
  className?: string;
}

interface LayerProps { layer: CharacterLayer; uid: string; eye: string }

/** Uma peça: imagem enviada cobrindo a prancheta ou arte da biblioteca; sem nenhuma, nada. */
function LookLayer({ layer, uid, eye }: LayerProps) {
  const { slot, piece } = layer;
  const transform = pieceTransform(slot, piece.adjust) || undefined;
  if (isSafeArtUrl(piece.artUrl)) {
    return (
      <g transform={transform}>
        <image href={piece.artUrl} {...ARTBOARD} preserveAspectRatio="none" />
      </g>
    );
  }
  const anchored = slot === 'head' || slot === 'face' || slot === 'neck';
  const [ax, ay] = SLOT_ANCHOR[slot];
  return (
    <g transform={transform}>
      <g transform={anchored ? `translate(${ax} ${ay})` : undefined}>
        <LibraryArt slot={slot} visualValue={piece.visualValue} uid={uid} color={piece.color ?? DEFAULT_PIECE_COLOR} eye={eye} />
      </g>
    </g>
  );
}

/** Personagem montável em camadas: corpo e rosto da marca, skin, rosto, pescoço, cabeça e efeito. */
export function CharacterAvatar({ look, color, variant, expression = 'open', label, className }: CharacterAvatarProps) {
  const uid = `pv${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const layers = characterLayers(look, variant);
  const skinLayer = layers.find((layer) => layer.slot === 'skin');
  const uploadedSkin = skinLayer && isSafeArtUrl(skinLayer.piece.artUrl) ? skinLayer : undefined;
  const skin = skinLayer && !uploadedSkin ? librarySkin(skinLayer.piece.visualValue) : undefined;
  const body = skinBodyColor(skin, color);
  const eye = skin === 'estrelado' ? INK : body;
  const draw = (layer: CharacterLayer) => <LookLayer key={layer.slot} layer={layer} uid={uid} eye={eye} />;
  const classes = ['character-avatar', `character-avatar--${variant}`, className].filter(Boolean).join(' ');

  return (
    <svg
      className={classes}
      viewBox={CHARACTER_VIEWBOX[variant]}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {layers.filter((layer) => layer.position === 'back').map(draw)}
      <CharacterBody uid={uid} skin={skin} body={body} compact={variant === 'compact'} />
      {uploadedSkin && draw(uploadedSkin)}
      <FaceBase color={eye} expression={expression} />
      {layers.filter((layer) => layer.position === 'body' && layer.slot !== 'skin').map(draw)}
      {layers.filter((layer) => layer.position === 'front').map(draw)}
    </svg>
  );
}
