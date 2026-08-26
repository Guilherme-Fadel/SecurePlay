// Catalogo de jogos/desafios da secao Desafios.
// Metadados agora vem da API (GET /arcade/games). Esta interface permanece para tipagem do carrossel.

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
  gameType?: string; // tipo do jogo (quiz, phishing, data_classify, client_only)
}
