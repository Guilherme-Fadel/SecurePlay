import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';
import { Usuario } from '../../usuario/usuario.entity';
import { LoginAttemptsService, loginSubject } from '../login-attempts.service';
import { Role } from '../roles.enum';
import { activeAccountSession } from '../session';
import { decryptMfaSecret, encryptMfaSecret } from './mfa-crypto';
import {
  MFA_CHALLENGE_INVALID,
  readChallenge,
  signChallenge,
} from './mfa-challenge';
import { MfaStore } from './mfa.store';
import { generateRecoveryCodes, hashRecoveryCode } from './recovery-codes';
import { generateTotpSecret, otpauthUrl, verifyTotp } from './totp';

export interface MfaVerifyInput {
  code?: string;
  recoveryCode?: string;
}

export interface MfaVerifyResult {
  user: Usuario;
  recoveryCodes?: string[];
}

const REPLAY_TTL_SECONDS = 120;
/** Aceita o passo só se for maior que o último aceito (comparação e gravação juntas). */
const ACCEPT_STEP_SCRIPT =
  "local last = redis.call('GET', KEYS[1]); if last and tonumber(last) >= tonumber(ARGV[1]) then return 0 end; redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2]); return 1";

const CODE_INVALID = {
  message: 'Código inválido.',
  code: 'mfa_code_invalid',
} as const;

/** Chave de cifra do MFA; sem ela o MFA fica desligado e o login não muda. */
export function mfaEncryptionKey(): string | undefined {
  return process.env.MFA_ENCRYPTION_KEY?.trim() || undefined;
}

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private readonly store: MfaStore,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly attempts: LoginAttemptsService,
  ) {}

  /** O MFA vale para gestão e só com a chave configurada. */
  appliesTo(user: Pick<Usuario, 'role'>): boolean {
    return (
      !!mfaEncryptionKey() &&
      (user.role === Role.ADMIN || user.role === Role.PLATFORM_ADMIN)
    );
  }

  issueChallenge(user: Pick<Usuario, 'id' | 'session_version'>): string {
    return signChallenge(this.jwt, {
      sub: user.id,
      sessionVersion: user.session_version ?? 0,
    });
  }

  /** Gera um segredo novo (ainda pendente) para o aplicativo autenticador. */
  async setup(challengeToken: unknown) {
    const account = await this.resolveAccount(challengeToken);
    if (account.mfa_enabled_at)
      throw new ConflictException(
        'A verificação em duas etapas já está ativa.',
      );
    const secret = generateTotpSecret();
    const saved = await this.store.savePendingSecret(
      account.id,
      encryptMfaSecret(secret, this.key()),
    );
    if (!saved)
      throw new ConflictException(
        'A verificação em duas etapas já está ativa.',
      );
    return {
      secret,
      otpauthUrl: otpauthUrl(
        account.email ?? account.username ?? String(account.id),
        secret,
      ),
    };
  }

  async verify(
    challengeToken: unknown,
    input: MfaVerifyInput,
  ): Promise<MfaVerifyResult> {
    const { code, recoveryCode } = input;
    if (!code === !recoveryCode)
      throw new BadRequestException(
        'Informe o código do aplicativo ou um código de recuperação.',
      );
    const account = await this.resolveAccount(challengeToken);
    const subject = loginSubject('', account.id);
    await this.attempts.assertNotLocked(subject);

    const outcome: { ok: boolean; recoveryCodes?: string[] } =
      account.mfa_enabled_at
        ? await this.checkActive(account, code, recoveryCode)
        : await this.checkEnrollment(account, code, recoveryCode);
    if (!outcome.ok) {
      await this.attempts.registerFailure(subject);
      throw new UnauthorizedException({ ...CODE_INVALID });
    }
    await this.attempts.reset(subject);
    return { user: account, recoveryCodes: outcome.recoveryCodes };
  }

  private key(): string {
    const key = mfaEncryptionKey();
    if (!key) throw new UnauthorizedException({ ...MFA_CHALLENGE_INVALID });
    return key;
  }

  /** Desafio válido, MFA ligado e conta ainda ativa com a mesma versão de sessão. */
  private async resolveAccount(token: unknown): Promise<Usuario> {
    const challenge = readChallenge(this.jwt, token);
    const account = await this.store.load(challenge.sub);
    if (
      !mfaEncryptionKey() ||
      !account ||
      !this.appliesTo(account) ||
      !activeAccountSession(account, challenge.sessionVersion)
    )
      throw new UnauthorizedException({ ...MFA_CHALLENGE_INVALID });
    return account;
  }

  private totpStepFor(account: Usuario, code: string): number | null {
    if (!account.mfa_secret_encrypted) return null;
    try {
      const secret = decryptMfaSecret(account.mfa_secret_encrypted, this.key());
      return verifyTotp(secret, code);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`Segredo MFA ilegível para a conta ${account.id}`);
      return null;
    }
  }

  /** Primeira ativação: exige segredo pendente e código TOTP; devolve os códigos de recuperação. */
  private async checkEnrollment(
    account: Usuario,
    code: string | undefined,
    recoveryCode: string | undefined,
  ): Promise<{ ok: boolean; recoveryCodes?: string[] }> {
    if (recoveryCode || !code)
      throw new BadRequestException(
        'Conclua o cadastro com o código do aplicativo.',
      );
    if (!account.mfa_secret_encrypted)
      throw new ConflictException(
        'Gere o segredo antes de confirmar o código.',
      );
    const step = this.totpStepFor(account, code);
    if (step === null || !(await this.acceptStep(account.id, step)))
      return { ok: false };
    const recoveryCodes = generateRecoveryCodes();
    const activated = await this.store.activate(
      account.id,
      recoveryCodes.map((item) => hashRecoveryCode(item, this.key())),
    );
    if (!activated)
      throw new ConflictException(
        'A verificação em duas etapas já está ativa.',
      );
    return { ok: true, recoveryCodes };
  }

  /** MFA ativo: TOTP não reutilizado ou código de recuperação (uso único). */
  private async checkActive(
    account: Usuario,
    code: string | undefined,
    recoveryCode: string | undefined,
  ): Promise<{ ok: boolean }> {
    if (recoveryCode)
      return {
        ok: await this.store.consumeRecoveryCode(
          account.id,
          hashRecoveryCode(recoveryCode, this.key()),
        ),
      };
    const step = this.totpStepFor(account, code ?? '');
    return { ok: step !== null && (await this.acceptStep(account.id, step)) };
  }

  /** Antirreplay: recusa passo menor ou igual ao último aceito. Sem Redis, segue com aviso. */
  private async acceptStep(userId: number, step: number): Promise<boolean> {
    try {
      const result = await this.redis.eval(
        ACCEPT_STEP_SCRIPT,
        [`mfa-last-step:${userId}`],
        [step, REPLAY_TTL_SECONDS],
      );
      return Number(result) === 1;
    } catch {
      this.logger.warn('Redis indisponível; MFA seguindo sem antirreplay');
      return true;
    }
  }
}
