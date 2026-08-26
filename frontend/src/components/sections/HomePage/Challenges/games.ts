// Catalogo de jogos/desafios da secao Desafios.
// Mockado por enquanto. Futuramente pode vir de GET /challenges na API Node.

export type GameStatus = 'AVAILABLE' | 'SOON';

export interface GameCardData {
  id: string;
  title: string;
  description: string;
  image: string; // thumbnail (arquivo em frontend/public/...)
  xp: number;
  status: GameStatus;
  tag: string;
  // cor tematica usada no botao e detalhes (estilo Duolingo).
  color: string;
  colorDark: string; // tom mais escuro para a "sombra solida" do botao/card
}

export const GAMES: GameCardData[] = [
  {
    id: 'worldmap',
    title: 'Mapa de Treinamento',
    description: 'Explore biomas e complete fases de seguranca pelo mundo.',
    image: '/prototypes/worldmap/global-map.png',
    xp: 500,
    status: 'AVAILABLE',
    tag: 'Aventura',
    color: '#8e2de2',
    colorDark: '#6a1fb0',
  },
  {
    id: 'termotech',
    title: 'Termo Tech',
    description: 'Decifre a palavra de tecnologia do dia em 6 tentativas.',
    // TROCAR: gere a arte no ChatGPT e salve neste caminho.
    image: '/challenges/termotech.png',
    xp: 120,
    status: 'AVAILABLE',
    tag: 'Puzzle diario',
    color: '#1a9fd8',
    colorDark: '#1478a3',
  },
];
