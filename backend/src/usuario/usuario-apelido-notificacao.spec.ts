import { UsuarioService } from './usuario.service';
import { Role } from '../auth/roles.enum';
import { NOTIFICATION_EVENTS } from '../notification/notification-events';

function montar() {
  const usuario = {
    id: 31,
    role: Role.USER,
    empresa_id: 12,
    nickname: null,
  };
  const users = {
    findOne: jest.fn().mockResolvedValue(usuario),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const emit = jest.fn();
  const service = new UsuarioService(
    users as never,
    {} as never,
    { emit } as never,
  );
  return { service, emit };
}

describe('UsuarioService.requestNickname: notificação à gestão', () => {
  it('emite apelidoSolicitado com a empresa do aluno depois de gravar', async () => {
    const { service, emit } = montar();

    await service.requestNickname(31, 'Guardião Azul');

    expect(emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.apelidoSolicitado, {
      empresaId: 12,
    });
  });

  it('não emite quando o apelido é recusado', async () => {
    const { service, emit } = montar();

    await expect(service.requestNickname(31, 'a')).rejects.toThrow();

    expect(emit).not.toHaveBeenCalled();
  });
});
