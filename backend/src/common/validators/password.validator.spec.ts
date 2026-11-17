import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from '../../usuario/dto/login.dto';
import { isCommonPassword } from './common-passwords';
import { IsSecurePassword } from './password.validator';

class NewPasswordDto {
  @IsSecurePassword()
  password: string;
}

function errorsFor(password: unknown): string[] {
  const dto = plainToInstance(NewPasswordDto, { password });
  return validateSync(dto).flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
}

describe('IsSecurePassword (senha nova)', () => {
  it('recusa 123456, 12345678 e senha123', () => {
    expect(errorsFor('123456')).toContain(
      'A senha deve ter ao menos 8 caracteres.',
    );
    for (const weak of ['12345678', 'senha123', 'SENHA123', ' Senha123 ']) {
      expect(errorsFor(weak)).toContain(
        'Essa senha é muito comum e fácil de adivinhar. Escolha outra.',
      );
    }
  });

  it('recusa caractere repetido', () => {
    expect(isCommonPassword('aaaaaaaa')).toBe(true);
    expect(errorsFor('zzzzzzzzzz')).not.toHaveLength(0);
  });

  it('aceita senha de 8+ caracteres fora da lista', () => {
    expect(errorsFor('Corvo azul 42')).toEqual([]);
    expect(errorsFor('trilha-segura')).toEqual([]);
  });

  it('mantém o limite de 72 bytes e a recusa de só espaços', () => {
    expect(errorsFor('á'.repeat(37))).not.toHaveLength(0);
    expect(errorsFor('         ')).toContain(
      'A senha não pode conter apenas espaços.',
    );
  });

  it('login com senha antiga de 6 caracteres continua funcionando', () => {
    const dto = plainToInstance(LoginDto, {
      identifier: 'aluno@example.com',
      password: '123456',
    });
    expect(validateSync(dto)).toEqual([]);
  });
});
