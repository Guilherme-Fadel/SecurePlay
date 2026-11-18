import { SegurancaNotificationListener } from './seguranca.listener';

function montar(
  usuario: object | null = { id: 5, active: true, role: 'user' },
) {
  const notify = jest.fn().mockResolvedValue(1);
  const getUsuarioById = jest.fn().mockResolvedValue(usuario);
  const listener = new SegurancaNotificationListener(
    { notify } as never,
    { getUsuarioById } as never,
  );
  return { listener, notify, getUsuarioById };
}

describe('SegurancaNotificationListener', () => {
  it.each([
    ['perfil', 'Você trocou a senha pelo seu perfil.'],
    ['recuperacao', 'A senha foi redefinida pelo link de recuperação.'],
  ] as const)(
    'senha alterada por %s gera um registro de segurança',
    async (origem, texto) => {
      const { listener, notify } = montar();

      await listener.aoAlterarSenha({ usuarioId: 5, origem });

      expect(notify).toHaveBeenCalledWith([
        {
          usuarioId: 5,
          type: 'seguranca',
          title: 'Sua senha foi alterada',
          message: `${texto} Se não foi você, avise a gestão da escola.`,
          link: '/perfil',
        },
      ]);
      const [[entrada]] = notify.mock.calls as [[Array<{ groupKey?: string }>]];
      expect(entrada[0].groupKey).toBeUndefined();
    },
  );

  it.each([
    [true, 'foi ativada'],
    [false, 'foi desativada'],
  ])('MFA alterado (ativado=%s) avisa o usuário', async (ativado, trecho) => {
    const { listener, notify } = montar();

    await listener.aoAlterarMfa({ usuarioId: 5, ativado });

    const [[entradas]] = notify.mock.calls as [
      [Array<{ type: string; message: string; link: string }>],
    ];
    expect(entradas).toHaveLength(1);
    expect(entradas[0].type).toBe('seguranca');
    expect(entradas[0].message).toContain(trecho);
    expect(entradas[0].message).toContain(
      'Se não foi você, avise a gestão da escola.',
    );
    expect(entradas[0].link).toBe('/perfil');
  });

  it.each(['admin', 'teacher', 'platform_admin'])(
    'papel %s não recebe o link /perfil, que é rota do aluno',
    async (role) => {
      const { listener, notify } = montar({ id: 5, active: true, role });

      await listener.aoAlterarSenha({ usuarioId: 5, origem: 'perfil' });
      await listener.aoAlterarMfa({ usuarioId: 5, ativado: true });

      const links = notify.mock.calls.map(
        ([entradas]: [Array<{ link: string | null }>]) => entradas[0].link,
      );
      expect(links).toEqual([null, null]);
    },
  );

  it('ignora usuário inativo ou inexistente', async () => {
    const inativo = montar({ id: 5, active: false });
    await inativo.listener.aoAlterarSenha({ usuarioId: 5, origem: 'perfil' });
    const ausente = montar(null);
    await ausente.listener.aoAlterarMfa({ usuarioId: 5, ativado: true });

    expect(inativo.notify).not.toHaveBeenCalled();
    expect(ausente.notify).not.toHaveBeenCalled();
  });

  it('falha ao notificar não propaga e o log não leva dados pessoais', async () => {
    const { listener, notify } = montar();
    notify.mockRejectedValue(new Error('ana@example.test caiu'));
    const aviso = jest
      .spyOn(listener['logger'], 'warn')
      .mockImplementation(() => undefined);

    await expect(
      listener.aoAlterarSenha({ usuarioId: 5, origem: 'perfil' }),
    ).resolves.toBeUndefined();

    expect(aviso).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(aviso.mock.calls)).not.toContain('ana@example.test');
  });
});
