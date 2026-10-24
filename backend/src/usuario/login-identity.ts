import { BadRequestException, ConflictException } from '@nestjs/common';

export function normalizeUsername(value?: string | null): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string')
    throw new BadRequestException('Usuário inválido');
  const username = value.trim().toLowerCase();
  if (
    !/^[a-z0-9][a-z0-9._-]{2,23}$/.test(username) ||
    username.startsWith('sp-')
  ) {
    throw new BadRequestException(
      'Use de 3 a 24 letras sem acento, números, ponto, hífen ou sublinhado. O prefixo SP- é reservado.',
    );
  }
  return username;
}

export function normalizePhone(value?: string | null): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string')
    throw new BadRequestException('Telefone inválido');
  const phone = value.trim().replace(/[\s().-]/g, '');
  if (!/^\+?\d{8,15}$/.test(phone))
    throw new BadRequestException(
      'Informe um telefone com 8 a 15 dígitos, incluindo o DDD.',
    );
  return phone;
}

export function usernameTaken() {
  return new ConflictException({
    code: 'USERNAME_TAKEN',
    message: 'Este usuário já está em uso. Escolha outro.',
  });
}

export function registrationConflict(error: unknown): never {
  const failure = error as {
    code?: string;
    driverError?: { code?: string; sqlMessage?: string };
    sqlMessage?: string;
  };
  if ((failure?.code ?? failure?.driverError?.code) === 'ER_DUP_ENTRY') {
    if (
      (failure.sqlMessage ?? failure.driverError?.sqlMessage ?? '').includes(
        'ux_usuario_username',
      )
    )
      throw usernameTaken();
    throw new ConflictException(
      'Este e-mail já possui um cadastro. Entre na sua conta ou solicite outro link.',
    );
  }
  throw error;
}
