const SWAG_X = [0, 120, 240, 360, 480] as const;
const TASSEL_X = [120, 240, 360, 480] as const;

/** Sanca fixa no alto do palco: faixa de veludo, friso dourado, cinco festões e quatro borlas. */
export function HallValance({ uid }: { uid: string }) {
  const swag = `${uid}-swag`;
  const tassel = `${uid}-tassel`;
  return (
    <svg className="hall-layer hall-valance" viewBox="0 0 600 640" aria-hidden="true" focusable="false">
      <defs>
        <g id={swag}>
          <path className="hall-swag-cord" d="M3 42 C20 102 100 102 117 42" transform="translate(0 5)" />
          <path className="hall-swag-dash" d="M3 42 C20 102 100 102 117 42" transform="translate(0 5)" />
          <path className="hall-ink" d="M0 38 C18 102 102 102 120 38 Z" fill={`url(#${uid}-velv)`} />
          <path className="hall-swag-fold" d="M12 44 C34 80 86 80 108 44" strokeWidth="4" />
          <path className="hall-swag-fold" d="M26 42 C44 62 76 62 94 42" strokeWidth="3" />
          <path className="hall-swag-shine" d="M12 44 C34 80 86 80 108 44" transform="translate(0 -5)" />
          <path className="hall-swag-trim" d="M3 42 C20 102 100 102 117 42" transform="translate(0 1)" />
        </g>
        <g id={tassel}>
          <path className="hall-tassel-cord" d="M0 36 V48" />
          <path className="hall-tassel-gold" d="M0 36 V48" />
          <path className="hall-ink is-hair" d="M-6 58 Q-9 72 -10 80 Q0 85 10 80 Q9 72 6 58 Z" fill={`url(#${uid}-goldh)`} />
          <path className="hall-tassel-fringe" d="M-2 61 L-4 79 M2 61 L4 79" />
          <circle className="hall-ink is-hair" cx="0" cy="53" r="5.5" fill={`url(#${uid}-goldr)`} />
        </g>
      </defs>
      <rect className="hall-ink" x="-4" y="-4" width="608" height="40" fill={`url(#${uid}-velv)`} />
      <rect className="hall-ink is-fine" x="-4" y="30" width="608" height="9" fill={`url(#${uid}-goldv)`} />
      {SWAG_X.map((x) => <use key={x} href={`#${swag}`} x={x} y="0" />)}
      {TASSEL_X.map((x) => <use key={x} href={`#${tassel}`} x={x} y="0" />)}
    </svg>
  );
}
