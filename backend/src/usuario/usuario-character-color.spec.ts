import { UsuarioService } from './usuario.service';
import { defaultCharacterColor } from '../achievements/character-color';
import { rankKey } from '../dashboard/rank-key';

describe('Usuário logado: personagem no lugar da foto', () => {
  const build = (row: Record<string, unknown>) => {
    const repository = {
      findOne: jest.fn().mockResolvedValue({ id: 7, role: 'user', ...row }),
    };
    return new UsuarioService(repository as never, {} as never);
  };

  it('devolve a cor gravada e não expõe profile_image_url', async () => {
    const dados = await build({
      character_color: 'rosa',
      profile_image_key: 'profiles/7/avatar-1.png',
    }).getUsuarioDados(7);
    expect(dados.character_color).toBe('rosa');
    expect(dados).not.toHaveProperty('profile_image_url');
  });

  it('sem cor gravada (ou inválida) usa a padrão pela rankKey', async () => {
    const esperado = defaultCharacterColor(rankKey(7));
    for (const stored of [null, 'roxo']) {
      const dados = await build({ character_color: stored }).getUsuarioDados(7);
      expect(dados.character_color).toBe(esperado);
    }
  });
});
