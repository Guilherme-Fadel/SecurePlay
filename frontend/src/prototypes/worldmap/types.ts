// Tipos do protótipo do mapa de treinamento.
// Navegacao em dois niveis: Mapa Global (biomas) -> Bioma (fases).
// Estruturado para futuramente vir da API Node (GET /biomes, GET /biomes/:id/levels).

export type LevelStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED';

export interface Position {
  // posicao percentual (0-100) relativa ao container da tela.
  // Usar % mantem os nodes alinhados ao fundo em qualquer resolucao.
  x: number;
  y: number;
}

export interface Level {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  status: LevelStatus;
  position: Position;
}

export interface Biome {
  id: string;
  name: string;
  subtitle: string;
  // cor tematica do bioma (usada nos placeholders e destaques).
  color: string;
  accent: string;
  // posicao do hotspot no mapa global (em %). Usada como fallback e para
  // ancorar o rotulo do bioma quando ha regiao poligonal.
  hotspot: Position;
  // contorno da regiao clicavel do bioma no mapa global (poligono em %).
  // Vazio/ausente = sem regiao (cai no comportamento antigo de hotspot).
  region?: Position[];
  levels: Level[];
}
