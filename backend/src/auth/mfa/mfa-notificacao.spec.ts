import { JwtService } from '@nestjs/jwt';
import { encryptMfaSecret } from './mfa-crypto';
import {
  FakeAttempts,
  FakeMfaStore,
  FakeRedis,
  contaDeTeste,
} from './mfa-test-support';
import { MfaService } from './mfa.service';
import { base32Decode, generateTotpSecret, totpCode } from './totp';
import { NOTIFICATION_EVENTS } from '../../notification/notification-events';

const CHAVE = 'chave-mfa-de-teste-com-mais-de-32-caracteres';

function montar(ativa: boolean) {
  process.env.JWT_SECRET = 'segredo-jwt-de-teste-com-mais-de-32-caracteres';
  process.env.MFA_ENCRYPTION_KEY = CHAVE;
  const secret = generateTotpSecret();
  const conta = contaDeTeste({
    mfa_secret_encrypted: encryptMfaSecret(secret, CHAVE),
    mfa_enabled_at: ativa ? new Date() : null,
    mfa_recovery_codes: [],
  });
  const emit = jest.fn();
  const jwt = new JwtService({ secret: 'x'.repeat(40) });
  const service = new MfaService(
    new FakeMfaStore(new Map([[conta.id, conta]])) as never,
    jwt,
    new FakeRedis() as never,
    new FakeAttempts() as never,
    { emit } as never,
  );
  const desafio = service.issueChallenge(conta).token;
  const codigo = () => totpCode(base32Decode(secret), Date.now());
  return { service, emit, desafio, codigo };
}

describe('MFA: notificação de segurança', () => {
  const ambiente = { ...process.env };
  afterEach(() => {
    process.env = { ...ambiente };
  });

  it('emite mfaAlterado (ativado) ao concluir o cadastro', async () => {
    const { service, emit, desafio, codigo } = montar(false);

    await service.verify(desafio, { code: codigo() });

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.mfaAlterado, {
      usuarioId: 7,
      ativado: true,
    });
  });

  it('não emite quando o código do cadastro é inválido', async () => {
    const { service, emit, desafio } = montar(false);

    await expect(service.verify(desafio, { code: '000000' })).rejects.toThrow();

    expect(emit).not.toHaveBeenCalled();
  });

  it('não emite em login comum com MFA já ativo', async () => {
    const { service, emit, desafio, codigo } = montar(true);

    await service.verify(desafio, { code: codigo() });

    expect(emit).not.toHaveBeenCalled();
  });
});
