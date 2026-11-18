import { ConflictException, NotFoundException } from '@nestjs/common';
import { TurmaAvisosService } from './turma-avisos.service';

describe('TurmaAvisosService', () => {
  const dto = { title: 'Prova amanhã', message: 'Tragam o material.' };
  let turma: { id: number; empresa_id: number; ativa: boolean } | null;
  let alunos: { id: number | string }[];
  const where = jest.fn();
  const andWhere = jest.fn();
  const builder: Record<string, jest.Mock> = {};
  const notificacoes = { notify: jest.fn().mockResolvedValue(0) };
  const audit = { registrar: jest.fn().mockResolvedValue(undefined) };
  const findOne = jest.fn();
  let service: TurmaAvisosService;

  beforeEach(() => {
    jest.clearAllMocks();
    turma = { id: 3, empresa_id: 10, ativa: true };
    alunos = [{ id: 7 }, { id: '8' }];
    findOne.mockImplementation(() => Promise.resolve(turma));
    for (const nome of ['select', 'innerJoin'])
      builder[nome] = jest.fn(() => builder);
    builder.where = where.mockImplementation(() => builder);
    builder.andWhere = andWhere.mockImplementation(() => builder);
    builder.getRawMany = jest.fn(() => Promise.resolve(alunos));
    const dataSource = {
      getRepository: jest.fn(() => ({
        findOne,
        createQueryBuilder: () => builder,
      })),
    };
    service = new TurmaAvisosService(
      dataSource as never,
      notificacoes as never,
      audit as never,
    );
  });

  it('notifica só os alunos ativos da turma e audita sem copiar o texto', async () => {
    await expect(service.enviar(1, 10, 3, dto)).resolves.toEqual({
      enviados: 2,
    });
    expect(findOne).toHaveBeenCalledWith({ where: { id: 3, empresa_id: 10 } });
    expect(where).toHaveBeenCalledWith('usuario.role = :role', {
      role: 'user',
    });
    expect(andWhere).toHaveBeenCalledWith('usuario.active = 1');
    const base = {
      type: 'aviso',
      title: dto.title,
      message: dto.message,
      link: '/inicio',
    };
    expect(notificacoes.notify).toHaveBeenCalledWith([
      { usuarioId: 7, ...base },
      { usuarioId: 8, ...base },
    ]);
    expect(audit.registrar).toHaveBeenCalledTimes(1);
    const [evento] = audit.registrar.mock.calls[0] as [Record<string, unknown>];
    expect(evento).toMatchObject({
      empresaId: 10,
      atorId: 1,
      acao: 'turma.aviso_enviado',
      alvoTipo: 'turma',
      alvoId: 3,
      detalhes: { destinatarios: 2 },
    });
    expect(JSON.stringify(evento)).not.toContain(dto.message);
  });

  it('turma sem alunos devolve zero e não notifica', async () => {
    alunos = [];
    await expect(service.enviar(1, 10, 3, dto)).resolves.toEqual({
      enviados: 0,
    });
    expect(notificacoes.notify).not.toHaveBeenCalled();
  });

  it('turma de outra escola é 404 e turma arquivada é 409', async () => {
    turma = null;
    await expect(service.enviar(1, 10, 3, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    turma = { id: 3, empresa_id: 10, ativa: false };
    await expect(service.enviar(1, 10, 3, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(notificacoes.notify).not.toHaveBeenCalled();
    expect(audit.registrar).not.toHaveBeenCalled();
  });
});
