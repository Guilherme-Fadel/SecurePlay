import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateAdminUserDto } from './update-admin-user.dto';

async function erros(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdateAdminUserDto, payload);
  return validate(dto);
}

describe('UpdateAdminUserDto: apelido', () => {
  it('admin não grava apelido com HTML', async () => {
    const resultado = await erros({ nickname: '<img src=x onerror=z=1>' });
    expect(resultado.some((e) => e.property === 'nickname')).toBe(true);
  });

  it('recusa apelido com caracteres fora do padrão', async () => {
    for (const nickname of ['a<b>', 'jo@o', 'x;y', "o'brien"]) {
      const resultado = await erros({ nickname });
      expect(resultado.some((e) => e.property === 'nickname')).toBe(true);
    }
  });

  it('aceita apelido válido, com acento, espaço, hífen e sublinhado', async () => {
    for (const nickname of ['João Silva', 'ana_o-1', 'Zé']) {
      expect(await erros({ nickname })).toHaveLength(0);
    }
  });

  it('mantém os limites de tamanho', async () => {
    expect(
      (await erros({ nickname: 'a' })).some((e) => e.property === 'nickname'),
    ).toBe(true);
    expect(
      (await erros({ nickname: 'a'.repeat(25) })).some(
        (e) => e.property === 'nickname',
      ),
    ).toBe(true);
  });

  it('aceita limpar o apelido (null) e omiti-lo', async () => {
    expect(await erros({ nickname: null })).toHaveLength(0);
    expect(await erros({})).toHaveLength(0);
  });
});
