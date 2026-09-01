import { DataSource } from 'typeorm';

function envFlag(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {
      const isProduction = process.env.NODE_ENV === 'production';
      const useSsl = envFlag('DB_SSL', isProduction);
      const encodedCa = process.env.DB_CA_CERT_BASE64?.trim();
      const ca = encodedCa
        ? Buffer.from(encodedCa, 'base64').toString('utf8')
        : undefined;

      const dataSource = new DataSource({
        type: 'mysql',
        timezone: '-03:00',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: envFlag('DB_SYNCHRONIZE', !isProduction),
        ssl: useSsl
          ? {
              rejectUnauthorized: envFlag('DB_SSL_REJECT_UNAUTHORIZED', true),
              ...(ca ? { ca } : {}),
            }
          : undefined,
        poolSize: 10,
        extra: {
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000,
        },
      });

      return dataSource.initialize();
    },
  },
];
