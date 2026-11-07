import quizRelampago from '@/assets/static/games/quiz-relampago.webp';
import cacaPhishing from '@/assets/static/games/caca-phishing.webp';
import classificacaoDados from '@/assets/static/games/classificacao-dados.webp';
import termotech from '@/assets/static/games/termotech.webp';

export const CONTACT_EMAIL = 'contato@secureplay.com';

/** Âncoras da landing: a jornada (estudo) vem antes das missões (prática). */
export const LANDING_NAV = [
  { href: '#jornada', label: 'A jornada' },
  { href: '#jogos', label: 'Missões' },
  { href: '#escolas', label: 'Para escolas' },
] as const;

export interface LandingGame {
  slug: string;
  title: string;
  summary: string;
  description: string;
  caption: string;
  xp: number;
  image: string;
  /** Gradiente do cenário da carta (cores da paleta). */
  scene: readonly [string, string];
  notesTitle: string;
  notes: readonly string[];
}

/**
 * Os quatro jogos com os nomes e o XP base do produto (seeds do backend:
 * 100, 120, 110 e 120). As pistas e categorias são as que os jogos usam.
 */
export const LANDING_GAMES: readonly [LandingGame, LandingGame, LandingGame, LandingGame] = [
  {
    slug: 'quiz-relampago',
    title: 'Quiz Relâmpago',
    summary: 'Revisa o que foi visto nas aulas, contra o relógio.',
    description: 'Responda perguntas rápidas antes que o tempo acabe.',
    caption: 'Desafio rápido',
    xp: 100,
    image: quizRelampago,
    scene: ['#FF9440', '#FF7101'],
    notesTitle: 'Como funciona a rodada',
    notes: ['Perguntas das aulas', 'Contra o relógio', 'Revisão rápida'],
  },
  {
    slug: 'caca-phishing',
    title: 'Detetives de Mensagens',
    summary: 'Reconhece golpes em recados e mensagens.',
    description: 'Leia os recados e descubra quais são seguros.',
    caption: 'Correio misterioso',
    xp: 120,
    image: cacaPhishing,
    scene: ['#FF5A3D', '#F51300'],
    notesTitle: 'Pistas que a criança aprende a notar',
    notes: ['Endereço estranho', 'Pede pressa', 'Anexo surpresa', 'Prêmio fácil'],
  },
  {
    slug: 'classificacao-dados',
    title: 'Escudos dos Segredos',
    summary: 'Decide quem pode conhecer cada informação.',
    description: 'Escolha o escudo certo para proteger cada informação.',
    caption: 'Arquivo do castelo',
    xp: 110,
    image: classificacaoDados,
    scene: ['#FFB8D9', '#FE96C7'],
    notesTitle: 'Escudos que a criança aprende a escolher',
    notes: ['Público', 'Interno', 'Confidencial', 'Secreto'],
  },
  {
    slug: 'termotech',
    title: 'Palavra Secreta',
    summary: 'Amplia o vocabulário de tecnologia.',
    description: 'Use as pistas para descobrir a palavra de cinco letras.',
    caption: 'Dicionário digital',
    xp: 120,
    image: termotech,
    scene: ['#5B8BF0', '#2662E7'],
    notesTitle: 'Como funciona a rodada',
    notes: ['Palavra de cinco letras', 'Até seis tentativas', 'Vocabulário de tecnologia'],
  },
];
