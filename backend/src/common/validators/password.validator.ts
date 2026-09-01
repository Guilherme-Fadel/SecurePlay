import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MinLength } from 'class-validator';
import { MaxUtf8Bytes } from './max-utf8-bytes.validator';

export function IsSecurePassword() {
  return applyDecorators(
    IsString(),
    MinLength(6),
    MaxUtf8Bytes(72),
    Matches(/\S/, { message: 'A senha não pode conter apenas espaços.' }),
  );
}
