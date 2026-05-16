import { createContext, useContext } from 'react';
import type { Section } from '@/pages/Home';

interface SectionContextProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  setLoading: (key: string, loading: boolean) => void;
}

const SectionContext = createContext<SectionContextProps | undefined>(undefined);

export function useSectionContext() {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error('useSectionContext must be used within a SectionProvider');
  }
  return context;
}

export { SectionContext };
