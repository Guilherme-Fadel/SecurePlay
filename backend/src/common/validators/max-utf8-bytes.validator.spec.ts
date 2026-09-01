import { validate } from 'class-validator';
import { MaxUtf8Bytes } from './max-utf8-bytes.validator';

class PasswordDto {
  @MaxUtf8Bytes(72)
  password: string;
}

describe('MaxUtf8Bytes', () => {
  it('aceita uma senha com até 72 bytes UTF-8', async () => {
    const dto = Object.assign(new PasswordDto(), { password: 'a'.repeat(72) });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejeita senha cujo tamanho em bytes UTF-8 excede 72', async () => {
    const dto = Object.assign(new PasswordDto(), { password: '😀'.repeat(19) });
    await expect(validate(dto)).resolves.toHaveLength(1);
  });
});
