import { AchievementIcon } from '@/components/ui/visuals/AchievementIcon';
import {
  progressText,
  remainingText,
  stickerAria,
  stickerLabel,
  stickerNumber,
  stickerStateClass,
  type AlbumSticker,
} from './albumModel';

/** Arte da figurinha. A secreta mascarada mostra só "?", sem arte nem ícone. */
export function AlbumArt({ sticker, size = 96 }: { sticker: AlbumSticker; size?: number }) {
  if (sticker.state === 'secret') return <span className="al-q" aria-hidden="true">?</span>;
  const { node } = sticker;
  return (
    <span className="al-art" aria-hidden="true">
      <AchievementIcon slug={node.slug} icon={node.iconName || node.icon} artworkUrl={node.artworkUrl} size={size} />
    </span>
  );
}

/** Espaço da figurinha na página da coleção. */
export function AlbumSlot({ sticker, onOpen }: {
  sticker: AlbumSticker;
  onOpen: (sticker: AlbumSticker, trigger: HTMLButtonElement) => void;
}) {
  const progress = progressText(sticker);
  return (
    <li className={`al-slot ${stickerStateClass(sticker)}`}>
      <button
        type="button"
        className="al-slot-button"
        aria-label={stickerAria(sticker)}
        aria-haspopup="dialog"
        onClick={(event) => onOpen(sticker, event.currentTarget)}
      >
        <span className="al-box">
          <span className="al-num">{stickerNumber(sticker.number)}</span>
          <AlbumArt sticker={sticker} />
        </span>
        <span className="al-slot-name">{stickerLabel(sticker)}</span>
        {sticker.state === 'next' && progress && (
          <>
            <span className="al-bar al-bar--slot" aria-hidden="true"><span style={{ width: `${sticker.percent}%` }} /></span>
            <span className="al-slot-left">{remainingText(sticker.remaining)}</span>
          </>
        )}
      </button>
    </li>
  );
}
