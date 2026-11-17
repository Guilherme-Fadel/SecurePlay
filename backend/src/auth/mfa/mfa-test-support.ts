import { Usuario } from '../../usuario/usuario.entity';
import { Role } from '../roles.enum';

/** Apoio dos testes de MFA: conta em memória, Redis e bloqueio por conta falsos. */
export function contaDeTeste(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: 7,
    name: 'Gestão',
    email: 'gestao@example.test',
    username: 'gestao',
    role: Role.ADMIN,
    active: true,
    session_version: 0,
    password_change_required: false,
    email_verification_required: false,
    email_verified_at: new Date(),
    mfa_secret_encrypted: null,
    mfa_enabled_at: null,
    mfa_recovery_codes: null,
    ...overrides,
  } as Usuario;
}

export class FakeMfaStore {
  constructor(readonly contas: Map<number, Usuario>) {}

  load(id: number) {
    const conta = this.contas.get(id);
    return Promise.resolve(conta ? { ...conta } : null);
  }

  savePendingSecret(id: number, encrypted: string) {
    const conta = this.contas.get(id);
    if (!conta || conta.mfa_enabled_at) return Promise.resolve(false);
    conta.mfa_secret_encrypted = encrypted;
    return Promise.resolve(true);
  }

  activate(id: number, hashes: string[], segredoUsado: string) {
    const conta = this.contas.get(id);
    if (
      !conta ||
      conta.mfa_enabled_at ||
      conta.mfa_secret_encrypted !== segredoUsado
    )
      return Promise.resolve(false);
    conta.mfa_enabled_at = new Date();
    conta.mfa_recovery_codes = hashes;
    return Promise.resolve(true);
  }

  consumeRecoveryCode(id: number, hash: string) {
    const conta = this.contas.get(id);
    const lista = conta?.mfa_recovery_codes ?? [];
    if (!conta || !lista.includes(hash)) return Promise.resolve(false);
    conta.mfa_recovery_codes = lista.filter((item) => item !== hash);
    return Promise.resolve(true);
  }
}

/** Redis só com o necessário: emula o script de antirreplay. */
export class FakeRedis {
  readonly passos = new Map<string, number>();
  indisponivel = false;

  eval(_script: string, keys: string[], args: (string | number)[]) {
    if (this.indisponivel) return Promise.reject(new Error('redis fora'));
    const ultimo = this.passos.get(keys[0]);
    const passo = Number(args[0]);
    if (ultimo !== undefined && ultimo >= passo) return Promise.resolve(0);
    this.passos.set(keys[0], passo);
    return Promise.resolve(1);
  }
}

export class FakeAttempts {
  readonly reservas: string[] = [];
  readonly zerados: string[] = [];

  reserveAttempt = jest.fn((subject: string) => {
    this.reservas.push(subject);
    return Promise.resolve();
  });
  reset = jest.fn((subject: string) => {
    this.zerados.push(subject);
    return Promise.resolve();
  });
}
