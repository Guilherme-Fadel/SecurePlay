import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { invalidate } from '@/lib/queryCache';

/** Evento de janela para telas que buscam o módulo sem cache (useModulo). */
export const JORNADA_ATUALIZADA_EVENT = 'secureplay:jornada-atualizada';

interface AvisoJornada {
  turmaId?: number;
  aulasAbertas?: Array<{ id: number; titulo: string }>;
}

function recarregarJornada() {
  invalidate('conteudoModulos');
  invalidate('dashboardJourney');
  window.dispatchEvent(new CustomEvent(JORNADA_ATUALIZADA_EVENT));
}

/** Telas sem cache (módulo aberto) recarregam quando a jornada da turma muda. */
export function useAoAtualizarJornada(recarregar: () => unknown, ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    const handler = () => { void recarregar(); };
    window.addEventListener(JORNADA_ATUALIZADA_EVENT, handler);
    return () => window.removeEventListener(JORNADA_ATUALIZADA_EVENT, handler);
  }, [recarregar, ativo]);
}

/** Professor abriu ou agendou aulas: recarrega a trilha e avisa cada aula aberta. */
export function aplicarJornadaAtualizada(aviso: AvisoJornada | undefined) {
  recarregarJornada();
  for (const aula of aviso?.aulasAbertas ?? []) toast(`Nova aula aberta: ${aula.titulo}`);
}

/**
 * Só para alunos: escuta o socket já aberto (o das notificações) e, como reserva,
 * recarrega a jornada quando a janela volta ao foco (agendamentos não geram aviso).
 */
export function useJornadaAtualizada(socket: Socket | null, ativo: boolean) {
  useEffect(() => {
    if (!socket || !ativo) return;
    const handler = (aviso: AvisoJornada) => aplicarJornadaAtualizada(aviso);
    socket.on('jornada-atualizada', handler);
    return () => {
      socket.off('jornada-atualizada', handler);
    };
  }, [socket, ativo]);

  useEffect(() => {
    if (!ativo) return;
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') recarregarJornada();
    };
    window.addEventListener('focus', aoVoltar);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      window.removeEventListener('focus', aoVoltar);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [ativo]);
}
