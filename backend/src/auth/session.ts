import { createHash, randomUUID } from 'crypto';
import { Usuario } from '../usuario/usuario.entity';
import { Role } from './roles.enum';

export function sessionTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionPayload(
  user: Pick<Usuario, 'id' | 'email' | 'role' | 'session_version'>,
) {
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    sessionVersion: user.session_version ?? 0,
    jti: randomUUID(),
  };
}

export function activeAccountSession(
  user: Usuario | undefined | null,
  version: number,
): user is Usuario {
  return (
    !!user?.active &&
    Number.isSafeInteger(version) &&
    version >= 0 &&
    (user.session_version ?? 0) === version &&
    !user.password_change_required &&
    Object.values(Role).includes(user.role) &&
    !(
      user.role === Role.PLATFORM_ADMIN &&
      user.email_verification_required &&
      !user.email_verified_at
    )
  );
}

export interface SocketSession {
  userId: number;
  sessionVersion: number;
  tokenHash: string;
  expiresAt: number;
  trialExpiresAt: number | null;
}

export interface AuthenticatedRequest {
  user: { userId: number; sessionVersion: number };
  cookies?: { token?: string };
  headers: { authorization?: string };
}
