import { applyDecorators } from '@nestjs/common';
import {
  IsString,
  Matches,
  MinLength,
  ValidateBy,
  ValidationOptions,
} from 'class-validator';
import { isCommonPassword } from './common-passwords';
import { MaxUtf8Bytes } from './max-utf8-bytes.validator';

/** Tamanho mínimo de senha nova. Senhas antigas mais curtas continuam entrando no login. */
export const MIN_PASSWORD_LENGTH = 8;

export function IsNotCommonPassword(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isNotCommonPassword',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && !isCommonPassword(value),
        defaultMessage: () =>
          'Essa senha é muito comum e fácil de adivinhar. Escolha outra.',
      },
    },
    validationOptions,
  );
}

/** Regra para senha nova (cadastro, convite, troca e redefinição); o login não a usa. */
export function IsSecurePassword() {
  return applyDecorators(
    IsString(),
    MinLength(MIN_PASSWORD_LENGTH, {
      message: `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    }),
    MaxUtf8Bytes(72),
    Matches(/\S/, { message: 'A senha não pode conter apenas espaços.' }),
    IsNotCommonPassword(),
  );
}
