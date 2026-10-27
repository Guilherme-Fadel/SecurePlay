import type { CSSProperties } from 'react';
import { missionRoomAssets } from '@/lib/staticArtwork';
import '@/styles/content-loading.css';

type LoadingVariant = 'ranking' | 'book' | 'reader' | 'trail';
const labels: Record<LoadingVariant, string> = {
  ranking: 'Carregando ranking', book: 'Carregando módulo',
  reader: 'Carregando aula', trail: 'Carregando roteiro de aulas',
};

/** Silhuetas sem dados fictícios ou controles ativos durante a espera. */
export function ContentLoading({ variant }: { variant: LoadingVariant }) {
  return <div className={`content-loading content-loading--${variant}`} role="status" aria-label={labels[variant]} aria-busy="true">
    <div className="content-loading-visual" aria-hidden="true" style={{ '--loading-book-frame': `url(${missionRoomAssets['module-book-frame-clean']})` } as CSSProperties}>
      {variant === 'ranking' ? <>
        <div className="content-loading-podium">{[0, 1, 2].map(index => <div key={index}><i /><span /><span /></div>)}</div>
        <div className="content-loading-rows">{[0, 1, 2, 3].map(index => <div key={index}><i /><span /><span /></div>)}</div>
      </> : variant === 'trail' ? <div className="content-loading-rows">{[0, 1, 2].map(index => <div key={index}><i /><span /></div>)}</div> : <>
        <div className="content-loading-book-side"><i /><span /><span /><span /></div>
        <div className="content-loading-book-side"><span /><span /><span /><span /><span /></div>
      </>}
    </div>
  </div>;
}
