import { createContext, useContext } from 'react';
import type { Section } from '@/pages/Home';

interface SectionContextProps {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  navigateToSection: (section: Section) => void;
  previousSection: Section | null;
  goBack: () => void;
  setLoading: (key: string, loading: boolean) => void;
  registerBootstrap: (key: string) => void;
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
