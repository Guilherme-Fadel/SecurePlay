import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { DigitalKeyIcon } from '@/components/ui/visuals/DigitalKeyIcon';
import { AlbumArt } from './AlbumSticker';
import {
  RARITY_LABELS,
  progressText,
  rewardText,
  statusText,
  stickerNumber,
  stickerStateClass,
  type Album,
  type AlbumDestination,
  type AlbumSticker,
} from './albumModel';

/**
 * Detalhe da figurinha em `<dialog>` modal: gaveta lateral no desktop e bottom
 * sheet abaixo de 760 px (só CSS). `showModal` deixa o resto da página inerte
 * (foco preso), Esc dispara `close` e quem abriu devolve o foco à figurinha.
 */
export function AlbumDetail({ sticker, album, destination, onClose, onGo }: {
  sticker: AlbumSticker;
  album: Album;
  destination: AlbumDestination | null;
  onClose: () => void;
  onGo: (destination: AlbumDestination) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => dialogRef.current?.close();
  const { node } = sticker;
  const progress = progressText(sticker);
  const stateClass = stickerStateClass(sticker);

  return (
    <dialog
      ref={dialogRef}
      className="al-dialog"
      aria-labelledby="al-detail-title"
      aria-describedby="al-detail-description"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="al-detail">
        <button type="button" className="al-detail-close" aria-label="Fechar figurinha" onClick={close}>
          <X size={20} aria-hidden="true" />
        </button>
        <span className="al-detail-handle" aria-hidden="true" />
        <div className={`al-detail-art ${stateClass}`}>
          <AlbumArt sticker={sticker} size={160} />
        </div>
        <div className="al-detail-top">
          <span className="al-meta">{stickerNumber(sticker.number)} · {sticker.collectionLabel}</span>
          <span className={`al-rarity is-${node.rarity}`}>{RARITY_LABELS[node.rarity] ?? node.rarity}</span>
        </div>
        <h2 id="al-detail-title" className="al-display al-detail-title">{node.name}</h2>
        <p id="al-detail-description" className="al-detail-text">{node.description}</p>
        {progress && (
          <div className="al-detail-progress">
            <div className="al-detail-progress-head"><span>Progresso</span><span>{progress}</span></div>
            <div className="al-bar al-bar--big" role="progressbar" aria-label="Progresso da figurinha" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sticker.percent}>
              <span style={{ width: `${sticker.percent}%` }} />
            </div>
          </div>
        )}
        <p className={`al-detail-status ${stateClass}`}>{statusText(sticker, album)}</p>
        <p className="al-detail-reward"><DigitalKeyIcon size={28} />{rewardText(sticker)}</p>
        {destination && (
          <AppButton
            variant="chunky"
            tone="blue"
            className="al-detail-go"
            onClick={() => { close(); onGo(destination); }}
          >
            {destination.label}
          </AppButton>
        )}
      </div>
    </dialog>
  );
}
