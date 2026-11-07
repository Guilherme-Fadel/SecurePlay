import type { ReactNode } from 'react';

/** Ícones do trilho, desenhados no canvas validado (traço 2,2 sobre grade 24). */
function RailSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function RailHomeIcon() {
  return (
    <RailSvg>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
      <path d="M10 19.5v-5h4v5" />
    </RailSvg>
  );
}

export function RailLearnIcon() {
  return (
    <RailSvg>
      <path d="M2.5 5.5c3-1.2 6.2-1.1 9.5.8v13c-3.3-1.9-6.5-2-9.5-.8z" />
      <path d="M21.5 5.5c-3-1.2-6.2-1.1-9.5.8v13c3.3-1.9 6.5-2 9.5-.8z" />
    </RailSvg>
  );
}

export function RailGamesIcon() {
  return (
    <RailSvg>
      <path d="M6.5 7.5h11a4.5 4.5 0 0 1 4.4 5.4l-.8 4a2.4 2.4 0 0 1-4.1 1.1L14.6 15.5H9.4L7 18a2.4 2.4 0 0 1-4.1-1.1l-.8-4a4.5 4.5 0 0 1 4.4-5.4z" />
      <path d="M8 10v3.4M6.3 11.7h3.4" />
      <path d="M15.4 11h.01M17.6 13h.01" />
    </RailSvg>
  );
}

export function RailRankingIcon() {
  return (
    <RailSvg>
      <rect x="9" y="6.5" width="6" height="13.5" rx="1.2" />
      <rect x="2.5" y="11" width="6.5" height="9" rx="1.2" />
      <rect x="15" y="13.5" width="6.5" height="6.5" rx="1.2" />
    </RailSvg>
  );
}

export function RailAwardsIcon() {
  return (
    <RailSvg>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M8.6 13.4 7 21l5-2.6 5 2.6-1.6-7.6" />
    </RailSvg>
  );
}
