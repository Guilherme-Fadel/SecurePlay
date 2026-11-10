import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

export const PROXY_SECRET_HEADER = 'x-secureplay-proxy';
export const PROXY_CLIENT_IP_HEADER = 'x-secureplay-client-ip';

function sameSecret(received: unknown, expected: string): boolean {
  if (typeof received !== 'string' || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** IP do aluno repassado pelo proxy da Cloudflare Pages; só vale com o segredo compartilhado. */
export function proxiedClientIp(
  headers: Record<string, unknown> | undefined,
  secret = process.env.PROXY_SHARED_SECRET,
): string | null {
  if (!secret || !headers) return null;
  if (!sameSecret(headers[PROXY_SECRET_HEADER], secret)) return null;
  const ip = headers[PROXY_CLIENT_IP_HEADER];
  return typeof ip === 'string' && isIP(ip.trim()) ? ip.trim() : null;
}

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, any>): Promise<string> {
    // Atrás do proxy da Pages, request.ip é o IP da Cloudflare (igual para todos os alunos).
    // Fastify já aplica trustProxy ao calcular ip; ips[0] é o proxy mais próximo.
    return Promise.resolve(
      proxiedClientIp(request.headers) ?? (request.ip as string),
    );
  }
}
