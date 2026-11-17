import { createHmac } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';

export const MFA_CHALLENGE_COOKIE = 'mfa_challenge';
export const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;
export const MFA_CHALLENGE_PURPOSE = 'mfa';

export const MFA_CHALLENGE_INVALID = {
  message: 'Sua verificação expirou. Entre de novo.',
  code: 'mfa_challenge_invalid',
} as const;

export interface MfaChallenge {
  sub: number;
  sessionVersion: number;
}

/** Chave própria do desafio: HMAC-SHA256 de JWT_SECRET com o rótulo `mfa-challenge`. */
export function challengeSecret(): string {
  const base = process.env.JWT_SECRET?.trim();
  if (!base) throw new Error('JWT_SECRET não definido');
  return createHmac('sha256', base).update('mfa-challenge').digest('hex');
}

export function signChallenge(jwt: JwtService, challenge: MfaChallenge) {
  return jwt.sign(
    {
      sub: challenge.sub,
      purpose: MFA_CHALLENGE_PURPOSE,
      sessionVersion: challenge.sessionVersion,
    },
    {
      secret: challengeSecret(),
      algorithm: 'HS256',
      expiresIn: MFA_CHALLENGE_TTL_SECONDS,
    },
  );
}

/** Valida assinatura, validade e finalidade; qualquer falha vira 401 padronizado. */
export function readChallenge(jwt: JwtService, token: unknown): MfaChallenge {
  try {
    if (typeof token !== 'string' || !token) throw new Error('ausente');
    const payload = jwt.verify<{
      sub?: unknown;
      purpose?: unknown;
      sessionVersion?: unknown;
    }>(token, { secret: challengeSecret(), algorithms: ['HS256'] });
    const { sub, sessionVersion } = payload;
    if (
      payload.purpose !== MFA_CHALLENGE_PURPOSE ||
      typeof sub !== 'number' ||
      !Number.isSafeInteger(sub) ||
      sub <= 0 ||
      typeof sessionVersion !== 'number' ||
      !Number.isSafeInteger(sessionVersion) ||
      sessionVersion < 0
    )
      throw new Error('payload inválido');
    return { sub, sessionVersion };
  } catch {
    throw new UnauthorizedException({ ...MFA_CHALLENGE_INVALID });
  }
}
