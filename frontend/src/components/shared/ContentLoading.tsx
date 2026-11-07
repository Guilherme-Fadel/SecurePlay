import '@/styles/content-loading.css';

type LoadingVariant = 'ranking' | 'module' | 'reader' | 'trail';
const labels: Record<LoadingVariant, string> = {
  ranking: 'Carregando ranking', module: 'Carregando módulo',
  reader: 'Carregando aula', trail: 'Carregando roteiro de aulas',
};

/** Silhuetas sem dados fictícios ou controles ativos durante a espera. */
export function ContentLoading({ variant }: { variant: LoadingVariant }) {
  return <div className={`content-loading content-loading--${variant}`} role="status" aria-label={labels[variant]} aria-busy="true">
    <div className="content-loading-visual" aria-hidden="true">
      {variant === 'ranking' ? <div className="content-loading-rank">
        <div className="content-loading-rank-stage">{[2, 1, 3].map(step => <div key={step} className={`is-step-${step}`}><i /><span /><b /></div>)}</div>
        <div className="content-loading-rank-side"><span /><div className="content-loading-rows">{[0, 1, 2].map(index => <div key={index}><i /><span /></div>)}</div></div>
        <div className="content-loading-rank-list">{[0, 1, 2, 3].map(index => <div key={index}><i /><span /></div>)}</div>
      </div> : variant === 'trail' ? <div className="content-loading-rows">{[0, 1, 2].map(index => <div key={index}><i /><span /></div>)}</div>
      : variant === 'module' ? <>
        <div className="content-loading-module-hero"><i /><div><span /><span /><span /></div></div>
        <div className="content-loading-module-bar">{[3, 2, 4].map((grow, index) => <i key={index} style={{ flexGrow: grow }} />)}</div>
        {[0, 1].map(index => <div key={index} className="content-loading-module-chapter"><span /><div className="content-loading-rows">{[0, 1].map(row => <div key={row}><i /><span /></div>)}</div></div>)}
      </> : <>
        <div className="content-loading-book-side"><i /><span /><span /><span /></div>
        <div className="content-loading-book-side"><span /><span /><span /><span /><span /></div>
      </>}
    </div>
  </div>;
}
