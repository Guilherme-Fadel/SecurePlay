import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/notification.dto';
import { Role } from '../auth/roles.enum';

const montarServico = (usuarios: Record<number, object>) => {
  const repositorio = {
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn((dados: object) => Promise.resolve({ id: 1, ...dados })),
    update: jest.fn(),
  };
  const usuarioService = {
    getUsuarioById: jest.fn((id: number) =>
      Promise.resolve(usuarios[id] ?? undefined),
    ),
  };
  const servico = new NotificationService(
    repositorio as never,
    { emit: jest.fn() } as never,
    usuarioService as never,
  );
  return { servico, repositorio, usuarioService };
};

describe('NotificationService: enumeração de IDs (B2)', () => {
  it('aluno recebe 403 para ID existente e inexistente, sem buscar o alvo', async () => {
    const { servico, usuarioService } = montarServico({
      1: { id: 1, role: Role.USER, empresa_id: 10 },
      2: { id: 2, role: Role.USER, empresa_id: 10 },
    });

    const existente = await servico
      .getNotificationForActor(2, 1)
      .catch((e: unknown) => e);
    const inexistente = await servico
      .getNotificationForActor(999, 1)
      .catch((e: unknown) => e);

    expect(existente).toBeInstanceOf(ForbiddenException);
    expect(inexistente).toBeInstanceOf(ForbiddenException);
    expect((inexistente as Error).message).toBe((existente as Error).message);
    expect(usuarioService.getUsuarioById).not.toHaveBeenCalledWith(2);
    expect(usuarioService.getUsuarioById).not.toHaveBeenCalledWith(999);
  });

  it('admin recebe a mesma resposta 403 para alvo inexistente e de outra escola', async () => {
    const { servico } = montarServico({
      1: { id: 1, role: Role.ADMIN, empresa_id: 10 },
      2: { id: 2, role: Role.USER, empresa_id: 20 },
    });

    const outraEscola = await servico
      .getNotificationForActor(2, 1)
      .catch((e: unknown) => e);
    const inexistente = await servico
      .getNotificationForActor(999, 1)
      .catch((e: unknown) => e);

    expect(inexistente).toBeInstanceOf(ForbiddenException);
    expect(outraEscola).toBeInstanceOf(ForbiddenException);
    expect((inexistente as Error).message).toBe((outraEscola as Error).message);
  });

  it('platform_admin mantém 404 para alvo inexistente', async () => {
    const { servico } = montarServico({
      1: { id: 1, role: Role.PLATFORM_ADMIN, empresa_id: null },
    });

    await expect(
      servico.getNotificationForActor(999, 1),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CreateNotificationDto: limites (B3)', () => {
  const validar = (corpo: object) =>
    validate(plainToInstance(CreateNotificationDto, corpo), {
      whitelist: true,
    });
  const valido = {
    usuario_id: 2,
    title: 'Título',
    message: 'Mensagem',
    type: 'achievement',
  };

  it('aceita corpo válido sem readed', async () => {
    expect(await validar(valido)).toHaveLength(0);
  });

  it('corpo de 200 KB na mensagem é recusado (400 pela ValidationPipe)', async () => {
    const erros = await validar({ ...valido, message: 'a'.repeat(200 * 1024) });
    expect(erros.map((e) => e.property)).toContain('message');
  });

  it('recusa título com 101 caracteres e aceita 100', async () => {
    const erros = await validar({ ...valido, title: 'a'.repeat(101) });
    expect(erros.map((e) => e.property)).toContain('title');
    expect(await validar({ ...valido, title: 'a'.repeat(100) })).toHaveLength(
      0,
    );
  });

  it('recusa mensagem com 251 caracteres e aceita 250', async () => {
    const erros = await validar({ ...valido, message: 'a'.repeat(251) });
    expect(erros.map((e) => e.property)).toContain('message');
    expect(await validar({ ...valido, message: 'a'.repeat(250) })).toHaveLength(
      0,
    );
  });

  it('recusa tipo fora da lista', async () => {
    const erros = await validar({ ...valido, type: 'qualquer-coisa' });
    expect(erros.map((e) => e.property)).toContain('type');
  });
});

describe('NotificationService: criação ignora readed do corpo (B3)', () => {
  it('readed do corpo é ignorado e o servidor grava false', async () => {
    const { servico, repositorio } = montarServico({
      1: { id: 1, role: Role.ADMIN, empresa_id: 10 },
      2: { id: 2, role: Role.USER, empresa_id: 10 },
    });
    const corpo = {
      usuario_id: 2,
      title: 'T',
      message: 'M',
      type: 'info',
      readed: true,
    } as CreateNotificationDto;

    await servico.createForActor(corpo, 1);

    expect(repositorio.save).toHaveBeenCalledWith(
      expect.objectContaining({ readed: false }),
    );
  });
});
