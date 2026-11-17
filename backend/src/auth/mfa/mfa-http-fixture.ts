import { Controller, Get, UseGuards, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthGuard, PassportModule } from '@nestjs/passport';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import cookie from '@fastify/cookie';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../../redis/redis.service';
import { RegistrationService } from '../../registration/registration.service';
import { Usuario } from '../../usuario/usuario.entity';
import { UsuarioService } from '../../usuario/usuario.service';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { JwtStrategy } from '../jwt.strategy';
import { LoginAttemptsService } from '../login-attempts.service';
import { Role } from '../roles.enum';
import { MFA_CHALLENGE_COOKIE } from './mfa-challenge';
import { MfaController } from './mfa.controller';
import { MfaService } from './mfa.service';
import { MfaStore } from './mfa.store';
import {
  FakeAttempts,
  FakeMfaStore,
  FakeRedis,
  contaDeTeste,
} from './mfa-test-support';
import { base32Decode, totpCode } from './totp';

@Controller('sonda')
class SondaController {
  @Get('protegida')
  @UseGuards(AuthGuard('jwt'))
  protegida() {
    return { ok: true };
  }
}

export const SENHA = 'senha-forte-de-teste';
const JWT_SECRET = 'segredo-jwt-de-teste-com-mais-de-32-caracteres';

type Resposta = { cookies: { name: string; value: string }[] };

async function montarApp(
  contas: Map<number, Usuario>,
  redis: FakeRedis,
  attempts: FakeAttempts,
) {
  const usuarioService = {
    getUsuarioByLoginIdentifier: (identifier: string) =>
      Promise.resolve(
        [...contas.values()].find((conta) => conta.email === identifier),
      ),
    getUsuarioById: (id: number) => Promise.resolve(contas.get(id)),
    getUsuarioDados: (id: number) =>
      Promise.resolve({ userId: id, role: contas.get(id)?.role }),
  };

  const module = await Test.createTestingModule({
    imports: [
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({
        global: true,
        secret: JWT_SECRET,
        signOptions: { expiresIn: '2h' },
      }),
    ],
    controllers: [AuthController, MfaController, SondaController],
    providers: [
      AuthService,
      MfaService,
      JwtStrategy,
      { provide: MfaStore, useValue: new FakeMfaStore(contas) },
      { provide: RedisService, useValue: redis },
      { provide: LoginAttemptsService, useValue: attempts },
      { provide: UsuarioService, useValue: usuarioService },
      { provide: RegistrationService, useValue: {} },
      { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      {
        provide: ConfigService,
        useValue: { get: (key: string) => process.env[key] },
      },
    ],
  }).compile();
  const app = module.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    { logger: false },
  );
  await app.register(cookie as never);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

/**
 * Monta o Nest com Fastify e os controllers reais de login e MFA, tendo conta, Redis e
 * bloqueio em memória. Sem MySQL nem Redis reais.
 */
export async function criarCenarioMfa() {
  const ambiente = { ...process.env };
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.MFA_ENCRYPTION_KEY = 'chave-mfa-de-teste';
  process.env.AUTH_USER_CACHE_TTL_MS = '0';
  let deslocamentoMs = 0;
  const relogio = jest
    .spyOn(Date, 'now')
    .mockImplementation(() => new Date().getTime() + deslocamentoMs);

  const senha = await bcrypt.hash(SENHA, 4);
  const contas = new Map<number, Usuario>([
    [7, contaDeTeste({ password: senha })],
    [
      8,
      contaDeTeste({
        id: 8,
        email: 'aluno@example.test',
        role: Role.USER,
        password: senha,
      }),
    ],
  ]);
  const redis = new FakeRedis();
  const attempts = new FakeAttempts();
  const app = await montarApp(contas, redis, attempts);

  const entrar = (email = 'gestao@example.test') =>
    app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: SENHA },
    });
  const cookieDe = (res: Resposta, nome: string) =>
    res.cookies.find((item) => item.name === nome);
  const desafioDe = async () => {
    const desafio = cookieDe(await entrar(), MFA_CHALLENGE_COOKIE);
    if (!desafio) throw new Error('login não devolveu o desafio');
    return desafio.value;
  };
  const post = (url: string, desafio: string | undefined, payload?: object) =>
    app.inject({
      method: 'POST',
      url,
      payload: payload as never,
      headers: desafio ? { cookie: `${MFA_CHALLENGE_COOKIE}=${desafio}` } : {},
    });
  const codigoAtual = (secret: string) =>
    totpCode(base32Decode(secret), Date.now());

  /** Cadastra o app autenticador; devolve o segredo e os códigos de recuperação. */
  const cadastrar = async () => {
    const desafio = await desafioDe();
    const setup = await post('/auth/mfa/setup', desafio);
    const { secret } = setup.json<{ secret: string }>();
    const res = await post('/auth/mfa/verify', desafio, {
      code: codigoAtual(secret),
    });
    expect(res.statusCode).toBe(200);
    const { recoveryCodes } = res.json<{ recoveryCodes: string[] }>();
    return { secret, recoveryCodes };
  };

  return {
    app,
    contas,
    redis,
    attempts,
    jwt: app.get(JwtService),
    entrar,
    cookieDe,
    desafioDe,
    post,
    codigoAtual,
    cadastrar,
    avancar: (segundos: number) => {
      deslocamentoMs += segundos * 1000;
    },
    encerrar: async () => {
      relogio.mockRestore();
      await app.close();
      process.env = ambiente;
    },
  };
}

export type CenarioMfa = Awaited<ReturnType<typeof criarCenarioMfa>>;
