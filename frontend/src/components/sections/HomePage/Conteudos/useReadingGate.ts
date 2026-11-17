import { useCallback, useState } from 'react';
import type { UpdateAulaProgress } from '@/services/conteudo';

/** Percentual de leitura que o servidor exige para liberar o quiz ou a conclusão (A2). */
const READ_COMPLETE_PERCENT = 99;
const SLOW_DOWN_MESSAGE = 'Leia as páginas com calma antes do quiz. Tente de novo em alguns segundos.';

interface ReadingGateOptions {
  lessonId: number | undefined;
  pageCount: number;
  save: (aulaId: number, progress: UpdateAulaProgress) => Promise<unknown>;
}

function acceptedPercent(saved: unknown): number | null {
  const percent = (saved as { percent?: unknown } | null)?.percent;
  return typeof percent === 'number' ? percent : null;
}

/**
 * Grava a última página e só libera o quiz/conclusão se o servidor aceitou a leitura (>= 99%).
 * Ele limita o avanço pelo tempo real; se recusar, o aluno segue na leitura com um aviso e
 * pode tentar de novo, o que regrava a última página e reconfere.
 */
export function useReadingGate({ lessonId, pageCount, save }: ReadingGateOptions) {
  const [readingNotice, setReadingNotice] = useState<string | null>(null);

  const confirmRead = useCallback(async (): Promise<boolean> => {
    if (!lessonId || !pageCount) return true;
    const saved = await save(lessonId, { progress_percent: READ_COMPLETE_PERCENT, last_page: pageCount - 1 });
    const percent = acceptedPercent(saved);
    const accepted = percent !== null && percent >= READ_COMPLETE_PERCENT;
    setReadingNotice(accepted ? null : SLOW_DOWN_MESSAGE);
    return accepted;
  }, [lessonId, pageCount, save]);

  return { readingNotice, confirmRead };
}
