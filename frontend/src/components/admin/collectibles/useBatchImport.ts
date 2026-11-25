import { useCallback, useEffect, useRef, useState } from 'react';
import { mensagemDeErro, statusDoErro } from '@/components/admin/turmas/turmaUi';
import { createCollectibleItem, listCollectibleItems, uploadCollectibleArt } from '@/services/adminCollectibles';
import { uploadErrorText } from './ArtUploadField';
import { artFileFromImport, buildImportedItemBody, type BatchEntry } from './collectibleImport';

/** Conferência do slug no backend: "unknown" quando a consulta falhou (a criação ainda recusa o repetido com 409). */
export type Existence = 'checking' | 'new' | 'exists' | 'unknown';
export type Outcome = { state: 'running' | 'created' | 'exists' | 'failed'; message?: string };
export type Phase = 'review' | 'running' | 'done';
type ValidEntry = Extract<BatchEntry, { ok: true }>;

/** A busca do backend é por trecho (`Like %slug%`); só o slug idêntico conta como "já existe". */
async function slugTaken(slug: string): Promise<boolean> {
  const page = await listCollectibleItems({ page: 1, pageSize: 100, search: slug });
  return page.items.some((item) => item.slug === slug);
}

/** Envia a arte e cria o rascunho. Se a arte falhar, o item não é criado (evita rascunho sem arte por engano). */
async function createOne(entry: ValidEntry): Promise<Outcome> {
  let artKey: string | null = null;
  if (entry.art) {
    try { artKey = (await uploadCollectibleArt(artFileFromImport(entry.art))).artKey; } catch (failure) {
      return { state: 'failed', message: `a arte não foi enviada e o item não foi criado. ${uploadErrorText(failure)}` };
    }
  }
  try {
    await createCollectibleItem(buildImportedItemBody(entry.form, artKey));
    return { state: 'created' };
  } catch (failure) {
    if (statusDoErro(failure) === 409) return { state: 'exists' };
    return { state: 'failed', message: mensagemDeErro(failure, 'não foi possível criar o item.') };
  }
}

const isValid = (entry: BatchEntry): entry is ValidEntry => entry.ok;

/**
 * Importação em lote: confere, um por vez, quais slugs já existem; guarda a escolha de cada item; e cria os
 * escolhidos em sequência (arte, depois rascunho), registrando o resultado de cada um. Nada é publicado.
 */
export function useBatchImport(entries: BatchEntry[], onFinished: () => void) {
  const [existence, setExistence] = useState<Record<number, Existence>>(() => Object.fromEntries(entries.filter(isValid).map((entry) => [entry.index, 'checking' as const])));
  const [choice, setChoice] = useState<Record<number, boolean>>({});
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({});
  const [phase, setPhase] = useState<Phase>('review');
  const alive = useRef(true);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    let current = true;
    void (async () => {
      for (const entry of entries.filter(isValid)) {
        let result: Existence;
        try { result = (await slugTaken(entry.form.slug)) ? 'exists' : 'new'; } catch { result = 'unknown'; }
        if (!current) return;
        setExistence((previous) => ({ ...previous, [entry.index]: result }));
      }
    })();
    return () => { current = false; };
  }, [entries]);

  const checking = Object.values(existence).includes('checking');
  const selectable = (entry: BatchEntry) => entry.ok && existence[entry.index] !== 'exists' && existence[entry.index] !== 'checking';
  const isOn = (entry: BatchEntry) => selectable(entry) && (choice[entry.index] ?? true);
  const chosen = entries.filter(isValid).filter(isOn);

  const toggle = useCallback((index: number, on: boolean) => setChoice((previous) => ({ ...previous, [index]: on })), []);

  const run = async () => {
    setPhase('running');
    for (const entry of chosen) {
      if (!alive.current) return;
      setOutcomes((previous) => ({ ...previous, [entry.index]: { state: 'running' } }));
      const outcome = await createOne(entry);
      if (!alive.current) return;
      setOutcomes((previous) => ({ ...previous, [entry.index]: outcome }));
    }
    setPhase('done');
    finished.current();
  };

  return { existence, outcomes, phase, checking, selectable, isOn, chosen, toggle, run };
}

/** Texto e tom da coluna "Situação". */
export function rowStatus(entry: BatchEntry, existence: Existence | undefined, outcome: Outcome | undefined): { text: string; tone: 'ok' | 'warn' | 'error' | 'idle' } {
  if (outcome) {
    if (outcome.state === 'running') return { text: 'Criando…', tone: 'idle' };
    if (outcome.state === 'created') return { text: 'Criado', tone: 'ok' };
    if (outcome.state === 'exists') return { text: 'Já existe', tone: 'warn' };
    return { text: `Falhou: ${outcome.message ?? 'erro desconhecido.'}`, tone: 'error' };
  }
  if (!entry.ok) return { text: `Inválido: ${entry.error}`, tone: 'error' };
  if (existence === 'checking') return { text: 'Conferindo…', tone: 'idle' };
  if (existence === 'exists') return { text: 'Já existe', tone: 'warn' };
  return { text: existence === 'unknown' ? 'Novo (não conferido)' : 'Novo', tone: 'ok' };
}
