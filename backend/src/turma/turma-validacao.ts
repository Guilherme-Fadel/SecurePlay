import { BadRequestException } from '@nestjs/common';

/** Violação do índice único `ux_turma_empresa_ano_nome`. */
export function duplicado(error: unknown): boolean {
  return (error as { code?: string })?.code === 'ER_DUP_ENTRY';
}

/** Defesa no service além do DTO: nome aparado, 1–80 caracteres. */
export function nomeValido(valor: string): string {
  const nome = (valor ?? '').trim();
  if (!nome) throw new BadRequestException('Informe o nome da turma');
  if (nome.length > 80)
    throw new BadRequestException('Use até 80 caracteres no nome');
  return nome;
}
