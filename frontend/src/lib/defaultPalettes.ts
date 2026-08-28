import { EmpresaPaleta } from '@/services/me';

export interface DefaultPalette {
  name: string;
  paleta: EmpresaPaleta;
}

export const DEFAULT_PALETTES: DefaultPalette[] = [
  {
    name: 'SecurePlay (Padrão)',
    paleta: {
      primary: '#6935F2',
      secondary: '#00C2CB',
      accent: '#FFC82E',
      text_primary: '#ECECEC',
      text_secondary: '#94a3b8',
    },
  },
  {
    name: 'Oceano',
    paleta: {
      primary: '#0066CC',
      secondary: '#00B4D8',
      accent: '#48CAE4',
      text_primary: '#ECECEC',
      text_secondary: '#94a3b8',
    },
  },
  {
    name: 'Floresta',
    paleta: {
      primary: '#2D6A4F',
      secondary: '#40916C',
      accent: '#95D5B2',
      text_primary: '#ECECEC',
      text_secondary: '#94a3b8',
    },
  },
  {
    name: 'Vulcão',
    paleta: {
      primary: '#D62828',
      secondary: '#F77F00',
      accent: '#FCBF49',
      text_primary: '#ECECEC',
      text_secondary: '#94a3b8',
    },
  },
  {
    name: 'Noturno',
    paleta: {
      primary: '#7B2CBF',
      secondary: '#9D4EDD',
      accent: '#C77DFF',
      text_primary: '#ECECEC',
      text_secondary: '#94a3b8',
    },
  },
  {
    name: 'Corporativo',
    paleta: {
      primary: '#1B4332',
      secondary: '#2B6CB0',
      accent: '#63B3ED',
      text_primary: '#ECECEC',
      text_secondary: '#94a3b8',
    },
  },
  {
    name: 'Sunrise',
    paleta: {
      primary: '#E63946',
      secondary: '#457B9D',
      accent: '#F4A261',
      text_primary: '#ECECEC',
      text_secondary: '#94a3b8',
    },
  },
  {
    name: 'Cyber',
    paleta: {
      primary: '#00FF87',
      secondary: '#0A192F',
      accent: '#64FFDA',
      text_primary: '#1E293B',
      text_secondary: '#475569',
    },
  },
];
