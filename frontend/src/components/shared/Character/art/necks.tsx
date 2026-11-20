import { CREAM, K, outline, type ArtLibrary } from './palette';

/** Pescoço: desenhado em torno do ponto de fixação (0, 0), abaixo do rosto. */
export const NECKS: ArtLibrary = {
  gravata: ({ color }) => (
    <>
      <path d="M-6 9 H6 L13 36 L0 48 L-13 36 Z" fill={color} {...outline(3.5)} />
      <path d="M-8 22 L9 15 M-11 33 L11 25" stroke="rgba(255,255,255,.55)" strokeWidth="3" strokeLinecap="round" />
      <path d="M-9 -2 H9 L6 9 H-6 Z" fill={color} {...outline(3.5)} />
    </>
  ),
  borboleta: ({ color }) => (
    <>
      <path d="M-4 2 L-27 -11 Q-32 3 -27 16 Z" fill={color} {...outline(3.5)} />
      <path d="M4 2 L27 -11 Q32 3 27 16 Z" fill={color} {...outline(3.5)} />
      <path d="M-24 -6 Q-28 3 -24 11 M24 -6 Q28 3 24 11" stroke="rgba(0,0,0,.25)" strokeWidth="3" fill="none" />
      <rect x="-7" y="-5" width="14" height="14" rx="4" fill={color} stroke={K} strokeWidth="3.5" />
    </>
  ),
  cachecol: ({ uid, color }) => (
    <>
      <defs>
        <pattern id={`${uid}-stp`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(70)">
          <rect width="14" height="14" fill={color} />
          <rect width="6" height="14" fill={CREAM} />
        </pattern>
      </defs>
      <path d="M18 10 L32 44 L19 49 L9 14 Z" fill={`url(#${uid}-stp)`} {...outline(4)} />
      <path d="M21 49 L20 57 M26 47 L26 55 M31 45 L33 52" stroke={K} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-56 -8 Q0 14 56 -8 L54 8 Q0 30 -54 8 Z" fill={`url(#${uid}-stp)`} {...outline(4)} />
      <path d="M-40 6 Q0 22 40 6" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="5" />
    </>
  ),
  lenco: ({ uid, color }) => (
    <>
      <defs>
        <pattern id={`${uid}-chk`} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={color} />
          <rect width="6" height="6" fill={CREAM} opacity=".85" />
          <rect x="6" y="6" width="6" height="6" fill={CREAM} opacity=".85" />
        </pattern>
      </defs>
      <path d="M-44 -6 Q0 4 44 -6 L6 36 Q0 40 -6 36 Z" fill={`url(#${uid}-chk)`} {...outline(4)} />
      <path d="M-8 -6 Q0 -2 8 -6 L6 6 Q0 8 -6 6 Z" fill={color} {...outline(3)} />
    </>
  ),
};
