'use strict';

const { randomUUID } = require('node:crypto');

const testEnvironment = {
  NODE_ENV: 'test',
  DB_HOST: '127.0.0.1',
  DB_PORT: '13306',
  DB_USER: 'secureplay_test_user',
  DB_PASSWORD: 'secureplay_test_password',
  DB_NAME: 'secureplay_test',
  DB_SSL: 'false',
  DB_SYNCHRONIZE: 'false',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '16379',
  REDIS_TLS: 'false',
};

function prepareTestEnvironment() {
  for (const [name, expected] of Object.entries(testEnvironment)) {
    const current = process.env[name];
    if (current && current !== expected) {
      throw new Error(
        `Variável ${name} aponta para outro ambiente; teste cancelado.`,
      );
    }
  }

  for (const name of [
    'DB_CA_CERT_BASE64',
    'DATABASE_URL',
    'REDIS_PASSWORD',
    'REDIS_URL',
    'REDIS_USERNAME',
  ]) {
    if (process.env[name]) {
      throw new Error(`Variável ${name} herdada detectada; teste cancelado.`);
    }
  }

  Object.assign(process.env, testEnvironment);
}

async function main() {
  prepareTestEnvironment();

  const {
    createDatabaseDataSource,
  } = require('../src/database/database.providers');
  const { RedisService } = require('../src/redis/redis.service');
  const dataSource = createDatabaseDataSource();
  const redisConfig = { get: (name) => process.env[name] };
  const redisService = new RedisService(redisConfig);
  const redisKey = `secureplay:test:connectivity:${randomUUID()}`;
  const redisValue = randomUUID();
  let redisKeyWritten = false;

  try {
    if (
      dataSource.options.synchronize !== false ||
      dataSource.options.migrationsRun !== false
    ) {
      throw new Error(
        'DataSource deve manter synchronize e migrationsRun desligados.',
      );
    }

    await dataSource.initialize();
    const [mysql] = await dataSource.query(
      'SELECT DATABASE() AS databaseName, VERSION() AS version',
    );
    if (mysql.databaseName !== testEnvironment.DB_NAME) {
      throw new Error('DataSource conectou a um database inesperado.');
    }

    const [migrationState] = await dataSource.query(
      'SELECT COUNT(*) AS count FROM migrations',
    );
    if (Number(migrationState.count) === 0) {
      throw new Error(
        'Schema de teste sem histórico de migrations; execute migration:run primeiro.',
      );
    }

    redisService.onModuleInit();
    await redisService.set(redisKey, redisValue, 60);
    redisKeyWritten = true;
    if ((await redisService.get(redisKey)) !== redisValue) {
      throw new Error(
        'Redis não devolveu o valor temporário gravado pelo teste.',
      );
    }

    await redisService.del(redisKey);
    redisKeyWritten = false;
    console.log(
      `OK: MySQL ${mysql.version} (${mysql.databaseName}); ${migrationState.count} migrations; Redis SET/GET/DEL; nenhum AppModule carregado.`,
    );
  } finally {
    if (redisKeyWritten) {
      try {
        await redisService.del(redisKey);
      } catch {
        // A chave possui TTL de 60 segundos como proteção de limpeza secundária.
      }
    }
    try {
      await redisService.onModuleDestroy();
    } catch {
      // Preserva o erro original da verificação.
    }
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(`Falha no smoke de serviços Docker: ${error.message}`);
  process.exitCode = 1;
});
