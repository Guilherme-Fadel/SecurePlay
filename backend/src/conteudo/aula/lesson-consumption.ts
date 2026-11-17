import { Aula, AulaType } from './aula.entity';

/** Vídeo conclui com 90% assistido; quadrinho/texto com a última página (a UI grava 99%). */
export const VIDEO_COMPLETE_PERCENT = 90;
export const READ_COMPLETE_PERCENT = 99;

/** Vídeo pode avançar até 2× a velocidade normal. */
const MAX_VIDEO_SPEED = 2;
/** Duração mínima considerada quando a aula de vídeo não tem duração cadastrada. */
const MIN_VIDEO_SECONDS = 60;
/** Leitura: até 1 página a cada 2 s; a primeira página conta ao abrir a aula. */
const SECONDS_PER_PAGE = 2;

type LessonShape = Pick<Aula, 'type' | 'duration' | 'pages' | 'content_url'>;

export function isPagedLesson(aula: Pick<Aula, 'type'>): boolean {
  return aula.type === AulaType.QUADRINHO || aula.type === AulaType.TEXTO;
}

/** Sem vídeo publicado ou sem páginas não há o que consumir; a regra de consumo não se aplica. */
export function hasConsumableContent(aula: LessonShape): boolean {
  return isPagedLesson(aula)
    ? (aula.pages?.length ?? 0) > 0
    : !!aula.content_url;
}

/**
 * Progresso máximo (pontos percentuais) que o tempo TOTAL desde o início da aula permite.
 * Não soma ganhos por chamada: assim o arredondamento de PATCHes frequentes não trava o aluno.
 * Leitura: a primeira página conta ao abrir e depois 1 a cada 2 s; vídeo: até 2× a velocidade.
 */
export function maxAllowedProgress(
  aula: LessonShape,
  elapsedTotalMs: number,
): number {
  if (!hasConsumableContent(aula)) return 100;
  const elapsedSeconds = Math.max(0, elapsedTotalMs) / 1000;
  if (isPagedLesson(aula)) {
    const pages = elapsedSeconds / SECONDS_PER_PAGE + 1;
    return (pages * 100) / aula.pages.length;
  }
  const videoSeconds = Math.max((aula.duration ?? 0) * 60, MIN_VIDEO_SECONDS);
  return (elapsedSeconds * MAX_VIDEO_SPEED * 100) / videoSeconds;
}

/** Progresso a gravar: nunca diminui, o pedido do cliente é teto e o tempo total é o limite. */
export function cappedProgress(
  previous: number,
  requested: number,
  allowed: number,
): number {
  // A tolerância evita que erro de ponto flutuante (89,9999…) derrube um ponto inteiro.
  const ceiling = Math.floor(allowed + 1e-9);
  return Math.max(previous, Math.min(requested, ceiling, 100));
}

/** Mensagem do 400 quando a aula ainda não foi consumida; `null` quando pode concluir. */
export function consumptionError(
  aula: LessonShape,
  percent: number | null | undefined,
): string | null {
  if (!hasConsumableContent(aula)) return null;
  if (isPagedLesson(aula)) {
    return (percent ?? 0) >= READ_COMPLETE_PERCENT
      ? null
      : 'Leia até a última página para concluir esta aula.';
  }
  return (percent ?? 0) >= VIDEO_COMPLETE_PERCENT
    ? null
    : 'Assista a pelo menos 90% do vídeo para concluir esta aula.';
}
