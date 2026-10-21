import { useSyncExternalStore } from 'react';

const query = '(min-width: 1101px) and (max-height: 820px)';
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

/** Matches notebook-ui.css, including browser resize and zoom. */
export function useNotebookLayout() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
