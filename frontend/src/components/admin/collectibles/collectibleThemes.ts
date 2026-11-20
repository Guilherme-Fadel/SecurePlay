import { CARD_THEMES, STAGE_THEMES } from '@/components/sections/HomePage/Awards/characterModel';
import type { CosmeticType } from '@/services/achievements';

/** Temas da biblioteca que o palco e o card já sabem desenhar; o `visualValue` salvo é o nome do tema. */
const THEME_LABELS: Readonly<Record<string, string>> = {
  palco: 'Palco', 'por-do-sol': 'Pôr do sol', noite: 'Noite', confete: 'Confete', xadrez: 'Xadrez', custom: 'Do seu jeito (o aluno escolhe a cor)',
  classico: 'Clássico', ouro: 'Ouro', rosa: 'Rosa', azul: 'Azul',
};

export interface ThemeOption { value: string; label: string }

/** Opções do seletor de tema. Um valor salvo fora da biblioteca (fundo antigo) continua escolhível para não sumir ao editar. */
export function themeOptions(type: CosmeticType, current: string): ThemeOption[] {
  const known = type === 'card' ? CARD_THEMES : STAGE_THEMES;
  const values = current && !known.includes(current) ? [...known, current] : known;
  return values.map((value) => ({ value, label: THEME_LABELS[value] ?? value }));
}
