import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../src/redis/redis.service';

function fixturePort(name: string) {
  if (process.env.RUN_ARCADE_INTEGRATION !== '1')
    throw new Error('Fixture C456 exige opt-in explícito');
  const port = Number(process.env[name]);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Informe as portas dos containers descartáveis C456');
  return port;
}

export async function openArcadeRedis() {
  const port = fixturePort('ARCADE_REDIS_PORT');
  const redis = new RedisService(
    new ConfigService({ REDIS_URL: `redis://127.0.0.1:${port}` }),
  );
  redis.onModuleInit();
  await redis.get('fixture-ready');
  return redis;
}
