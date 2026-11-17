import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

export const MENSAGEM_ERRO_INTERNO = 'Erro interno do servidor';

type ErroComCodigo = {
  name?: unknown;
  code?: unknown;
  driverError?: { code?: unknown } | null;
};

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.length > 0 ? valor : undefined;
}

function descreverErro(exception: unknown): {
  nome: string;
  codigo?: string;
} {
  const erro = (
    typeof exception === 'object' && exception !== null ? exception : {}
  ) as ErroComCodigo;
  return {
    nome: texto(erro.name) ?? 'Error',
    codigo: texto(erro.code) ?? texto(erro.driverError?.code),
  };
}

/**
 * Filtro global: HttpException segue o comportamento padrão do Nest; qualquer
 * outro erro HTTP vira 500 genérico e o log traz só nome, código e rota, sem
 * query, parâmetros, mensagem do driver ou stack (que podem ter dados pessoais).
 */
@Catch()
export class SafeExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('ExceptionsHandler');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http' || exception instanceof HttpException) {
      super.catch(exception, host);
      return;
    }

    const { nome, codigo } = descreverErro(exception);

    const http = host.switchToHttp();
    const request = http.getRequest<{ method?: string; url?: string }>();
    const rota = (request?.url ?? '').split('?')[0] || '-';
    const metodo = request?.method ?? '-';

    this.logger.error(
      `${nome}${codigo ? ` (${codigo})` : ''} em ${metodo} ${rota}`,
    );

    this.applicationRef?.reply(
      http.getResponse(),
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: MENSAGEM_ERRO_INTERNO,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
